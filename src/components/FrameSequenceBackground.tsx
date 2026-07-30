'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'

import type { FrameSequence } from '@/lib/appearance'

type Props = {
  sequence: FrameSequence
  /** Portfolio scenes are hand-driven even if an older Background says autoplay. */
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
 * Ordered CMS frames rendered on a Three.js texture. ScrollTrigger maps the
 * full section scroll progress to the precise frame number. Frames are
 * preloaded around the current point, not all at once, so mobile remains
 * smooth. A 2D canvas remains available when WebGL is unavailable.
 */
export function FrameSequenceBackground({ sequence, forceScroll = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const fallbackCanvas = fallbackCanvasRef.current
    const container = containerRef.current
    if (!canvas || !fallbackCanvas || !container) return

    let stopped = false
    let interval: number | undefined
    let activeFrame = -1
    let renderedFrame = -1
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
      return useMobile && sequence.mobileFrames.length
        ? sequence.mobileFrames
        : sequence.desktopFrames.length
          ? sequence.desktopFrames
          : sequence.mobileFrames
    }

    const resizeRenderer = () => {
      if (!renderer) return
      renderer.setSize(Math.max(1, container.clientWidth), Math.max(1, container.clientHeight), false)
    }

    function requestFrame(index: number) {
      if (index < 0 || index >= urls.length || images[index] || loading.has(index)) return
      loading.add(index)
      const image = new window.Image()
      image.decoding = 'async'
      image.addEventListener('load', () => {
        loading.delete(index)
        if (!stopped && (index === 0 || index === activeFrame)) draw(index, true)
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
      for (let index = center - 1; index <= center + 4; index += 1) requestFrame(index)
      while (loading.size < 3 && cursor < urls.length) requestFrame(cursor++)
    }

    const draw = (index: number, force = false) => {
      if (!force && index === renderedFrame) return
      requestFrame(index)
      warmFrames(index)
      const image = images[index]
      if (!image || !image.complete) return
      activeFrame = index
      renderedFrame = index
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

    const loadFrames = () => {
      urls = chooseFrames()
      images = Array(urls.length)
      loading = new Set<number>()
      cursor = 0
      activeFrame = -1
      renderedFrame = -1
      warmFrames(0)
      draw(0, true)
    }

    const onResize = () => {
      loadFrames()
      resizeRenderer()
      if (activeFrame >= 0) draw(activeFrame, true)
      trigger?.refresh()
    }

    loadFrames()
    const scrollDriven = forceScroll || sequence.trigger === 'scroll'
    if (scrollDriven) {
      const section = container.closest('section')
      if (section) {
        gsap.registerPlugin(ScrollTrigger)
        trigger = ScrollTrigger.create({
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.45,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (images.length > 1) draw(Math.round(self.progress * (images.length - 1)))
          },
        })
        trigger.refresh()
      }
    } else {
      let current = 0
      interval = window.setInterval(() => {
        if (!images.length) return
        current = sequence.trigger === 'loop' ? (current + 1) % images.length : Math.min(current + 1, images.length - 1)
        draw(current)
        if (sequence.trigger === 'autoplay' && current === images.length - 1 && interval) window.clearInterval(interval)
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
      className="hero-background hero-frame-sequence"
      aria-hidden="true"
      style={sequence.poster ? { backgroundImage: `url(${JSON.stringify(sequence.poster)})` } : undefined}
    >
      <canvas ref={canvasRef} />
      <canvas ref={fallbackCanvasRef} className="hero-frame-sequence__fallback" />
    </div>
  )
}
