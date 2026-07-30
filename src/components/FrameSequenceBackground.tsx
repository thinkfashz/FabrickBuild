'use client'

import { useEffect, useRef } from 'react'

import type { FrameSequence } from '@/lib/appearance'

type Props = {
  sequence: FrameSequence
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))

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

/** Client-side canvas renderer for a background managed as ordered CMS frames. */
export function FrameSequenceBackground({ sequence }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    let stopped = false
    let animationFrame = 0
    let interval: number | undefined
    let activeFrame = -1
    let images: Array<HTMLImageElement | undefined> = []
    let urls: string[] = []
    let loading = new Set<number>()
    let cursor = 0

    const chooseFrames = () => {
      const useMobile = window.matchMedia('(max-width: 767px)').matches
      return useMobile && sequence.mobileFrames.length ? sequence.mobileFrames : sequence.desktopFrames.length ? sequence.desktopFrames : sequence.mobileFrames
    }

    function requestFrame(index: number) {
      if (index < 0 || index >= urls.length || images[index] || loading.has(index)) return
      loading.add(index)
      const image = new window.Image()
      image.decoding = 'async'
      image.addEventListener('load', () => {
        loading.delete(index)
        if (!stopped && (index === 0 || index === activeFrame)) draw(index)
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
      // A 61-frame sequence stays sharp, but it should not open 61 network
      // requests at once on a phone. Keep the current neighbourhood warm and
      // progressively fill the rest of the album in the background.
      for (let index = center - 1; index <= center + 4; index += 1) requestFrame(index)
      while (loading.size < 3 && cursor < urls.length) requestFrame(cursor++)
    }

    const loadFrames = () => {
      urls = chooseFrames()
      images = Array(urls.length)
      loading = new Set<number>()
      cursor = 0
      activeFrame = -1
      warmFrames(0)
      draw(0)
    }

    const draw = (index: number) => {
      requestFrame(index)
      warmFrames(index)
      const image = images[index]
      if (!image || !image.complete) return
      activeFrame = index
      drawImage(canvas, image, sequence.fit)
    }

    const onScroll = () => {
      if (sequence.trigger !== 'scroll' || animationFrame) return
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0
        const section = container.closest('section')
        if (!section || images.length < 2) return
        const rect = section.getBoundingClientRect()
        const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height))
        draw(Math.round(progress * (images.length - 1)))
      })
    }

    const onResize = () => {
      loadFrames()
      if (activeFrame >= 0) draw(activeFrame)
    }

    loadFrames()
    if (sequence.trigger === 'scroll') {
      window.addEventListener('scroll', onScroll, { passive: true })
      onScroll()
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
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      if (interval) window.clearInterval(interval)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [sequence])

  return (
    <div
      ref={containerRef}
      className="hero-background hero-frame-sequence"
      aria-hidden="true"
      style={sequence.poster ? { backgroundImage: `url(${JSON.stringify(sequence.poster)})` } : undefined}
    >
      <canvas ref={canvasRef} />
    </div>
  )
}
