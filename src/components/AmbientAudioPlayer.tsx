'use client'

import { Github, Instagram, MessageCircle, Music2, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const MUTED_KEY = 'fabrick-ambient-muted'
const VOLUME_KEY = 'fabrick-ambient-volume'
const DEFAULT_VOLUME = 0.34
const BPM = 124
const BEAT = 60 / BPM
const BAR = BEAT * 4

const CHORDS = [
  [220, 261.63, 329.63],
  [174.61, 220, 261.63],
  [196, 246.94, 293.66],
  [164.81, 207.65, 246.94],
]
const BASS = [55, 43.65, 49, 41.2]

type ConnectionInfo = { effectiveType?: string; saveData?: boolean }
type PerformanceNavigator = Navigator & { connection?: ConnectionInfo; deviceMemory?: number }

type SocialState = {
  whatsapp: string
  instagram: string | null
}

function safeStorageGet(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // El modo privado puede bloquear localStorage. La experiencia sigue funcionando.
  }
}

function optimizeCloudinaryURL(value: string, compact: boolean, reducedData: boolean) {
  if (!value.includes('res.cloudinary.com') || !value.includes('/image/upload/')) return value
  if (/\/image\/upload\/[^/]*(?:f_auto|q_auto|w_\d+|dpr_auto)/.test(value)) return value
  const width = compact ? 960 : 1600
  const quality = reducedData ? 'q_auto:low' : 'q_auto:eco'
  return value.replace('/image/upload/', `/image/upload/f_auto,${quality},c_limit,w_${width},dpr_auto/`)
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value))
}

