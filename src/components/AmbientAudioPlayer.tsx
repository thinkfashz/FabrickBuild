'use client'

import { Music2, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const MUTED_KEY = 'fabrick-ambient-muted'
const VOLUME_KEY = 'fabrick-ambient-volume'
const DEFAULT_VOLUME = 0.5
const BPM = 124
const BEAT = 60 / BPM
const BAR = BEAT * 4

const CHORDS = [[261.63, 329.63, 392], [293.66, 369.99, 440], [220, 277.18, 329.63], [246.94, 311.13, 369.99]]
const BASS = [65.41, 73.42, 55, 61.74]

export function AmbientAudioPlayer() {
  const contextRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const compressorRef = useRef<DynamicsCompressorNode | null>(null)
  const timerRef = useRef<number | null>(null)
  const nextBarRef = useRef(0)
  const barIndexRef = useRef(0)
  const startedRef = useRef(false)
  const desiredPlayingRef = useRef(false)
  const volumeRef = useRef(DEFAULT_VOLUME)
  const mutedRef = useRef(false)
  const [muted, setMuted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(DEFAULT_VOLUME)

  const destination = (context: AudioContext) => compressorRef.current || masterRef.current || context.destination

  function tone(context: AudioContext, frequency: number, startsAt: number, duration: number, level: number, type: OscillatorType = 'sine') {
    const oscillator = context.createOscillator(); const gain = context.createGain()
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, startsAt)
    gain.gain.setValueAtTime(0.0001, startsAt); gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), startsAt + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration)
    oscillator.connect(gain); gain.connect(destination(context)); oscillator.start(startsAt); oscillator.stop(startsAt + duration + 0.03)
  }

  function kick(context: AudioContext, startsAt: number, level = 0.25) {
    const oscillator = context.createOscillator(); const gain = context.createGain()
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(138, startsAt); oscillator.frequency.exponentialRampToValueAtTime(46, startsAt + 0.17)
    gain.gain.setValueAtTime(level, startsAt); gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.25)
    oscillator.connect(gain); gain.connect(destination(context)); oscillator.start(startsAt); oscillator.stop(startsAt + 0.27)
  }

  function noise(context: AudioContext, startsAt: number, duration: number, level: number, cutoff = 6200) {
    const buffer = context.createBuffer(1, Math.max(1, Math.round(context.sampleRate * duration)), context.sampleRate)
    const channel = buffer.getChannelData(0); for (let index = 0; index < channel.length; index += 1) channel[index] = Math.random() * 2 - 1
    const source = context.createBufferSource(); const filter = context.createBiquadFilter(); const gain = context.createGain()
    source.buffer = buffer; filter.type = 'highpass'; filter.frequency.value = cutoff
    gain.gain.setValueAtTime(level, startsAt); gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration)
    source.connect(filter); filter.connect(gain); gain.connect(destination(context)); source.start(startsAt)
  }

  function scheduleBar() {
    const context = contextRef.current; if (!context) return
    const start = nextBarRef.current; const chordIndex = barIndexRef.current % CHORDS.length; const chord = CHORDS[chordIndex]; const bass = BASS[chordIndex]
    for (let beat = 0; beat < 4; beat += 1) kick(context, start + beat * BEAT, beat === 0 ? 0.28 : 0.23)
    for (let step = 0; step < 16; step += 1) noise(context, start + step * (BEAT / 4), 0.035, step % 4 === 2 ? 0.018 : 0.007, step % 2 ? 7200 : 5400)
    ;[1.5, 3.5].forEach((position) => noise(context, start + position * BEAT, 0.12, 0.04, 1600))
    ;[0, 0.75, 1.5, 2.5, 3.25].forEach((position, index) => tone(context, bass * (index === 4 ? 2 : 1), start + position * BEAT, 0.26, 0.07, 'triangle'))
    ;[0.25, 1, 1.75, 2.25, 3, 3.5].forEach((position, index) => { const note = chord[(index + barIndexRef.current) % chord.length]; tone(context, note, start + position * BEAT, 0.16, 0.045, 'sine'); tone(context, note * 2, start + position * BEAT, 0.09, 0.015, 'triangle') })
    nextBarRef.current += BAR; barIndexRef.current += 1
  }

  function applyMasterLevel(nextMuted = mutedRef.current, nextVolume = volumeRef.current) {
    const context = contextRef.current; const master = masterRef.current; if (!context || !master) return
    const now = context.currentTime; master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now); master.gain.exponentialRampToValueAtTime(nextMuted ? 0.0001 : Math.max(0.0001, nextVolume), now + 0.1)
  }

  async function ensureRunning() {
    const context = contextRef.current
    if (!context || !desiredPlayingRef.current || mutedRef.current) return
    try { if (context.state !== 'running') await context.resume(); setPlaying(context.state === 'running') } catch { setPlaying(false) }
  }

  async function startMusic(forceUnmuted = false) {
    if (startedRef.current) { desiredPlayingRef.current = true; await ensureRunning(); return }
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass({ latencyHint: 'interactive' }); const master = context.createGain(); const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -18; compressor.knee.value = 10; compressor.ratio.value = 4; compressor.attack.value = 0.003; compressor.release.value = 0.16
    compressor.connect(master); master.connect(context.destination)
    const savedMuted = forceUnmuted ? false : window.localStorage.getItem(MUTED_KEY) === 'true'; const savedVolume = Number(window.localStorage.getItem(VOLUME_KEY)); const initialVolume = Number.isFinite(savedVolume) ? Math.min(1, Math.max(0, savedVolume)) : DEFAULT_VOLUME
    mutedRef.current = savedMuted; volumeRef.current = initialVolume; desiredPlayingRef.current = true; master.gain.value = savedMuted ? 0.0001 : initialVolume
    contextRef.current = context; masterRef.current = master; compressorRef.current = compressor; nextBarRef.current = context.currentTime + 0.01; barIndexRef.current = 0; startedRef.current = true
    setMuted(savedMuted); setVolume(initialVolume); await context.resume(); setPlaying(context.state === 'running' && !savedMuted)
    scheduleBar(); scheduleBar(); timerRef.current = window.setInterval(() => { while (nextBarRef.current < context.currentTime + BAR * 1.25) scheduleBar() }, 180)
  }

  useEffect(() => {
    const savedMuted = window.localStorage.getItem(MUTED_KEY) === 'true'; const savedVolume = Number(window.localStorage.getItem(VOLUME_KEY)); const initialVolume = Number.isFinite(savedVolume) ? Math.min(1, Math.max(0, savedVolume)) : DEFAULT_VOLUME
    mutedRef.current = savedMuted; volumeRef.current = initialVolume; setMuted(savedMuted); setVolume(initialVolume)
    const onConsent = () => void startMusic(true)
    const recover = () => { if (!document.hidden) void ensureRunning() }
    window.addEventListener('fabrick:consent', onConsent)
    window.addEventListener('pageshow', recover)
    window.addEventListener('focus', recover)
    window.addEventListener('pointerdown', recover, { passive: true })
    document.addEventListener('visibilitychange', recover)
    return () => { window.removeEventListener('fabrick:consent', onConsent); window.removeEventListener('pageshow', recover); window.removeEventListener('focus', recover); window.removeEventListener('pointerdown', recover); document.removeEventListener('visibilitychange', recover); if (timerRef.current) window.clearInterval(timerRef.current); void contextRef.current?.close() }
  }, [])

  async function toggleMusic() {
    if (!startedRef.current) { mutedRef.current = false; desiredPlayingRef.current = true; window.localStorage.setItem(MUTED_KEY, 'false'); setMuted(false); await startMusic(true); return }
    const nextMuted = !mutedRef.current; mutedRef.current = nextMuted; desiredPlayingRef.current = !nextMuted; setMuted(nextMuted); setPlaying(!nextMuted); window.localStorage.setItem(MUTED_KEY, String(nextMuted)); applyMasterLevel(nextMuted); if (!nextMuted) await ensureRunning()
  }

  function changeVolume(next: number) {
    const normalized = Math.min(1, Math.max(0, next)); volumeRef.current = normalized; setVolume(normalized); window.localStorage.setItem(VOLUME_KEY, String(normalized))
    if (normalized > 0 && mutedRef.current) { mutedRef.current = false; desiredPlayingRef.current = true; setMuted(false); window.localStorage.setItem(MUTED_KEY, 'false'); void ensureRunning() }
    applyMasterLevel(false, normalized)
  }

  return <div className="ambient-audio" data-playing={playing && !muted ? 'true' : 'false'}><button type="button" className="ambient-audio__button" onClick={() => void toggleMusic()} aria-label={muted ? 'Activar música afro house' : 'Silenciar música afro house'} aria-pressed={muted}><span className="ambient-audio__icon" aria-hidden="true">{!playing ? <Music2 size={17} /> : muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</span><span className="ambient-audio__copy"><small>AFRO HOUSE</small><strong>{!playing ? 'Acepta privacidad para activar' : muted ? 'Música en silencio' : `Energía ${Math.round(volume * 100)}%`}</strong></span><span className="ambient-audio__levels" aria-hidden="true"><i /><i /><i /></span></button><label className="ambient-audio__volume" aria-label="Volumen de la música"><Volume2 size={14} aria-hidden="true" /><input type="range" min="0" max="100" step="1" value={Math.round(volume * 100)} onChange={(event) => changeVolume(Number(event.target.value) / 100)} /><span>{Math.round(volume * 100)}%</span></label></div>
}
