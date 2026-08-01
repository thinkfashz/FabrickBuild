'use client'

import { useEffect, useMemo, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import type { FrameSequence } from '@/lib/appearance'

type Props = {
  sequence: FrameSequence
  forceScroll?: boolean
}

type FrameRecord = {
  image: HTMLImageElement | null
  state: 'idle' | 'queued' | 'loading' | 'loaded' | 'error'
  attempts: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function drawCover(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  fit: FrameSequence['fit'],
  mobile: boolean,
) {
  const bounds = canvas.getBoundingClientRect()
  const maxDpr = mobile ? 1.25 : 1.65
  const pixelRatio = Math.min(window.devicePixelRatio || 1, maxDpr)
  const width = Math.max(1, Math.round(bounds.width * pixelRatio))
  const height = Math.max(1, Math.round(bounds.height * pixelRatio))

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const context = canvas.getContext('2d', { alpha: false, desynchronized: true })
  if (!context || !image.naturalWidth || !image.naturalHeight) return

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.clearRect(0, 0, width, height)

  const sourceRatio = image.naturalWidth / image.naturalHeight
  const targetRatio = width / height
  const scale = fit === 'contain'
    ? (sourceRatio > targetRatio ? width / image.naturalWidth : height / image.naturalHeight)
    : (sourceRatio > targetRatio ? height / image.naturalHeight : width / image.naturalWidth)
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale

  context.drawImage(
    image,
    Math.round((width - drawWidth) / 2),
    Math.round((height - drawHeight) / 2),
    Math.ceil(drawWidth),
    Math.ceil(drawHeight),
  )
}

/**
 * Reproductor cinematográfico ligero.
 *
 * Prioriza el primer frame y una ventana cercana al scroll, carga el resto en
 * segundo plano con concurrencia limitada y dibuja únicamente cuando cambia el
 * índice real. El canvas 2D evita recrear texturas WebGL en cada movimiento.
 */
export function FrameSequenceBackground({ sequence, forceScroll = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameLabelRef = useRef<HTMLSpanElement>(null)
  const loadLabelRef = useRef<HTMLSpanElement>(null)
  const initialFrameCount = useMemo(
    () => Math.max(sequence.desktopFrames.length, sequence.mobileFrames.length),
    [sequence.desktopFrames.length, sequence.mobileFrames.length],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const section = container.closest<HTMLElement>('section')
    const mobileQuery = window.matchMedia('(max-width: 767px)')
    let mobile = mobileQuery.matches
    let stopped = false
    let hidden = document.hidden
    let progress = 0
    let wantedFrame = 0
    let renderedFrame = -1
    let loadedCount = 0
    let activeLoads = 0
    let backgroundCursor = 0
    let drawRAF = 0
    let backgroundTimer = 0
    let autoplayTimer = 0
    let trigger: ScrollTrigger | null = null
    let resizeObserver: ResizeObserver | null = null
    let urls: string[] = []
    let records: FrameRecord[] = []
    const queue: number[] = []
    const queued = new Set<number>()
    const concurrency = () => (mobile ? 3 : 5)
    const readyThreshold = () => Math.min(urls.length, mobile ? 6 : 9)

    const chooseFrames = () => {
      const candidates = mobile && sequence.mobileFrames.length
        ? sequence.mobileFrames
        : sequence.desktopFrames.length
          ? sequence.desktopFrames
          : sequence.mobileFrames
      return Array.from(new Set(candidates.filter(Boolean)))
    }

    const setMood = (nextProgress: number) => {
      if (!section) return
      const pulse = Math.sin(nextProgress * Math.PI * 1.8) * 0.06
      const brightness = clamp(0.76 + nextProgress * 0.16 + pulse, 0.66, 1.02)
      const veil = clamp((sequence.overlayOpacity / 100) * (0.86 - nextProgress * 0.18), 0.03, 0.58)
      section.style.setProperty('--cinematic-progress', nextProgress.toFixed(4))
      section.style.setProperty('--cinematic-light', brightness.toFixed(3))
      section.style.setProperty('--cinematic-veil', veil.toFixed(3))
      section.style.setProperty('--cinematic-glow-x', `${Math.round(16 + nextProgress * 68)}%`)
    }

    const updateLabels = (index = wantedFrame) => {
      const current = urls.length ? clamp(index + 1, 1, urls.length) : 0
      if (frameLabelRef.current) {
        frameLabelRef.current.textContent = `${String(current).padStart(2, '0')} / ${String(urls.length).padStart(2, '0')}`
      }
      if (loadLabelRef.current) {
        loadLabelRef.current.textContent = loadedCount >= readyThreshold()
          ? `${loadedCount}/${urls.length} preparados`
          : `Preparando ${loadedCount}/${urls.length}`
      }
      container.dataset.sequenceReady = loadedCount >= readyThreshold() ? 'true' : 'false'
    }

    const nearestLoadedFrame = (target: number) => {
      for (let radius = 0; radius < urls.length; radius += 1) {
        const previous = target - radius
        const next = target + radius
        if (previous >= 0 && records[previous]?.state === 'loaded') return previous
        if (next < urls.length && records[next]?.state === 'loaded') return next
      }
      return -1
    }

    const renderNow = (force = false) => {
      drawRAF = 0
      if (stopped || hidden || !urls.length) return
      const exact = records[wantedFrame]
      const index = exact?.state === 'loaded' ? wantedFrame : nearestLoadedFrame(wantedFrame)
      if (index < 0 || (!force && index === renderedFrame)) return
      const image = records[index]?.image
      if (!image) return
      renderedFrame = index
      drawCover(canvas, image, sequence.fit, mobile)
      updateLabels(wantedFrame)
    }

    const scheduleDraw = (force = false) => {
      if (drawRAF) return
      drawRAF = window.requestAnimationFrame(() => renderNow(force))
    }

    const pumpQueue = () => {
      if (stopped || hidden) return
      while (activeLoads < concurrency() && queue.length) {
        const index = queue.shift()
        if (typeof index !== 'number') break
        queued.delete(index)
        const record = records[index]
        if (!record || record.state === 'loaded' || record.state === 'loading' || record.state === 'error') continue

        record.state = 'loading'
        record.attempts += 1
        activeLoads += 1
        const image = new window.Image()
        image.decoding = 'async'
        image.loading = 'eager'
        image.fetchPriority = index <= readyThreshold() || index === wantedFrame ? 'high' : 'low'

        const finish = () => {
          activeLoads = Math.max(0, activeLoads - 1)
          pumpQueue()
        }

        image.addEventListener('load', () => {
          const complete = () => {
            if (stopped) return
            record.image = image
            record.state = 'loaded'
            loadedCount += 1
            updateLabels()
            if (index === wantedFrame || renderedFrame < 0) scheduleDraw(true)
            finish()
          }
          image.decode().then(complete).catch(complete)
        }, { once: true })

        image.addEventListener('error', () => {
          activeLoads = Math.max(0, activeLoads - 1)
          record.image = null
          if (record.attempts < 2 && !stopped) {
            record.state = 'idle'
            window.setTimeout(() => enqueue(index, true), 240 * record.attempts)
          } else {
            record.state = 'error'
          }
          updateLabels()
          pumpQueue()
        }, { once: true })

        record.image = image
        image.src = urls[index]
      }
    }

    function enqueue(index: number, priority = false) {
      if (index < 0 || index >= records.length) return
      const record = records[index]
      if (!record || record.state === 'loaded' || record.state === 'loading' || record.state === 'error' || queued.has(index)) return
      record.state = 'queued'
      queued.add(index)
      if (priority) queue.unshift(index)
      else queue.push(index)
      pumpQueue()
    }

    const warmFrames = (center: number) => {
      const ahead = mobile ? 7 : 11
      const behind = mobile ? 3 : 5
      enqueue(center, true)
      for (let radius = 1; radius <= Math.max(ahead, behind); radius += 1) {
        if (radius <= ahead) enqueue(center + radius, radius <= 3)
        if (radius <= behind) enqueue(center - radius, radius <= 2)
      }
    }

    const preloadBackground = () => {
      window.clearTimeout(backgroundTimer)
      const tick = () => {
        if (stopped) return
        if (!hidden && backgroundCursor < records.length) {
          let added = 0
          while (backgroundCursor < records.length && added < (mobile ? 1 : 2)) {
            enqueue(backgroundCursor)
            backgroundCursor += 1
            added += 1
          }
        }
        if (backgroundCursor < records.length) backgroundTimer = window.setTimeout(tick, mobile ? 170 : 110)
      }
      backgroundTimer = window.setTimeout(tick, 320)
    }

    const setWantedFrame = (index: number) => {
      const next = clamp(index, 0, Math.max(0, urls.length - 1))
      if (next === wantedFrame && renderedFrame >= 0) return
      wantedFrame = next
      warmFrames(next)
      scheduleDraw()
      updateLabels(next)
    }

    const syncProgress = (nextProgress: number) => {
      progress = clamp(nextProgress, 0, 1)
      setMood(progress)
      setWantedFrame(Math.round(progress * Math.max(0, urls.length - 1)))
    }

    const resetFrames = () => {
      urls = chooseFrames()
      records = urls.map(() => ({ image: null, state: 'idle', attempts: 0 }))
      queue.length = 0
      queued.clear()
      loadedCount = 0
      activeLoads = 0
      backgroundCursor = 0
      renderedFrame = -1
      wantedFrame = Math.round(progress * Math.max(0, urls.length - 1))
      updateLabels(wantedFrame)
      enqueue(0, true)
      warmFrames(wantedFrame)
      preloadBackground()
    }

    const resize = () => {
      mobile = mobileQuery.matches
      const previousURLs = urls
      const nextURLs = chooseFrames()
      const sourceChanged = nextURLs.length !== previousURLs.length || nextURLs.some((url, index) => url !== previousURLs[index])
      if (sourceChanged) resetFrames()
      renderedFrame = -1
      scheduleDraw(true)
      trigger?.refresh()
    }

    const onVisibility = () => {
      hidden = document.hidden
      if (!hidden) {
        warmFrames(wantedFrame)
        pumpQueue()
        scheduleDraw(true)
      }
    }

    resetFrames()
    setMood(0)

    const scrollDriven = forceScroll || sequence.trigger === 'scroll'
    if (scrollDriven && section) {
      gsap.registerPlugin(ScrollTrigger)
      trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: forceScroll ? 0.12 : clamp(sequence.scrub, 0.08, 0.24),
        invalidateOnRefresh: true,
        onUpdate: (self) => syncProgress(self.progress),
      })
      syncProgress(trigger.progress)
    } else {
      let current = 0
      autoplayTimer = window.setInterval(() => {
        if (!urls.length || hidden) return
        current = sequence.trigger === 'loop' ? (current + 1) % urls.length : Math.min(current + 1, urls.length - 1)
        setWantedFrame(current)
        if (sequence.trigger === 'autoplay' && current === urls.length - 1) window.clearInterval(autoplayTimer)
      }, 1000 / 24)
    }

    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    mobileQuery.addEventListener('change', resize)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stopped = true
      window.clearTimeout(backgroundTimer)
      window.clearInterval(autoplayTimer)
      if (drawRAF) window.cancelAnimationFrame(drawRAF)
      trigger?.kill()
      resizeObserver?.disconnect()
      mobileQuery.removeEventListener('change', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      records.forEach((record) => { record.image = null })
    }
  }, [forceScroll, sequence])

  const initialLabel = initialFrameCount
    ? `01 / ${String(initialFrameCount).padStart(2, '0')}`
    : '00 / 00'

  return (
    <div
      ref={containerRef}
      className={`hero-background hero-frame-sequence ${forceScroll || sequence.pin ? 'hero-frame-sequence--pinned' : ''}`}
      aria-hidden="true"
      data-sequence-ready="false"
      style={sequence.poster ? { backgroundImage: `url("${sequence.poster}")` } : undefined}
    >
      <canvas ref={canvasRef} />
      <div className="hero-frame-sequence__light" />
      <div className="hero-frame-sequence__loading"><i /><span ref={loadLabelRef}>Preparando 0/{initialFrameCount}</span></div>
      <div className="hero-frame-sequence__counter"><span ref={frameLabelRef}>{initialLabel}</span><i>SCROLL / MOTION</i></div>
    </div>
  )
}
