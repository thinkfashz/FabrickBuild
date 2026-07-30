'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'

import type { FrameSequence } from '@/lib/appearance'

type Props = {
  sequence: FrameSequence
  /** Portfolio scenes are always hand-driven, even for an older autoplay record. */
  forceScroll?: boolean
}

const FRAME_LIMIT = 60

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
 * A viewport-pinned sequence. ScrollTrigger maps progress to no more than 60
 * ordered CMS frames; the static canvas is layered under each editorial scene.
 * Three.js is used when WebGL is available and Canvas 2D is a safe fallback.
 */
export function FrameSequenceBackground({ sequence, forceScroll = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null)
  const frameLabelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const fallbackCanvas = fallbackCanvasRef.current
    const container = containerRef.current
    if (!canvas || !fallbackCanvas || !container) return

    const section = container.closest<HTMLElement>('section')
    let stopped = false
    let interval: number | undefined
    let activeFrame = -1
    let wantedFrame = 0
    let renderedFrame = -1
    let progress = 0
    let images: Array<HTMLImageElement | undefined> = []
    let urls: string[] = []
    let loading = new Set<number>()
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
    }

    const chooseFrames = () => {
      const useMobile = window.matchMedia('(max-width: 767px)').matches
      const candidates = useMobile && sequence.mobileFrames.length
        ? sequence.mobileFrames
        : sequence.desktopFrames.length
          ? sequence.desktopFrames
          : sequence.mobileFrames
      return candidates.slice(0, FRAME_LIMIT)
    }

    const resizeRenderer = () => {
      if (!renderer) return
      renderer.setSize(Math.max(1, container.clientWidth), Math.max(1, container.clientHeight), false)
    }

    const setMood = (nextProgress: number) => {
      if (!section) return
      const pulse = Math.sin(nextProgress * Math.PI * 2.2) * .12
      const brightness = Math.min(1.08, Math.max(.52, .67 + nextProgress * .19 + pulse))
      const veil = Math.min(.82, Math.max(.04, (sequence.overlayOpacity / 100) * (.92 - nextProgress * .22)))
      section.style.setProperty('--cinematic-progress', nextProgress.toFixed(4))
      section.style.setProperty('--cinematic-light', brightness.toFixed(3))
      section.style.setProperty('--cinematic-veil', veil.toFixed(3))
      section.style.setProperty('--cinematic-glow-x', `${Math.round(12 + nextProgress * 76)}%`)
    }

    const updateFrameLabel = (index: number) => {
      if (frameLabelRef.current) frameLabelRef.current.textContent = `${String(index + 1).padStart(2, '0')} / ${String(urls.length).padStart(2, '0')}`
    }

    function requestFrame(index: number) {
      if (index < 0 || index >= urls.length || images[index] || loading.has(index)) return
      loading.add(index)
      const image = new window.Image()
      image.decoding = 'async'
      image.addEventListener('load', () => {
        loading.delete(index)
        if (!stopped && (index === 0 || index === wantedFrame)) draw(index, true)
        if (!stopped) warmFrames(index)
      })
      image.addEventListener('error', () => {
        loading.delete(index)
        if (!stopped) warmFrames(index)
      })
      images[index] = image
      image.src = urls[index]
    }

    function warmFrames(center: number) {
      for (let index = center - 2; index <= center + 7; index += 1) requestFrame(index)
      while (loading.size < 4 && cursor < urls.length) requestFrame(cursor++)
    }

    const draw = (index: number, force = false) => {
      if (!urls.length) return
      const target = Math.min(urls.length - 1, Math.max(0, index))
      wantedFrame = target
      if (!force && target === renderedFrame) return
      requestFrame(target)
      warmFrames(target)
      const image = images[target]
      if (!image || !image.complete) return
      activeFrame = target
      renderedFrame = target
      updateFrameLabel(target)
      if (useWebGL && renderer && scene && camera && mesh) {
        try {
          texture?.dispose()
          texture = new THREE.CanvasTexture(image)
          texture.colorSpace = THREE.SRGBColorSpace
          texture.minFilter = THREE.LinearFilter
          texture.magFilter = THREE.LinearFilter
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
      urls = chooseFrames()
      images = Array(urls.length)
      loading = new Set<number>()
      cursor = 0
      activeFrame = -1
      renderedFrame = -1
      wantedFrame = 0
      updateFrameLabel(0)
      warmFrames(0)
      draw(0, true)
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
        scrub: forceScroll ? Math.max(.18, sequence.scrub) : sequence.scrub,
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
      <div className="hero-frame-sequence__counter"><span ref={frameLabelRef}>01 / 60</span><i>SCROLL / MOTION</i></div>
    </div>
  )
}
