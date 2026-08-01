'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import styles from './CinematicScrollExperience.module.css'

type MediaLike =
  | string
  | number
  | null
  | undefined
  | {
      url?: string | null
      alt?: string | null
      sizes?: Record<string, { url?: string | null } | null> | null
    }

type CinematicBackground = {
  id?: string | number
  name?: string | null
  kind?: 'frames' | 'image' | 'url' | string | null
  device?: 'desktop' | 'mobile' | 'responsive' | string | null
  desktopFrames?: MediaLike[] | null
  mobileFrames?: MediaLike[] | null
  poster?: MediaLike
  image?: MediaLike
  externalURL?: string | null
  engine?: string | null
  playback?: {
    trigger?: 'scroll' | 'autoplay' | 'loop' | string | null
    scrub?: number | null
    pin?: boolean | null
    snap?: boolean | null
    scrollLength?: number | null
    parallax?: number | null
    fit?: 'cover' | 'contain' | string | null
    overlayOpacity?: number | null
  } | null
}

type PerformanceSettings = {
  initialFramePreload?: number | null
  frameBatchSize?: number | null
  respectReducedMotion?: boolean | null
  respectSaveData?: boolean | null
}

type Props = {
  background?: CinematicBackground | null
  backgroundVideo?: MediaLike
  performance?: PerformanceSettings | null
}

type FrameStore = {
  urls: string[]
  images: Array<HTMLImageElement | undefined>
  loaded: Set<number>
  pending: Set<number>
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
  cancelIdleCallback?: (id: number) => void
}

type NetworkNavigator = Navigator & {
  connection?: {
    saveData?: boolean
    effectiveType?: string
  }
}

const MAX_FRAMES = 60
const HEADER_DESKTOP = 76
const HEADER_MOBILE = 64

const story = [
  {
    eyebrow: 'Arquitectura con propósito',
    title: 'El proyecto nace desde una visión clara.',
    text: 'Recorre cada etapa de la vivienda mientras el avance de la obra responde exactamente al movimiento de tu scroll.',
  },
  {
    eyebrow: 'Diseño y planificación',
    title: 'Primero diseñamos. Después construimos.',
    text: 'La secuencia muestra el desarrollo de la casa sin saltos automáticos ni videos que avanzan fuera del control del visitante.',
  },
  {
    eyebrow: 'Estructura',
    title: 'Cada elemento aparece en el momento correcto.',
    text: 'Fundaciones, estructura, envolvente y terminaciones se presentan como una experiencia continua y fácil de comprender.',
  },
  {
    eyebrow: 'Eficiencia visual',
    title: 'Sesenta frames, una reproducción fluida.',
    text: 'Los primeros archivos se priorizan y el resto se carga por lotes para evitar bloquear teléfonos o conexiones móviles.',
  },
  {
    eyebrow: 'Adaptación responsive',
    title: 'La composición cambia según el dispositivo.',
    text: 'En móvil se utiliza la secuencia vertical configurada en Payload; en escritorio se utiliza la panorámica disponible.',
  },
  {
    eyebrow: 'Control cinematográfico',
    title: 'ScrollTrigger sincroniza cada escena.',
    text: 'El avance, los textos, la barra de progreso y el parallax comparten una sola línea de tiempo vinculada al scroll.',
  },
  {
    eyebrow: 'Terminaciones',
    title: 'El resultado final conserva todo el detalle.',
    text: 'La resolución del canvas se adapta al dispositivo y respeta la proporción definida en el administrador.',
  },
  {
    eyebrow: 'FabrickBuild',
    title: 'Construcción que puedes recorrer antes de cotizar.',
    text: 'La experiencia termina conectando directamente con los servicios, proyectos y formulario de evaluación profesional.',
  },
]

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function mediaURL(value: MediaLike, preferredSize?: string): string | null {
  if (typeof value === 'string' && /^(https?:\/\/|\/)/i.test(value)) return value
  if (!value || typeof value !== 'object') return null
  if (preferredSize && value.sizes?.[preferredSize]?.url) return value.sizes[preferredSize]?.url || null
  return value.sizes?.hero?.url || value.sizes?.card?.url || value.url || null
}

function orderedFrameURLs(values: MediaLike[] | null | undefined): string[] {
  const unique = new Set<string>()
  for (const value of Array.isArray(values) ? values : []) {
    const url = mediaURL(value, 'hero') || mediaURL(value)
    if (url) unique.add(url)
    if (unique.size >= MAX_FRAMES) break
  }
  return Array.from(unique)
}

