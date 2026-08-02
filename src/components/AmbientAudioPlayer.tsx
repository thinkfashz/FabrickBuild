'use client'

import { LoaderCircle, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { LICENSED_TRACK } from '@/lib/licensedMusic'

const ENABLED_KEY = 'fabrick-ambient-enabled'
const DEFAULT_VOLUME = 0.5

function readEnabled() {
  try {
    return window.localStorage.getItem(ENABLED_KEY) === 'true'
  } catch {
    return false
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
  const desiredPlayingRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  async function start({ remember = true }: { remember?: boolean } = {}) {
    const audio = audioRef.current
    if (!audio) return

    desiredPlayingRef.current = true
    audio.volume = DEFAULT_VOLUME
    setFailed(false)
    setLoading(true)

    try {
      if (audio.networkState === HTMLMediaElement.NETWORK_EMPTY) audio.load()
      await audio.play()
      setPlaying(true)
      if (remember) writeEnabled(true)
    } catch {
      setPlaying(false)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  function stop({ remember = true }: { remember?: boolean } = {}) {
    desiredPlayingRef.current = false
    audioRef.current?.pause()
    setPlaying(false)
    setLoading(false)
    if (remember) writeEnabled(false)
  }

  useEffect(() => {
    const enabled = readEnabled()
    desiredPlayingRef.current = enabled

    const audio = audioRef.current
    if (audio) audio.volume = DEFAULT_VOLUME

    const onConsent = () => {
      if (desiredPlayingRef.current) void start({ remember: false })
    }

    const onVisibility = () => {
      const current = audioRef.current
      if (!current) return

      if (document.hidden) {
        current.pause()
        setPlaying(false)
      } else if (desiredPlayingRef.current) {
        void current.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
      }
    }

    window.addEventListener('fabrick:consent', onConsent)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('fabrick:consent', onConsent)
      document.removeEventListener('visibilitychange', onVisibility)
    }
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
      : `Reproducir ${LICENSED_TRACK.displayTitle}`

  return (
    <div
      className="ambient-audio ambient-audio--compact"
      data-playing={playing ? 'true' : 'false'}
      data-loading={loading ? 'true' : 'false'}
      data-failed={failed ? 'true' : 'false'}
    >
      <audio
        ref={audioRef}
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
          setPlaying(true)
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
          <LoaderCircle className="ambient-audio__spinner" size={17} />
        ) : failed ? (
          <RotateCcw size={16} />
        ) : playing ? (
          <Pause size={17} />
        ) : (
          <Play size={17} />
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
