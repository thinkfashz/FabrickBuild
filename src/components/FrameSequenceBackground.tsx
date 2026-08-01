'use client'

import { useEffect, useMemo, useRef } from 'react'

import type { FrameSequence } from '@/lib/appearance'

type Props = { sequence: FrameSequence; forceScroll?: boolean }
type FrameRecord = { image: HTMLImageElement | null; state: 'idle' | 'loading' | 'loaded' | 'error' }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const imageCache = new Map<string, HTMLImageElement>()

function drawFrame(canvas: HTMLCanvasElement, image: HTMLImageElement, fit: FrameSequence['fit'], mobile: boolean) {
  const bounds = canvas.getBoundingClientRect()
  const pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.12 : 1.45)
  const width = Math.max(1, Math.round(bounds.width * pixelRatio))
  const height = Math.max(1, Math.round(bounds.height * pixelRatio))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  const context = canvas.getContext('2d', { alpha: false, desynchronized: true })
  if (!context || !image.naturalWidth || !image.naturalHeight) return
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = mobile ? 'medium' : 'high'
  const sourceRatio = image.naturalWidth / image.naturalHeight
  const targetRatio = width / height
  const scale = fit === 'contain'
    ? (sourceRatio > targetRatio ? width / image.naturalWidth : height / image.naturalHeight)
    : (sourceRatio > targetRatio ? height / image.naturalHeight : width / image.naturalWidth)
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  context.clearRect(0, 0, width, height)
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
}