function videoURL(background: CinematicBackground | null | undefined, fallback: MediaLike): string | null {
  const uploaded = mediaURL(fallback)
  if (uploaded && /\.(mp4|webm)(\?|$)/i.test(uploaded)) return uploaded
  const external = typeof background?.externalURL === 'string' ? background.externalURL.trim() : ''
  return /\.(mp4|webm)(\?|$)/i.test(external) ? external : null
}

function nearestLoaded(loaded: Set<number>, requested: number): number {
  let match = -1
  let distance = Number.POSITIVE_INFINITY
  for (const index of loaded) {
    const current = Math.abs(index - requested)
    if (current < distance) {
      match = index
      distance = current
    }
  }
  return match
}

function prefersLightweight(performance: PerformanceSettings | null | undefined): boolean {
  if (typeof window === 'undefined') return false
  const network = (navigator as NetworkNavigator).connection
  const saveData = Boolean(network?.saveData || ['slow-2g', '2g'].includes(network?.effectiveType || ''))
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return Boolean(
    (performance?.respectSaveData !== false && saveData) ||
      (performance?.respectReducedMotion !== false && reducedMotion),
  )
}

export function CinematicScrollExperience({ background, backgroundVideo, performance }: Props) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const frameStoreRef = useRef<FrameStore>({ urls: [], images: [], loaded: new Set(), pending: new Set() })
  const requestFrameRef = useRef<(index: number, priority?: boolean) => void>(() => undefined)
  const currentFrameRef = useRef(0)
  const progressRef = useRef(0)
  const [mobile, setMobile] = useState(false)
  const [loadedCount, setLoadedCount] = useState(0)
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState(0)
  const [activeStory, setActiveStory] = useState(0)
  const [lightweight, setLightweight] = useState(false)

  const desktopFrames = useMemo(() => orderedFrameURLs(background?.desktopFrames), [background?.desktopFrames])
  const mobileFrames = useMemo(() => orderedFrameURLs(background?.mobileFrames), [background?.mobileFrames])
  const frames = useMemo(() => {
    const preferred = mobile ? mobileFrames : desktopFrames
    const fallback = mobile ? desktopFrames : mobileFrames
    return preferred.length ? preferred : fallback
  }, [desktopFrames, mobile, mobileFrames])

  const poster = mediaURL(background?.poster, 'hero') || mediaURL(background?.poster) || mediaURL(background?.image, 'hero') || mediaURL(background?.image)
  const scrollVideo = videoURL(background, backgroundVideo)
  const playback = background?.playback || {}
  const fit = playback.fit === 'contain' ? 'contain' : 'cover'
  const overlayOpacity = clamp(Number(playback.overlayOpacity ?? 22), 0, 90)
  const scrollLength = clamp(Number(playback.scrollLength ?? 600), 300, 1200)
  const parallax = clamp(Number(playback.parallax ?? 12), 0, 100)
  const scrub = clamp(Number(playback.scrub ?? 0.35), 0.05, 3)
  const pin = playback.pin !== false
  const snap = playback.snap === true
  const initialPreload = clamp(Number(performance?.initialFramePreload ?? 8), 3, 16)
  const batchSize = clamp(Number(performance?.frameBatchSize ?? 8), 3, 16)
  const hasFrames = frames.length >= 2
  const source = hasFrames ? 'frames' : scrollVideo ? 'video' : poster ? 'poster' : 'none'

  const sectionStyle = {
    '--cinematic-scroll-height': `${pin ? scrollLength : 110}svh`,
    '--cinematic-overlay-opacity': String(overlayOpacity / 100),
    '--cinematic-parallax-y': '0px',
    '--cinematic-poster': poster ? `url("${poster.replace(/["'()]/g, '')}")` : 'none',
  } as CSSProperties

  const drawFrame = useCallback(
    (index: number) => {
      const canvas = canvasRef.current
      const store = frameStoreRef.current
      const image = store.images[index]
      if (!canvas || !image?.complete || !image.naturalWidth) return

      const context = canvas.getContext('2d', { alpha: false })
      if (!context) return
      const rect = canvas.getBoundingClientRect()
      const cap = lightweight ? 1.2 : mobile ? 1.5 : 2
      const ratio = Math.min(window.devicePixelRatio || 1, cap)
      const width = Math.max(1, Math.round(rect.width * ratio))
      const height = Math.max(1, Math.round(rect.height * ratio))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      const scale = fit === 'contain'
        ? Math.min(width / image.naturalWidth, height / image.naturalHeight)
        : Math.max(width / image.naturalWidth, height / image.naturalHeight)
      const drawWidth = image.naturalWidth * scale
      const drawHeight = image.naturalHeight * scale
      const x = (width - drawWidth) / 2
      const parallaxShift = (progressRef.current - 0.5) * (parallax / 100) * height
      const y = (height - drawHeight) / 2 + parallaxShift

      context.fillStyle = '#080909'
      context.fillRect(0, 0, width, height)
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(image, x, y, drawWidth, drawHeight)
      currentFrameRef.current = index
    },
    [fit, lightweight, mobile, parallax],
  )

  useEffect(() => {
    const update = () => {
      setMobile(window.innerWidth < 900 || window.innerHeight > window.innerWidth)
      setLightweight(prefersLightweight(performance))
    }
    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [performance])

  useEffect(() => {
    let cancelled = false
    const idleWindow = window as IdleWindow
    const idleTasks: number[] = []
    const timeoutTasks: number[] = []
    const store: FrameStore = { urls: frames, images: new Array(frames.length), loaded: new Set(), pending: new Set() }
    frameStoreRef.current = store
    currentFrameRef.current = 0
    setLoadedCount(0)
    setReady(source !== 'frames')

    const loadFrame = (index: number, priority = false) => {
      if (cancelled || index < 0 || index >= store.urls.length || store.images[index] || store.pending.has(index)) return
      store.pending.add(index)
      const image = new window.Image()
      image.decoding = 'async'
      image.loading = priority ? 'eager' : 'lazy'
      ;(image as HTMLImageElement & { fetchPriority?: 'high' | 'low' }).fetchPriority = priority ? 'high' : 'low'
      if (/^https?:\/\//i.test(store.urls[index])) image.crossOrigin = 'anonymous'
      store.images[index] = image
      image.onload = () => {
        store.pending.delete(index)
        if (cancelled) return
        store.loaded.add(index)
        setLoadedCount(store.loaded.size)
        if (!ready || index === 0 || index === currentFrameRef.current) {
          setReady(true)
          drawFrame(index)
        }
      }
      image.onerror = () => {
        store.pending.delete(index)
        if (index === 0 && !cancelled) setReady(true)
      }
      image.src = store.urls[index]
    }

    requestFrameRef.current = loadFrame

    if (source === 'frames') {
      const firstBatch = Math.min(frames.length, lightweight ? 3 : initialPreload)
      for (let index = 0; index < firstBatch; index += 1) loadFrame(index, index < 2)

      const schedule = (start: number) => {
        if (cancelled || start >= frames.length) return
        const run = () => {
          if (cancelled) return
          const end = Math.min(frames.length, start + batchSize)
          for (let index = start; index < end; index += 1) loadFrame(index)
          schedule(end)
        }
        if (idleWindow.requestIdleCallback && !lightweight) {
          idleTasks.push(idleWindow.requestIdleCallback(run, { timeout: 1400 }))
        } else {
          timeoutTasks.push(window.setTimeout(run, lightweight ? 360 : 160))
        }
      }
      schedule(firstBatch)
    }

    return () => {
      cancelled = true
      requestFrameRef.current = () => undefined
      idleTasks.forEach((id) => idleWindow.cancelIdleCallback?.(id))
      timeoutTasks.forEach((id) => window.clearTimeout(id))
      store.images.forEach((image) => {
        if (!image) return
        image.onload = null
        image.onerror = null
      })
    }
  }, [batchSize, drawFrame, frames, initialPreload, lightweight, source])

  useEffect(() => {
    let destroyed = false
    let trigger: { kill: () => void } | null = null

    const setup = async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      if (destroyed || !sectionRef.current) return
      gsap.registerPlugin(ScrollTrigger)

      const updateSource = (nextProgress: number) => {
        progressRef.current = nextProgress
        setProgress((current) => (Math.abs(current - nextProgress) > 0.001 ? nextProgress : current))
        const nextStory = Math.min(story.length - 1, Math.floor(nextProgress * story.length))
        setActiveStory((current) => (current === nextStory ? current : nextStory))

        if (source === 'frames' && frames.length) {
          const index = clamp(Math.round(nextProgress * (frames.length - 1)), 0, frames.length - 1)
          const store = frameStoreRef.current
          if (store.loaded.has(index)) drawFrame(index)
          else {
            requestFrameRef.current(index, true)
            const fallback = nearestLoaded(store.loaded, index)
            if (fallback >= 0) drawFrame(fallback)
          }
        }

        if (source === 'video') {
          const video = videoRef.current
          if (video && Number.isFinite(video.duration) && video.duration > 0) {
            video.pause()
            const target = nextProgress * Math.max(0, video.duration - 0.04)
            if (Math.abs(video.currentTime - target) > 0.025) video.currentTime = target
          }
        }

        const shift = (nextProgress - 0.5) * parallax
        stageRef.current?.style.setProperty('--cinematic-parallax-y', `${shift}px`)
      }

      trigger = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: () => `top top+=${window.innerWidth < 760 ? HEADER_MOBILE : HEADER_DESKTOP}`,
        end: 'bottom bottom',
        scrub,
        invalidateOnRefresh: true,
        fastScrollEnd: true,
        preventOverlaps: true,
        snap: snap && frames.length > 1 ? { snapTo: 1 / (frames.length - 1), duration: { min: 0.08, max: 0.28 } } : undefined,
        onUpdate: (self) => updateSource(self.progress),
        onRefresh: (self) => updateSource(self.progress),
      })

      updateSource(0)
      window.setTimeout(() => ScrollTrigger.refresh(), 80)
    }

    setup().catch((error) => console.error('[cinematic-scroll] No fue posible iniciar ScrollTrigger.', error))
    return () => {
      destroyed = true
      trigger?.kill()
    }
  }, [drawFrame, frames.length, parallax, scrub, snap, source])

  useEffect(() => {
    const redraw = () => {
      if (source === 'frames') drawFrame(currentFrameRef.current)
    }
    window.addEventListener('resize', redraw, { passive: true })
    return () => window.removeEventListener('resize', redraw)
  }, [drawFrame, source])

  return (
    <section
      ref={sectionRef}
      className={styles.sequence}
      style={sectionStyle}
      data-source={source}
      data-pin={pin ? 'true' : 'false'}
      aria-label="Recorrido cinematográfico FabrickBuild controlado por scroll"
    >
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.mediaLayer} aria-hidden="true">
          {source === 'frames' && <canvas ref={canvasRef} className={styles.canvas} />}
          {source === 'video' && scrollVideo && (
            <video
              ref={videoRef}
              className={styles.video}
              muted
              playsInline
              preload="auto"
              poster={poster || undefined}
              onLoadedMetadata={(event) => {
                event.currentTarget.pause()
                event.currentTarget.currentTime = 0
                setReady(true)
              }}
            >
              <source src={scrollVideo} />
            </video>
          )}
          {source === 'poster' && <div className={styles.poster} />}
        </div>
        <div className={styles.shade} />

        {!ready && (
          <div className={styles.loader} role="status" aria-live="polite">
            <span /> Cargando secuencia {Math.min(frames.length, MAX_FRAMES) ? `${loadedCount}/${Math.min(frames.length, MAX_FRAMES)}` : ''}
          </div>
        )}

        <div className={styles.topline}>
          <span>{background?.name || 'FabrickBuild · Construcción cinematográfica'}</span>
          <span>
            {source === 'frames' ? `${frames.length} frames · ScrollTrigger` : source === 'video' ? 'Video sincronizado al scroll' : 'Portada multimedia'}
          </span>
        </div>

        <div className={styles.storyViewport}>
          {story.map((item, index) => (
            <article
              key={item.title}
              className={`${styles.storyCard} ${index % 2 === 0 ? styles.left : styles.right} ${index === activeStory ? styles.active : ''}`}
              aria-hidden={index !== activeStory}
            >
              <span className={styles.storyNumber}>{String(index + 1).padStart(2, '0')}</span>
              <p>{item.eyebrow}</p>
              <h1>{item.title}</h1>
              <div>{item.text}</div>
              {index === story.length - 1 && <a href="#contacto">Solicitar evaluación</a>}
            </article>
          ))}
        </div>

        <div className={styles.progress} aria-hidden="true">
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
        <div className={styles.hint} aria-hidden="true"><i /> Desliza para construir</div>
      </div>
    </section>
  )
}
