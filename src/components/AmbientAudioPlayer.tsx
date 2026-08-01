'use client'

import { Music2, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'fabrick-ambient-muted'
const BPM = 104
const BEAT = 60 / BPM
const BAR_DURATION = BEAT * 4
const TARGET_VOLUME = 0.16

const CHORDS = [
  [261.63, 329.63, 392],
  [220, 261.63, 329.63],
  [174.61, 220, 261.63],
  [196, 246.94, 293.66],
]
const BASS_ROOTS = [65.41, 55, 43.65, 49]

export function AmbientAudioPlayer() {
  const contextRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const compressorRef = useRef<DynamicsCompressorNode | null>(null)
  const timerRef = useRef<number | null>(null)
  const nextBarRef = useRef(0)
  const barIndexRef = useRef(0)
  const startedRef = useRef(false)
  const [muted, setMuted] = useState(false)
  const [playing, setPlaying] = useState(false)

  function tone(
    context: AudioContext,
    frequency: number,
    startsAt: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
  ) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, startsAt)
    gain.gain.setValueAtTime(0.0001, startsAt)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), startsAt + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration)
    oscillator.connect(gain)
    gain.connect(compressorRef.current || masterRef.current || context.destination)
    oscillator.start(startsAt)
    oscillator.stop(startsAt + duration + 0.03)
  }

  function kick(context: AudioContext, startsAt: number, volume = 0.18) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(118, startsAt)
    oscillator.frequency.exponentialRampToValueAtTime(46, startsAt + 0.16)
    gain.gain.setValueAtTime(volume, startsAt)
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.22)
    oscillator.connect(gain)
    gain.connect(compressorRef.current || masterRef.current || context.destination)
    oscillator.start(startsAt)
    oscillator.stop(startsAt + 0.24)
  }

  function noise(context: AudioContext, startsAt: number, duration: number, volume: number) {
    const frameCount = Math.max(1, Math.round(context.sampleRate * duration))
    const buffer = context.createBuffer(1, frameCount, context.sampleRate)
    const channel = buffer.getChannelData(0)
    for (let index = 0; index < frameCount; index += 1) channel[index] = Math.random() * 2 - 1

    const source = context.createBufferSource()
    const highpass = context.createBiquadFilter()
    const gain = context.createGain()
    source.buffer = buffer
    highpass.type = 'highpass'
    highpass.frequency.value = 5200
    gain.gain.setValueAtTime(volume, startsAt)
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration)
    source.connect(highpass)
    highpass.connect(gain)
    gain.connect(compressorRef.current || masterRef.current || context.destination)
    source.start(startsAt)
  }

  function scheduleBar() {
    const context = contextRef.current
    if (!context) return

    const start = nextBarRef.current
    const chordIndex = barIndexRef.current % CHORDS.length
    const chord = CHORDS[chordIndex]
    const bassRoot = BASS_ROOTS[chordIndex]

    kick(context, start, 0.2)
    kick(context, start + BEAT * 2, 0.15)

    for (let step = 0; step < 8; step += 1) {
      noise(context, start + step * (BEAT / 2), 0.045, step % 2 ? 0.012 : 0.017)
    }

    ;[1, 1.5, 3, 3.5].forEach((position, index) => {
      tone(context, index % 2 ? 270 : 215, start + position * BEAT, 0.16, 0.045, 'sine')
    })

    ;[0, 1.5, 2, 3].forEach((position, index) => {
      tone(context, bassRoot * (index === 2 ? 1.5 : 1), start + position * BEAT, 0.34, 0.055, 'triangle')
    })

    const melodyPattern = [0, 1, 2, 1, 0, 2, 1, 2]
    melodyPattern.forEach((noteIndex, step) => {
      const octave = step === 7 && barIndexRef.current % 2 ? 2 : 1
      tone(context, chord[noteIndex] * octave, start + step * (BEAT / 2), 0.28, 0.04, 'triangle')
    })

    nextBarRef.current += BAR_DURATION
    barIndexRef.current += 1
  }

  function setMasterLevel(nextMuted: boolean) {
    const context = contextRef.current
    const master = masterRef.current
    if (!context || !master) return
    const now = context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now)
    master.gain.exponentialRampToValueAtTime(nextMuted ? 0.0001 : TARGET_VOLUME, now + 0.45)
  }

  async function startMusic(forceUnmuted = false) {
    if (startedRef.current) {
      const context = contextRef.current
      if (context?.state === 'suspended') await context.resume()
      return
    }

    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const context = new AudioContextClass()
    const master = context.createGain()
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -18
    compressor.knee.value = 18
    compressor.ratio.value = 4
    compressor.attack.value = 0.01
    compressor.release.value = 0.24
    master.connect(context.destination)
    compressor.connect(master)

    const savedMuted = forceUnmuted ? false : window.localStorage.getItem(STORAGE_KEY) === 'true'
    master.gain.value = savedMuted ? 0.0001 : TARGET_VOLUME
    contextRef.current = context
    masterRef.current = master
    compressorRef.current = compressor
    nextBarRef.current = context.currentTime + 0.06
    barIndexRef.current = 0
    startedRef.current = true
    setMuted(savedMuted)
    setPlaying(true)

    scheduleBar()
    scheduleBar()
    timerRef.current = window.setInterval(() => {
      while (nextBarRef.current < context.currentTime + BAR_DURATION * 1.7) scheduleBar()
    }, 420)
  }

  useEffect(() => {
    const savedMuted = window.localStorage.getItem(STORAGE_KEY) === 'true'
    setMuted(savedMuted)

    const begin = () => void startMusic()
    const handleVisibility = () => {
      const context = contextRef.current
      if (!context) return
      if (document.hidden) void context.suspend()
      else if (startedRef.current) void context.resume()
    }

    window.addEventListener('pointerdown', begin, { once: true, passive: true })
    window.addEventListener('keydown', begin, { once: true })
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('pointerdown', begin)
      window.removeEventListener('keydown', begin)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (timerRef.current) window.clearInterval(timerRef.current)
      void contextRef.current?.close()
    }
  }, [])

  async function toggleMusic() {
    if (!startedRef.current) {
      window.localStorage.setItem(STORAGE_KEY, 'false')
      setMuted(false)
      await startMusic(true)
      return
    }

    const nextMuted = !muted
    setMuted(nextMuted)
    window.localStorage.setItem(STORAGE_KEY, String(nextMuted))
    setMasterLevel(nextMuted)
  }

  return (
    <div className="ambient-audio" data-playing={playing && !muted ? 'true' : 'false'}>
      <button
        type="button"
        className="ambient-audio__button"
        onClick={() => void toggleMusic()}
        aria-label={muted ? 'Activar música tropical' : 'Silenciar música tropical'}
        aria-pressed={muted}
      >
        <span className="ambient-audio__icon" aria-hidden="true">
          {!playing ? <Music2 size={17} /> : muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </span>
        <span className="ambient-audio__copy">
          <small>AMBIENTE</small>
          <strong>{!playing ? 'Activar música' : muted ? 'Música en silencio' : 'Tropical suave'}</strong>
        </span>
        <span className="ambient-audio__levels" aria-hidden="true"><i /><i /><i /></span>
      </button>
    </div>
  )
}