export function FrameSequenceBackground({ sequence, forceScroll = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameLabelRef = useRef<HTMLSpanElement>(null)
  const loadLabelRef = useRef<HTMLSpanElement>(null)
  const initialFrameCount = useMemo(() => Math.max(sequence.desktopFrames.length, sequence.mobileFrames.length), [sequence])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const section = container.closest<HTMLElement>('section')
    const horizontal = section?.dataset.backgroundAxis === 'horizontal'
    const reverse = section?.dataset.playbackDirection === 'reverse'
    const mobileQuery = window.matchMedia('(max-width: 767px)')
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection
    let mobile = mobileQuery.matches
    let urls: string[] = []
    let records: FrameRecord[] = []
    let wanted = 0
    let rendered = -1
    let activeLoads = 0
    let stopped = false
    let scrollRAF = 0
    let drawRAF = 0
    let autoplayTimer = 0
    let idleHandle = 0
    let resizeObserver: ResizeObserver | null = null
    const queue: number[] = []
    const queued = new Set<number>()
    const slowConnection = connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType || '')

    const chooseFrames = () => {
      const source = mobile && sequence.mobileFrames.length
        ? sequence.mobileFrames
        : sequence.desktopFrames.length ? sequence.desktopFrames : sequence.mobileFrames
      return Array.from(new Set(source.filter(Boolean)))
    }

    const loadedCount = () => records.reduce((total, record) => total + (record.state === 'loaded' ? 1 : 0), 0)
    const updateLabels = () => {
      if (frameLabelRef.current) frameLabelRef.current.textContent = `${String(wanted + 1).padStart(2, '0')} / ${String(urls.length).padStart(2, '0')}`
      const loaded = loadedCount()
      if (loadLabelRef.current) loadLabelRef.current.textContent = loaded >= Math.min(8, urls.length) ? 'Secuencia lista' : `Preparando ${loaded}/${Math.min(8, urls.length)}`
      container.dataset.sequenceReady = loaded > 0 ? 'true' : 'false'
    }

    const nearestLoaded = (target: number) => {
      for (let distance = 0; distance < urls.length; distance += 1) {
        const before = target - distance
        const after = target + distance
        if (before >= 0 && records[before]?.state === 'loaded') return before
        if (after < records.length && records[after]?.state === 'loaded') return after
      }
      return -1
    }

    const render = (force = false) => {
      drawRAF = 0
      if (stopped || document.hidden) return
      const index = records[wanted]?.state === 'loaded' ? wanted : nearestLoaded(wanted)
      if (index < 0 || (!force && index === rendered)) return
      const image = records[index]?.image
      if (!image) return
      rendered = index
      drawFrame(canvas, image, sequence.fit, mobile)
      updateLabels()
    }
    const scheduleRender = (force = false) => {
      if (!drawRAF) drawRAF = requestAnimationFrame(() => render(force))
    }

    const pump = () => {
      const limit = slowConnection ? 2 : mobile ? 4 : 6
      while (!stopped && !document.hidden && activeLoads < limit && queue.length) {
        const index = queue.shift()
        if (typeof index !== 'number') break
        queued.delete(index)
        const record = records[index]
        if (!record || record.state !== 'idle') continue
        const cached = imageCache.get(urls[index])
        if (cached?.complete && cached.naturalWidth) {
          record.image = cached
          record.state = 'loaded'
          if (index === wanted || rendered < 0) scheduleRender(true)
          continue
        }
        record.state = 'loading'
        activeLoads += 1
        const image = new Image()
        image.decoding = 'async'
        image.loading = 'eager'
        image.fetchPriority = Math.abs(index - wanted) <= 3 || index === 0 ? 'high' : 'low'
        image.onload = () => {
          const finish = () => {
            if (!stopped) {
              record.image = image
              record.state = 'loaded'
              imageCache.set(urls[index], image)
              if (index === wanted || rendered < 0) scheduleRender(true)
              updateLabels()
            }
            activeLoads = Math.max(0, activeLoads - 1)
            pump()
          }
          image.decode().then(finish).catch(finish)
        }
        image.onerror = () => {
          record.state = 'error'
          activeLoads = Math.max(0, activeLoads - 1)
          pump()
        }
        image.src = urls[index]
      }
    }

    const enqueue = (index: number, priority = false) => {
      if (index < 0 || index >= records.length || queued.has(index) || records[index]?.state !== 'idle') return
      queued.add(index)
      priority ? queue.unshift(index) : queue.push(index)
      pump()
    }

    const warmWindow = (center: number) => {
      enqueue(center, true)
      const ahead = slowConnection ? 3 : mobile ? 8 : 12
      const behind = slowConnection ? 2 : mobile ? 5 : 7
      for (let distance = 1; distance <= Math.max(ahead, behind); distance += 1) {
        if (distance <= ahead) enqueue(center + distance, distance <= 4)
        if (distance <= behind) enqueue(center - distance, distance <= 3)
      }
    }

    const preloadKeyframes = () => {
      if (!urls.length) return
      const step = slowConnection ? 10 : mobile ? 6 : 5
      const keyframes = new Set([0, urls.length - 1, Math.floor(urls.length / 2)])
      for (let index = 0; index < urls.length; index += step) keyframes.add(index)
      Array.from(keyframes).forEach((index, order) => enqueue(index, order < 4))
    }

    const backgroundFill = () => {
      const run = () => {
        if (stopped || document.hidden || slowConnection) return
        const next = records.findIndex((record) => record.state === 'idle')
        if (next < 0) return
        enqueue(next)
        idleHandle = window.setTimeout(run, mobile ? 120 : 70)
      }
      idleHandle = window.setTimeout(run, 900)
    }

    const setWanted = (next: number) => {
      const index = clamp(next, 0, Math.max(0, urls.length - 1))
      if (index === wanted && rendered >= 0) return
      wanted = index
      warmWindow(index)
      scheduleRender()
      updateLabels()
    }

    const syncScroll = () => {
      scrollRAF = 0
      if (!section || !urls.length) return
      const rawProgress = horizontal
        ? clamp(section.scrollLeft / Math.max(1, section.scrollWidth - section.clientWidth), 0, 1)
        : (() => {
            const rect = section.getBoundingClientRect()
            return clamp(-rect.top / Math.max(1, rect.height - innerHeight), 0, 1)
          })()
      const progress = reverse ? 1 - rawProgress : rawProgress
      section.style.setProperty('--cinematic-progress', progress.toFixed(4))
      section.style.setProperty('--cinematic-light', String(0.8 + progress * 0.14))
      section.style.setProperty('--cinematic-veil', String(clamp((sequence.overlayOpacity / 100) * (0.84 - progress * 0.16), 0.03, 0.55)))
      section.style.setProperty('--cinematic-glow-x', `${Math.round(18 + progress * 64)}%`)
      setWanted(Math.round(progress * (urls.length - 1)))
    }
    const onScroll = () => { if (!scrollRAF) scrollRAF = requestAnimationFrame(syncScroll) }

    const reset = () => {
      urls = chooseFrames()
      records = urls.map((url) => {
        const cached = imageCache.get(url)
        return cached?.complete && cached.naturalWidth ? { image: cached, state: 'loaded' as const } : { image: null, state: 'idle' as const }
      })
      queue.length = 0
      queued.clear()
      activeLoads = 0
      rendered = -1
      wanted = reverse ? Math.max(0, urls.length - 1) : 0
      enqueue(wanted, true)
      preloadKeyframes()
      warmWindow(wanted)
      backgroundFill()
      updateLabels()
      syncScroll()
    }

    const resize = () => {
      const wasMobile = mobile
      mobile = mobileQuery.matches
      if (mobile !== wasMobile) reset()
      rendered = -1
      scheduleRender(true)
      onScroll()
    }

    reset()
    const scrollTarget: Window | HTMLElement = horizontal && section ? section : window
    if (forceScroll || sequence.trigger === 'scroll') {
      scrollTarget.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', resize, { passive: true })
    } else {
      autoplayTimer = window.setInterval(() => {
        const step = reverse ? -1 : 1
        const next = sequence.trigger === 'loop'
          ? (wanted + step + Math.max(1, urls.length)) % Math.max(1, urls.length)
          : clamp(wanted + step, 0, Math.max(0, urls.length - 1))
        setWanted(next)
      }, 50)
    }
    resizeObserver = new ResizeObserver(() => { rendered = -1; scheduleRender(true) })
    resizeObserver.observe(container)
    mobileQuery.addEventListener('change', resize)

    return () => {
      stopped = true
      scrollTarget.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', resize)
      mobileQuery.removeEventListener('change', resize)
      resizeObserver?.disconnect()
      clearInterval(autoplayTimer)
      clearTimeout(idleHandle)
      if (scrollRAF) cancelAnimationFrame(scrollRAF)
      if (drawRAF) cancelAnimationFrame(drawRAF)
    }
  }, [forceScroll, sequence])

  return (
    <div ref={containerRef} className={`hero-background hero-frame-sequence ${forceScroll || sequence.pin ? 'hero-frame-sequence--pinned' : ''}`} aria-hidden="true" data-sequence-ready="false" style={sequence.poster ? { backgroundImage: `url("${sequence.poster}")` } : undefined}>
      <canvas ref={canvasRef} />
      <div className="hero-frame-sequence__light" />
      <div className="hero-frame-sequence__loading"><i /><span ref={loadLabelRef}>Preparando 0/{Math.min(8, initialFrameCount)}</span></div>
      <div className="hero-frame-sequence__counter"><span ref={frameLabelRef}>01 / {String(initialFrameCount).padStart(2, '0')}</span><i>SCROLL / MOTION</i></div>
    </div>
  )
}