function ensurePreconnect(href: string) {
  if (document.head.querySelector(`link[rel="preconnect"][href="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = href
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
}

export function AmbientAudioPlayer() {
  const contextRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const compressorRef = useRef<DynamicsCompressorNode | null>(null)
  const noiseBufferRef = useRef<AudioBuffer | null>(null)
  const timerRef = useRef<number | null>(null)
  const nextBarRef = useRef(0)
  const barIndexRef = useRef(0)
  const startedRef = useRef(false)
  const desiredPlayingRef = useRef(false)
  const volumeRef = useRef(DEFAULT_VOLUME)
  const mutedRef = useRef(false)
  const lowPowerRef = useRef(false)
  const [muted, setMuted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(DEFAULT_VOLUME)
  const [social, setSocial] = useState<SocialState>({ whatsapp: '/#contacto', instagram: null })

  const destination = (context: AudioContext) => compressorRef.current || masterRef.current || context.destination

  function tone(
    context: AudioContext,
    frequency: number,
    startsAt: number,
    duration: number,
    level: number,
    type: OscillatorType = 'sine',
    cutoff = 4800,
  ) {
    const oscillator = context.createOscillator()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, startsAt)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(cutoff, startsAt)
    filter.Q.value = 0.8
    gain.gain.setValueAtTime(0.0001, startsAt)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), startsAt + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration)
    oscillator.connect(filter)
    filter.connect(gain)
    gain.connect(destination(context))
    oscillator.start(startsAt)
    oscillator.stop(startsAt + duration + 0.03)
  }

  function kick(context: AudioContext, startsAt: number, level = 0.24) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(142, startsAt)
    oscillator.frequency.exponentialRampToValueAtTime(44, startsAt + 0.19)
    gain.gain.setValueAtTime(level, startsAt)
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.27)
    oscillator.connect(gain)
    gain.connect(destination(context))
    oscillator.start(startsAt)
    oscillator.stop(startsAt + 0.29)
  }

  function getNoiseBuffer(context: AudioContext) {
    if (noiseBufferRef.current) return noiseBufferRef.current
    const duration = 1
    const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate)
    const channel = buffer.getChannelData(0)
    for (let index = 0; index < channel.length; index += 1) channel[index] = Math.random() * 2 - 1
    noiseBufferRef.current = buffer
    return buffer
  }

  function noiseHit(
    context: AudioContext,
    startsAt: number,
    duration: number,
    level: number,
    filterType: BiquadFilterType = 'highpass',
    cutoff = 5200,
  ) {
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    source.buffer = getNoiseBuffer(context)
    filter.type = filterType
    filter.frequency.setValueAtTime(cutoff, startsAt)
    filter.Q.value = filterType === 'bandpass' ? 1.4 : 0.7
    gain.gain.setValueAtTime(Math.max(0.0001, level), startsAt)
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(destination(context))
    source.start(startsAt)
    source.stop(startsAt + duration + 0.02)
  }

  function scheduleBar() {
    const context = contextRef.current
    if (!context) return
    const start = nextBarRef.current
    const chordIndex = barIndexRef.current % CHORDS.length
    const chord = CHORDS[chordIndex]
    const bass = BASS[chordIndex]

    // Base afrohouse con acentos dembow: firme, alegre y sin saturar el master.
    ;[0, 1.5, 2, 3.25].forEach((position, index) => kick(context, start + position * BEAT, index === 0 ? 0.26 : 0.215))
    ;[1, 3].forEach((position) => {
      noiseHit(context, start + position * BEAT, 0.13, 0.046, 'bandpass', 1850)
      tone(context, 185, start + position * BEAT, 0.075, 0.018, 'triangle', 2400)
    })

    const shakerSteps = lowPowerRef.current ? 8 : 16
    for (let step = 0; step < shakerSteps; step += 1) {
      const subdivision = 4 / shakerSteps
      const accent = step % Math.max(1, shakerSteps / 4) === 2
      noiseHit(context, start + step * subdivision * BEAT, 0.032, accent ? 0.013 : 0.0055, 'highpass', accent ? 6900 : 7800)
    }

    ;[0.75, 1.75, 2.75, 3.5].forEach((position, index) => {
      tone(context, 120 + index * 13, start + position * BEAT, 0.09, 0.025, 'sine', 1300)
    })

    ;[0, 0.75, 1.5, 2.5, 3.25].forEach((position, index) => {
      const octave = index === 4 ? 2 : 1
      tone(context, bass * octave, start + position * BEAT, 0.24, 0.064, 'triangle', 420)
    })

    ;[0.25, 1, 1.75, 2.25, 3, 3.5].forEach((position, index) => {
      const note = chord[(index + barIndexRef.current) % chord.length]
      tone(context, note, start + position * BEAT, 0.14, 0.034, 'sine', 3200)
      if (!lowPowerRef.current) tone(context, note * 2, start + position * BEAT, 0.075, 0.011, 'triangle', 5600)
    })

    // Pad discreto para unir los compases sin volver pesada la mezcla.
    chord.forEach((note) => tone(context, note / 2, start, BAR * 0.92, 0.008, 'sine', 980))
    nextBarRef.current += BAR
    barIndexRef.current += 1
  }

  function applyMasterLevel(nextMuted = mutedRef.current, nextVolume = volumeRef.current) {
    const context = contextRef.current
    const master = masterRef.current
    if (!context || !master) return
    const now = context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now)
    master.gain.exponentialRampToValueAtTime(nextMuted ? 0.0001 : Math.max(0.0001, nextVolume), now + 0.12)
  }

  async function ensureRunning() {
    const context = contextRef.current
    if (!context || !desiredPlayingRef.current || mutedRef.current || document.hidden) return
    try {
      if (context.state !== 'running') await context.resume()
      setPlaying(context.state === 'running')
    } catch {
      setPlaying(false)
    }
  }

  async function startMusic(forceUnmuted = false) {
    if (startedRef.current) {
      desiredPlayingRef.current = true
      await ensureRunning()
      return
    }
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const context = new AudioContextClass({ latencyHint: 'interactive' })
    const master = context.createGain()
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -20
    compressor.knee.value = 12
    compressor.ratio.value = 4.5
    compressor.attack.value = 0.004
    compressor.release.value = 0.18
    compressor.connect(master)
    master.connect(context.destination)

    const savedMuted = forceUnmuted ? false : safeStorageGet(MUTED_KEY) === 'true'
    const savedVolume = Number(safeStorageGet(VOLUME_KEY))
    const initialVolume = Number.isFinite(savedVolume) ? Math.min(0.72, Math.max(0, savedVolume)) : DEFAULT_VOLUME
    mutedRef.current = savedMuted
    volumeRef.current = initialVolume
    desiredPlayingRef.current = true
    master.gain.value = savedMuted ? 0.0001 : initialVolume
    contextRef.current = context
    masterRef.current = master
    compressorRef.current = compressor
    nextBarRef.current = context.currentTime + 0.04
    barIndexRef.current = 0
    startedRef.current = true
    setMuted(savedMuted)
    setVolume(initialVolume)
    await context.resume()
    setPlaying(context.state === 'running' && !savedMuted)
    scheduleBar()
    scheduleBar()
    timerRef.current = window.setInterval(() => {
      while (nextBarRef.current < context.currentTime + BAR * 1.15) scheduleBar()
    }, 160)
  }

  useEffect(() => {
    const performanceNavigator = navigator as PerformanceNavigator
    const compact = window.matchMedia('(max-width: 767px)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const reducedData = Boolean(performanceNavigator.connection?.saveData || ['slow-2g', '2g'].includes(performanceNavigator.connection?.effectiveType || ''))
    const lowMemory = typeof performanceNavigator.deviceMemory === 'number' && performanceNavigator.deviceMemory <= 4
    lowPowerRef.current = reducedData || lowMemory || (navigator.hardwareConcurrency || 8) <= 4
    document.documentElement.dataset.fabrickPerformance = lowPowerRef.current ? 'economy' : 'balanced'
    document.documentElement.dataset.fabrickApp = compact ? 'mobile' : 'desktop'

    document.title = 'FabrickBuild | Diseño web, e-commerce, automatización e IA'
    const description = 'Creamos páginas web rápidas, e-commerce, automatizaciones, experiencias 3D e integraciones con IA para marcas y negocios en Chile.'
    upsertMeta('meta[name="description"]', { name: 'description', content: description })
    upsertMeta('meta[name="keywords"]', { name: 'keywords', content: 'diseño web Chile, desarrollo web, e-commerce, automatización, inteligencia artificial, páginas web rápidas, experiencia 3D, FabrickBuild' })
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: 'FabrickBuild — Diseño web, IA y automatización' })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description })
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: 'FabrickBuild — Experiencias digitales' })
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description })
    upsertMeta('meta[name="theme-color"]', { name: 'theme-color', content: '#090d0d' })

    ensurePreconnect('https://res.cloudinary.com')
    ensurePreconnect(window.location.origin)

    const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')
    if (srcDescriptor?.set && srcDescriptor.get && srcDescriptor.configurable) {
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        configurable: true,
        enumerable: srcDescriptor.enumerable,
        get: srcDescriptor.get,
        set(value: string) {
          srcDescriptor.set?.call(this, optimizeCloudinaryURL(String(value), compact, reducedData))
        },
      })
    }

    const tuneImage = (image: HTMLImageElement) => {
      if (image.dataset.fabrickOptimized === 'true') return
      const isPriority = Boolean(image.closest('.hero, .portfolio-hero, [data-priority="true"], .site-header'))
      const currentSource = image.currentSrc || image.src
      const optimized = optimizeCloudinaryURL(currentSource, compact, reducedData)
      if (optimized && optimized !== currentSource) image.src = optimized
      image.decoding = 'async'
      image.loading = isPriority ? 'eager' : 'lazy'
      image.fetchPriority = isPriority ? 'high' : 'low'
      image.referrerPolicy = 'strict-origin-when-cross-origin'
      image.dataset.fabrickOptimized = 'true'
    }

    const tuneVideo = (video: HTMLVideoElement) => {
      video.preload = video.closest('.hero, .portfolio-hero') ? 'metadata' : 'none'
      video.playsInline = true
      video.setAttribute('playsinline', '')
    }

    const tuneNode = (node: ParentNode) => {
      if (node instanceof HTMLImageElement) tuneImage(node)
      if (node instanceof HTMLVideoElement) tuneVideo(node)
      node.querySelectorAll?.('img').forEach((image) => tuneImage(image as HTMLImageElement))
      node.querySelectorAll?.('video').forEach((video) => tuneVideo(video as HTMLVideoElement))
    }

    tuneNode(document.body)
    const mediaObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) tuneNode(node)
      }))
    })
    mediaObserver.observe(document.body, { childList: true, subtree: true })

    const revealSelector = 'main h1, main h2, main h3, main p, main blockquote, main [class*="cta"], main [class*="button"], .footer-intro, .footer-desktop-columns > *, .footer-mobile-panels details'
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>(revealSelector))
    revealElements.forEach((element, index) => {
      element.dataset.fabrickReveal = 'true'
      element.style.setProperty('--reveal-delay', `${Math.min(index % 5, 4) * 55}ms`)
    })

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        ;(entry.target as HTMLElement).dataset.fabrickVisible = 'true'
        revealObserver.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: reducedMotion ? 0 : 0.08 })
    revealElements.forEach((element) => revealObserver.observe(element))

    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target as HTMLVideoElement
        if (entry.isIntersecting) {
          if (video.autoplay && !document.hidden) void video.play().catch(() => undefined)
        } else {
          video.pause()
        }
      })
    }, { rootMargin: '160px 0px', threshold: 0.01 })
    document.querySelectorAll<HTMLVideoElement>('video').forEach((video) => videoObserver.observe(video))

    const whatsapp = document.querySelector<HTMLAnchorElement>('.whatsapp-float')?.href || '/#contacto'
    const instagram = Array.from(document.querySelectorAll<HTMLAnchorElement>('.footer-social a')).find((link) => /instagram/i.test(link.textContent || ''))?.href || null
    setSocial({ whatsapp, instagram })

    const savedMuted = safeStorageGet(MUTED_KEY) === 'true'
    const savedVolume = Number(safeStorageGet(VOLUME_KEY))
    const initialVolume = Number.isFinite(savedVolume) ? Math.min(0.72, Math.max(0, savedVolume)) : DEFAULT_VOLUME
    mutedRef.current = savedMuted
    volumeRef.current = initialVolume
    setMuted(savedMuted)
    setVolume(initialVolume)

    const onConsent = () => void startMusic(true)
    const recover = () => {
      const context = contextRef.current
      if (!context) return
      if (document.hidden) {
        void context.suspend()
        setPlaying(false)
      } else {
        void ensureRunning()
      }
    }
    window.addEventListener('fabrick:consent', onConsent)
    window.addEventListener('pageshow', recover)
    window.addEventListener('focus', recover)
    window.addEventListener('pointerdown', recover, { passive: true })
    document.addEventListener('visibilitychange', recover)

    return () => {
      mediaObserver.disconnect()
      revealObserver.disconnect()
      videoObserver.disconnect()
      if (srcDescriptor?.set && srcDescriptor.get && srcDescriptor.configurable) {
        Object.defineProperty(HTMLImageElement.prototype, 'src', srcDescriptor)
      }
      window.removeEventListener('fabrick:consent', onConsent)
      window.removeEventListener('pageshow', recover)
      window.removeEventListener('focus', recover)
      window.removeEventListener('pointerdown', recover)
      document.removeEventListener('visibilitychange', recover)
      if (timerRef.current) window.clearInterval(timerRef.current)
      void contextRef.current?.close()
    }
  }, [])

  async function toggleMusic() {
    if (!startedRef.current) {
      mutedRef.current = false
      desiredPlayingRef.current = true
      safeStorageSet(MUTED_KEY, 'false')
      setMuted(false)
      await startMusic(true)
      return
    }
    const nextMuted = !mutedRef.current
    mutedRef.current = nextMuted
    desiredPlayingRef.current = !nextMuted
    setMuted(nextMuted)
    setPlaying(!nextMuted)
    safeStorageSet(MUTED_KEY, String(nextMuted))
    applyMasterLevel(nextMuted)
    if (!nextMuted) await ensureRunning()
  }

  function changeVolume(next: number) {
    const normalized = Math.min(0.72, Math.max(0, next))
    volumeRef.current = normalized
    setVolume(normalized)
    safeStorageSet(VOLUME_KEY, String(normalized))
    if (normalized > 0 && mutedRef.current) {
      mutedRef.current = false
      desiredPlayingRef.current = true
      setMuted(false)
      safeStorageSet(MUTED_KEY, 'false')
      void ensureRunning()
    }
    applyMasterLevel(false, normalized)
  }

  return (
    <>
      <div className="ambient-audio" data-playing={playing && !muted ? 'true' : 'false'}>
        <button type="button" className="ambient-audio__button" onClick={() => void toggleMusic()} aria-label={muted ? 'Activar música afrohouse y dembow' : 'Silenciar música afrohouse y dembow'} aria-pressed={muted}>
          <span className="ambient-audio__icon" aria-hidden="true">{!playing ? <Music2 size={17} /> : muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</span>
          <span className="ambient-audio__copy"><small>AFROHOUSE · DEMBOW</small><strong>{!playing ? 'Toca para activar' : muted ? 'Música en silencio' : `Energía ${Math.round((volume / 0.72) * 100)}%`}</strong></span>
          <span className="ambient-audio__levels" aria-hidden="true"><i /><i /><i /></span>
        </button>
        <label className="ambient-audio__volume" aria-label="Volumen de la música"><Volume2 size={14} aria-hidden="true" /><input type="range" min="0" max="72" step="1" value={Math.round(volume * 100)} onChange={(event) => changeVolume(Number(event.target.value) / 100)} /><span>{Math.round((volume / 0.72) * 100)}%</span></label>
      </div>

      <section className="fabrick-social-end" aria-label="Redes sociales y tecnología">
        <div className="fabrick-social-end__copy"><Sparkles size={17} aria-hidden="true" /><span><small>FABRICKBUILD DIGITAL</small><strong>Diseño web · e-commerce · automatización · IA</strong><em>Experiencia de scroll fluido impulsada por Lenis</em></span></div>
        <nav>
          <a href="https://github.com/thinkfashz" target="_blank" rel="noreferrer" aria-label="FabrickBuild en GitHub"><Github size={17} /> GitHub</a>
          {social.instagram && <a href={social.instagram} target="_blank" rel="noreferrer" aria-label="FabrickBuild en Instagram"><Instagram size={17} /> Instagram</a>}
          <a href={social.whatsapp} target={social.whatsapp.startsWith('http') ? '_blank' : undefined} rel={social.whatsapp.startsWith('http') ? 'noreferrer' : undefined} aria-label="Contactar por WhatsApp"><MessageCircle size={17} /> WhatsApp</a>
        </nav>
      </section>

      <style>{GLOBAL_EXPERIENCE_STYLES}</style>
    </>
  )
}

const GLOBAL_EXPERIENCE_STYLES = `
:root{--fabrick-natural:#b8d7c5;--fabrick-warm:#e5bb6b;--fabrick-ink:#080d0d;--fabrick-glass:rgba(8,14,14,.72)}
html{background:var(--fabrick-ink);scroll-padding-top:78px}body{overflow-x:clip;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}main{isolation:isolate}
img{max-width:100%;height:auto}main img:not([data-priority="true"]){content-visibility:auto;contain-intrinsic-size:420px 280px}main video{background:#080b0c}
main section,main article{content-visibility:auto;contain-intrinsic-size:720px}
main h1,main h2,main h3{font-kerning:normal;text-wrap:balance;letter-spacing:-.035em}main p,main li{max-width:72ch;text-wrap:pretty;line-height:1.68}
[data-fabrick-reveal="true"]{opacity:0;transform:translate3d(0,22px,0) scale(.992);filter:blur(5px);transition:opacity .72s cubic-bezier(.22,1,.36,1) var(--reveal-delay,0ms),transform .82s cubic-bezier(.22,1,.36,1) var(--reveal-delay,0ms),filter .65s ease var(--reveal-delay,0ms)}
[data-fabrick-reveal="true"][data-fabrick-visible="true"]{opacity:1;transform:none;filter:none}
.site-header{backdrop-filter:blur(20px) saturate(145%);-webkit-backdrop-filter:blur(20px) saturate(145%)}
.site-footer.footer-reimagined{position:relative;background:linear-gradient(145deg,rgba(7,13,13,.78),rgba(16,21,18,.66))!important;border-top:1px solid rgba(184,215,197,.18);backdrop-filter:blur(28px) saturate(145%);-webkit-backdrop-filter:blur(28px) saturate(145%);box-shadow:0 -24px 80px rgba(0,0,0,.28)}
.site-footer.footer-reimagined:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 14% 0%,rgba(184,215,197,.11),transparent 34%),radial-gradient(circle at 88% 88%,rgba(229,187,107,.08),transparent 38%)}
.footer-wordmark,.footer-intro h2,.footer-intro strong{letter-spacing:-.04em;text-shadow:0 1px 18px rgba(255,255,255,.08)}.footer-intro p,.footer-contact-list,.footer-legal{color:rgba(239,244,240,.74)!important}.footer-reimagined a{transition:color .25s ease,opacity .25s ease,transform .25s ease}.footer-reimagined a:hover{color:var(--fabrick-natural)!important;transform:translateY(-1px)}
.footer-social a,.fabrick-social-end a{min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid rgba(184,215,197,.18);border-radius:999px;background:rgba(255,255,255,.045);color:#f7faf7;text-decoration:none;backdrop-filter:blur(14px)}
.fabrick-social-end{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:18px max(22px,calc((100vw - 1240px)/2));background:linear-gradient(90deg,rgba(8,13,13,.96),rgba(14,20,18,.92));border-top:1px solid rgba(255,255,255,.07);color:#f6faf7}.fabrick-social-end__copy{display:flex;align-items:center;gap:12px}.fabrick-social-end__copy>svg{color:var(--fabrick-warm)}.fabrick-social-end__copy span{display:grid;gap:2px}.fabrick-social-end__copy small{font-size:9px;letter-spacing:.16em;color:var(--fabrick-warm);font-weight:900}.fabrick-social-end__copy strong{font-size:14px;letter-spacing:-.01em}.fabrick-social-end__copy em{font-size:11px;color:rgba(235,242,237,.55);font-style:normal}.fabrick-social-end nav{display:flex;flex-wrap:wrap;gap:8px}.fabrick-social-end nav a{padding:9px 14px;font-size:12px;font-weight:700}
.ambient-audio{will-change:auto}.ambient-audio__copy small{letter-spacing:.11em}.ambient-audio[data-playing="true"] .ambient-audio__levels i{animation-duration:.72s}
@media(max-width:767px){html{background:#070b0c}body{min-height:100dvh;padding-bottom:env(safe-area-inset-bottom);background:radial-gradient(circle at 50% -10%,rgba(184,215,197,.09),transparent 38%),#070b0c}main{width:100%;overflow:clip}.shell{width:min(calc(100% - 24px),var(--shell,1200px))!important}main h1{font-size:clamp(2.35rem,12vw,4.2rem)!important;line-height:.92!important}main h2{font-size:clamp(1.9rem,9vw,3rem)!important;line-height:1!important}main p{font-size:clamp(.98rem,4vw,1.08rem);line-height:1.65}.ai-page>section,.portfolio-factory-page>section:not(:first-child),main .cms-surface{margin-inline:8px;border-radius:26px;overflow:clip}.site-header{top:max(8px,env(safe-area-inset-top));margin-inline:8px;border:1px solid rgba(255,255,255,.08);border-radius:18px}.site-footer.footer-reimagined{margin:8px;border-radius:28px 28px 18px 18px;overflow:hidden}.footer-stage{padding-inline:4px}.footer-wordmark{font-size:clamp(2.5rem,15vw,4.4rem)!important}.footer-mobile-panels details{border-color:rgba(184,215,197,.14)!important;background:rgba(255,255,255,.025);border-radius:16px;padding-inline:12px}.fabrick-social-end{margin:0 8px 8px;padding:18px 14px calc(18px + env(safe-area-inset-bottom));border:1px solid rgba(184,215,197,.12);border-radius:18px;display:grid}.fabrick-social-end nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.fabrick-social-end nav a{padding:10px 8px}.ambient-audio{right:10px!important;bottom:calc(10px + env(safe-area-inset-bottom))!important;max-width:calc(100vw - 20px)}.ambient-audio__volume{display:none!important}button,a,[role="button"]{touch-action:manipulation}input,select,textarea{font-size:16px!important}}
@media(prefers-reduced-motion:reduce){[data-fabrick-reveal="true"]{opacity:1!important;transform:none!important;filter:none!important;transition:none!important}.ambient-audio__levels i{animation:none!important}}
@media(prefers-contrast:more){.site-footer.footer-reimagined,.fabrick-social-end{background:#050808!important}.footer-reimagined a,.fabrick-social-end a{border-color:rgba(255,255,255,.45)}}
`
