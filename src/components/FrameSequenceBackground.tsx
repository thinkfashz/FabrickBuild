'use client'

import { useEffect, useMemo, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'

import type { FrameSequence } from '@/lib/appearance'

type Props = {
  sequence: FrameSequence
  forceScroll?: boolean
}

function drawImage(canvas: HTMLCanvasElement, image: HTMLImageElement, fit: FrameSequence['fit']) {
  const bounds = canvas.getBoundingClientRect()
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.max(1, Math.round(bounds.width * pixelRatio))
  const height = Math.max(1, Math.round(bounds.height * pixelRatio))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const context = canvas.getContext('2d')
  if (!context || !image.naturalWidth || !image.naturalHeight) return
  context.clearRect(0, 0, width, height)
  const sourceRatio = image.naturalWidth / image.naturalHeight
  const targetRatio = width / height
  const scale = fit === 'contain'
    ? (sourceRatio > targetRatio ? width / image.naturalWidth : height / image.naturalHeight)
    : (sourceRatio > targetRatio ? height / image.naturalHeight : width / image.naturalWidth)
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
}

function fitPlane(mesh: THREE.Mesh, canvas: HTMLCanvasElement, image: HTMLImageElement, fit: FrameSequence['fit']) {
  const canvasRatio = Math.max(1, canvas.clientWidth) / Math.max(1, canvas.clientHeight)
  const imageRatio = image.naturalWidth / image.naturalHeight
  const wider = imageRatio > canvasRatio
  const cover = fit === 'cover'
  const scale = cover
    ? (wider ? [imageRatio / canvasRatio, 1] : [1, canvasRatio / imageRatio])
    : (wider ? [1, canvasRatio / imageRatio] : [imageRatio / canvasRatio, 1])
  mesh.scale.set(scale[0], scale[1], 1)
}

/**
 * Reproduce todos los frames relacionados al Background de Payload o recuperados
 * desde Blob. Precarga únicamente una ventana cercana al scroll y mantiene un
 * fallback Canvas 2D cuando WebGL no está disponible.
 */
export function FrameSequenceBackground({ sequence, forceScroll = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null)
  const frameLabelRef = useRef<HTMLSpanElement>(null)
  const initialFrameCount = useMemo(
    () => Math.max(sequence.desktopFrames.length, sequence.mobileFrames.length),
    [sequence.desktopFrames.length, sequence.mobileFrames.length],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const fallbackCanvas = fallbackCanvasRef.current
    const container = containerRef.current
    if (!canvas || !fallbackCanvas || !container) return

    const section = container.closest<HTMLElement>('section')
    let stopped = false
    let interval: number | undefined
    let wantedFrame = 0
    let renderedFrame = -1
    let progress = 0
    let images: Array<HTMLImageElement | undefined> = []
    let urls: string[] = []
    let loading = new Set<number>()
    let failed = new Set<number>()
    let retries = new Map<number, number>()
    let cursor = 0
    let texture: THREE.Texture | null = null
    let renderer: THREE.WebGLRenderer | null = null
    let mesh: THREE.Mesh | null = null
    let scene: THREE.Scene | null = null
    let camera: THREE.OrthographicCamera | null = null
    let useWebGL = false
    let trigger: ScrollTrigger | null = null

    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      scene = new THREE.Scene()
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ transparent: true }))
      scene.add(mesh)
      fallbackCanvas.style.display = 'none'
      useWebGL = true
    } catch {
      canvas.style.display = 'none'
      fallbackCanvas.style.display = 'block'
    }

    const chooseFrames = () => {
      const useMobile = window.matchMedia('(max-width: 767px)').matches
      const candidates = useMobile && sequence.mobileFrames.length
        ? sequence.mobileFrames
        : sequence.desktopFrames.length
          ? sequence.desktopFrames
          : sequence.mobileFrames
      return Array.from(new Set(candidates.filter(Boolean)))
    }

    const resizeRenderer = () => {
      if (!renderer) return
      renderer.setSize(Math.max(1, container.clientWidth), Math.max(1, container.clientHeight), false)
    }

    const setMood = (nextProgress: number) => {
      if (!section) return
      const pulse = Math.sin(nextProgress * Math.PI * 2.2) * 0.12
      const brightness = Math.min(1.08, Math.max(0.52, 0.67 + nextProgress * 0.19 + pulse))
      const veil = Math.min(0.82, Math.max(0.04, (sequence.overlayOpacity / 100) * (0.92 - nextProgress * 0.22)))
      section.style.setProperty('--cinematic-progress', nextProgress.toFixed(4))
      section.style.setProperty('--cinematic-light', brightness.toFixed(3))
      section.style.setProperty('--cinematic-veil', veil.toFixed(3))
      section.style.setProperty('--cinematic-glow-x', `${Math.round(12 + nextProgress * 76)}%`)
    }

    const updateFrameLabel = (index: number) => {
      if (!frameLabelRef.current) return
      const current = urls.length ? Math.min(urls.length, Math.max(1, index + 1)) : 0
      frameLabelRef.current.textContent = `${String(current).padStart(2, '0')} / ${String(urls.length).padStart(2, '0')}`
    }

    const nearestLoadedFrame = (target: number) => {
      for (let radius = 0; radius < urls.length; radius += 1) {
        const previous = target - radius
        const next = target + radius
        const previousImage = images[previous]
        if (previous >= 0 && previousImage?.complete && previousImage.naturalWidth) return previous
        const nextImage = images[next]
        if (next < urls.length && nextImage?.complete && nextImage.naturalWidth) return next
      }
      return -1
    }

    function requestFrame(index: number) {
      if (
        index < 0 ||
        index >= urls.length ||
        images[index]?.complete ||
        loading.has(index) ||
        failed.has(index)
      ) return

      loading.add(index)
      const image = new window.Image()
      image.decoding = 'async'
      image.addEventListener('load', () => {
        loading.delete(index)
        retries.delete(index)
        if (!stopped && (index === 0 || index === wantedFrame)) draw(index, true)
        if (!stopped) warmFrames(index)
      }, { once: true })
      image.addEventListener('error', () => {
        loading.delete(index)
        images[index] = undefined
        const attempt = (retries.get(index) || 0) + 1
        retries.set(index, attempt)
        if (attempt < 2 && !stopped) {
          window.setTimeout(() => requestFrame(index), 350 * attempt)
          return
        }
        failed.add(index)
        if (!stopped && index === wantedFrame) {
          const fallbackIndex = nearestLoadedFrame(index)
          if (fallbackIndex >= 0) draw(fallbackIndex, true)
        }
        if (!stopped) warmFrames(index + 1)
      }, { once: true })
      images[index] = image
      image.src = urls[index]
    }

    function warmFrames(center: number) {
      // Ventana pequeña alrededor del frame solicitado: evita descargar toda la
      // secuencia de golpe en conexiones móviles.
      for (let index = center - 2; index <= center + 5; index += 1) requestFrame(index)
      while (loading.size < 4 && cursor < urls.length) requestFrame(cursor++)
    }

    const draw = (index: number, force = false) => {
      if (!urls.length) return
      const target = Math.min(urls.length - 1, Math.max(0, index))
      wantedFrame = target
      if (!force && target === renderedFrame) return
      requestFrame(target)
      warmFrames(target)
      const exactImage = images[target]
      const fallbackIndex = exactImage?.complete && exactImage.naturalWidth ? target : nearestLoadedFrame(target)
      const image = fallbackIndex >= 0 ? images[fallbackIndex] : undefined
      if (!image || !image.complete || !image.naturalWidth) return

      renderedFrame = fallbackIndex
      updateFrameLabel(target)
      if (useWebGL && renderer && scene && camera && mesh) {
        try {
          texture?.dispose()
          texture = new THREE.Texture(image)
          texture.colorSpace = THREE.SRGBColorSpace
          texture.minFilter = THREE.LinearFilter
          texture.magFilter = THREE.LinearFilter
          texture.needsUpdate = true
          const material = mesh.material as THREE.MeshBasicMaterial
          material.map = texture
          material.needsUpdate = true
          fitPlane(mesh, canvas, image, sequence.fit)
          resizeRenderer()
          renderer.render(scene, camera)
          return
        } catch {
          useWebGL = false
          canvas.style.display = 'none'
          fallbackCanvas.style.display = 'block'
        }
      }
      drawImage(fallbackCanvas, image, sequence.fit)
    }

    const syncProgress = (nextProgress: number) => {
      progress = Math.min(1, Math.max(0, nextProgress))
      setMood(progress)
      if (urls.length) draw(Math.round(progress * (urls.length - 1)))
    }

    const loadFrames = () => {
      const nextURLs = chooseFrames()
      const changed = nextURLs.length !== urls.length || nextURLs.some((url, index) => url !== urls[index])
      urls = nextURLs
      if (changed) {
        images = Array(urls.length)
        loading = new Set<number>()
        failed = new Set<number>()
        retries = new Map<number, number>()
        cursor = 0
        renderedFrame = -1
        wantedFrame = 0
      }
      updateFrameLabel(Math.round(progress * Math.max(0, urls.length - 1)))
      warmFrames(wantedFrame)
      draw(wantedFrame, true)
    }

    const onResize = () => {
      loadFrames()
      resizeRenderer()
      syncProgress(progress)
      trigger?.refresh()
    }

    loadFrames()
    const scrollDriven = forceScroll || sequence.trigger === 'scroll'
    if (scrollDriven && section) {
      gsap.registerPlugin(ScrollTrigger)
      trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: forceScroll ? Math.max(0.18, sequence.scrub) : sequence.scrub,
        invalidateOnRefresh: true,
        onUpdate: (self) => syncProgress(self.progress),
      })
      syncProgress(trigger.progress)
      trigger.refresh()
    } else {
      let current = 0
      interval = window.setInterval(() => {
        if (!urls.length) return
        current = sequence.trigger === 'loop' ? (current + 1) % urls.length : Math.min(current + 1, urls.length - 1)
        draw(current)
        if (sequence.trigger === 'autoplay' && current === urls.length - 1 && interval) window.clearInterval(interval)
      }, 1000 / 24)
    }
    window.addEventListener('resize', onResize)

    return () => {
      stopped = true
      if (interval) window.clearInterval(interval)
      trigger?.kill()
      texture?.dispose()
      if (mesh) {
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      }
      renderer?.dispose()
      window.removeEventListener('resize', onResize)
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
      style={sequence.poster ? { backgroundImage: `url(${JSON.stringify(sequence.poster)})` } : undefined}
    >
      <canvas ref={canvasRef} />
      <canvas ref={fallbackCanvasRef} className="hero-frame-sequence__fallback" />
      <div className="hero-frame-sequence__light" />
      <div className="hero-frame-sequence__counter"><span ref={frameLabelRef}>{initialLabel}</span><i>SCROLL / MOTION</i></div>
    </div>
  )
}
