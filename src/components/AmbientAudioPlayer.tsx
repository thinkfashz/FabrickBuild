'use client'

import { LoaderCircle, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { LICENSED_TRACK } from '@/lib/licensedMusic'

const ENABLED_KEY = 'fabrick-ambient-enabled'
const DEFAULT_VOLUME = 0.42
const FADE_DURATION = 900

function readPreference(): boolean | null {
  try {
    const stored = window.localStorage.getItem(ENABLED_KEY)
    if (stored === null) return null
    return stored === 'true'
  } catch {
    return null
  }
}

function writeEnabled(value: boolean) {
  try {
    window.localStorage.setItem(ENABLED_KEY, String(value))
  } catch {
    // El audio continúa aunque el navegador bloquee localStorage.
  }
}

export function AmbientAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const desiredPlayingRef = useRef(true)
  const fadeFrameRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [primed, setPrimed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  function stopFade() {
    if (fadeFrameRef.current) {
      window.cancelAnimationFrame(fadeFrameRef.current)
      fadeFrameRef.current = 0
    }
  }

  function fadeVolume(audio: HTMLAudioElement, target: number, duration = FADE_DURATION) {
    stopFade()
    const startedAt = performance.now()
    const initial = audio.volume

    const tick = (time: number) => {
      const progress = Math.min(1, (time - startedAt) / Math.max(1, duration))
      const eased = 1 - Math.pow(1 - progress, 3)
      audio.volume = initial + (target - initial) * eased

      if (progress < 1) {
        fadeFrameRef.current = window.requestAnimationFrame(tick)
      } else {
        fadeFrameRef.current = 0
      }
    }

    fadeFrameRef.current = window.requestAnimationFrame(tick)
  }

  async function start({ remember = true, quietFailure = false }: { remember?: boolean; quietFailure?: boolean } = {}) {
    const audio = audioRef.current
    if (!audio) return false

    desiredPlayingRef.current = true
    setFailed(false)
    setLoading(true)

    try {
      if (audio.networkState === HTMLMediaElement.NETWORK_EMPTY) audio.load()
      audio.muted = false
      audio.volume = 0
      await audio.play()
      fadeVolume(audio, DEFAULT_VOLUME)
      setPrimed(true)
      setPlaying(true)
      if (remember) writeEnabled(true)
      return true
    } catch {
      setPlaying(false)
      if (!quietFailure) setFailed(true)
      return false
    } finally {
      setLoading(false)
    }
  }

  function stop({ remember = true }: { remember?: boolean } = {}) {
    const audio = audioRef.current
    desiredPlayingRef.current = false
    stopFade()

    if (audio) {
      audio.pause()
      audio.muted = false
      audio.volume = DEFAULT_VOLUME
    }

    setPlaying(false)
    setLoading(false)
    if (remember) writeEnabled(false)
  }

  useEffect(() => {
    const preference = readPreference()
    desiredPlayingRef.current = preference !== false

    const audio = audioRef.current
    if (!audio) return

    let unlocked = false
    let disposed = false

    const prepareMutedPlayback = async () => {
      if (!desiredPlayingRef.current || disposed) return

      try {
        audio.muted = true
        audio.volume = 0
        if (audio.networkState === HTMLMediaElement.NETWORK_EMPTY) audio.load()
        await audio.play()
        if (!disposed) setPrimed(true)
      } catch {
        // El primer gesto del visitante volverá a intentar la reproducción.
      }
    }

    const unlockAudio = async () => {
      if (unlocked || !desiredPlayingRef.current || document.hidden) return
      const started = await start({ remember: true, quietFailure: true })
      if (started) unlocked = true
    }

    const onConsent = () => {
      if (desiredPlayingRef.current) void unlockAudio()
    }

    const onVisibility = () => {
      if (document.hidden) {
        audio.pause()
        setPlaying(false)
        return
      }

      if (desiredPlayingRef.current && unlocked) {
        audio.muted = false
        audio.volume = DEFAULT_VOLUME
        void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
      }
    }

    void prepareMutedPlayback()

    window.addEventListener('pointerdown', unlockAudio, { passive: true, capture: true })
    window.addEventListener('touchstart', unlockAudio, { passive: true, capture: true })
    window.addEventListener('keydown', unlockAudio, { capture: true })
    window.addEventListener('fabrick:consent', onConsent)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      disposed = true
      stopFade()
      window.removeEventListener('pointerdown', unlockAudio, true)
      window.removeEventListener('touchstart', unlockAudio, true)
      window.removeEventListener('keydown', unlockAudio, true)
      window.removeEventListener('fabrick:consent', onConsent)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // La reproducción se controla mediante refs para no reinstalar los listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function togglePlayback() {
    if (playing) {
      stop()
      return
    }
    await start()
  }

  const label = failed
    ? `Reintentar ${LICENSED_TRACK.displayTitle}`
    : playing
      ? `Pausar ${LICENSED_TRACK.displayTitle}`
      : `Activar ${LICENSED_TRACK.displayTitle}`

  return (
    <div
      className="ambient-audio ambient-audio--compact"
      data-playing={playing ? 'true' : 'false'}
      data-primed={primed ? 'true' : 'false'}
      data-loading={loading ? 'true' : 'false'}
      data-failed={failed ? 'true' : 'false'}
    >
      <audio
        ref={audioRef}
        autoPlay
        muted
        loop
        preload="none"
        playsInline
        onCanPlay={() => {
          setLoading(false)
          setFailed(false)
        }}
        onWaiting={() => setLoading(true)}
        onPlaying={() => {
          setLoading(false)
          if (!audioRef.current?.muted) setPlaying(true)
        }}
        onPause={() => setPlaying(false)}
        onError={() => {
          setLoading(false)
          setFailed(true)
          setPlaying(false)
        }}
      >
        {LICENSED_TRACK.sources.map((source) => (
          <source key={source.src} src={source.src} type={source.type} />
        ))}
      </audio>

      <button
        type="button"
        onClick={() => void togglePlayback()}
        aria-label={label}
        aria-pressed={playing}
        title={label}
      >
        {loading ? (
          <LoaderCircle className="ambient-audio__spinner" size={15} />
        ) : failed ? (
          <RotateCcw size={14} />
        ) : playing ? (
          <Pause size={15} />
        ) : (
          <Play size={15} />
        )}
        <span className="ambient-audio__levels" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>
    </div>
  )
}
