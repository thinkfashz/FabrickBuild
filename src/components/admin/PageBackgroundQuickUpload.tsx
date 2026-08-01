'use client'

import { useField } from '@payloadcms/ui'
import { ImagePlus, LoaderCircle, Video } from 'lucide-react'
import { useRef, useState } from 'react'

type Appearance = Record<string, unknown>
type Target = 'desktop' | 'mobile'
type MediaDoc = { id: string | number; [key: string]: unknown }
type BackgroundDoc = { id: string | number; [key: string]: unknown }

const MAX_BYTES = 190 * 1024
const FRAME_PRESETS = [24, 60, 80, 120]

const optimize = async (source: CanvasImageSource, width: number, height: number, name: string): Promise<File> => {
  let scale = Math.min(1, 1600 / Math.max(width, height, 1))
  let quality = 0.82

  for (let attempt = 0; attempt < 18; attempt += 1) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(2, Math.round(width * scale))
    canvas.height = Math.max(2, Math.round(height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('El navegador no pudo preparar la imagen.')
    context.drawImage(source, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
    if (blob && blob.size <= MAX_BYTES) return new File([blob], `${name}.webp`, { type: 'image/webp' })
    quality = quality > 0.46 ? quality - 0.07 : 0.82
    if (quality === 0.82) scale *= 0.82
  }

  throw new Error('No se pudo optimizar el frame bajo 190 KB. Prueba un video de menor resolución.')
}

async function uploadMedia(file: File, data: Record<string, unknown>): Promise<MediaDoc> {
  const form = new FormData()
  form.append('file', file)
  form.append('_payload', JSON.stringify(data))
  const response = await fetch('/api/media', { method: 'POST', body: form, credentials: 'include' })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.doc?.id) {
    throw new Error(result?.errors?.[0]?.message || `No se pudo subir ${file.name}.`)
  }
  return result.doc as MediaDoc
}

async function createBackground(data: Record<string, unknown>): Promise<BackgroundDoc> {
  const response = await fetch('/api/backgrounds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.doc?.id) {
    throw new Error(result?.errors?.[0]?.message || 'Los archivos se subieron, pero no se pudo crear el Background.')
  }
  return result.doc as BackgroundDoc
}

const metadata = (video: HTMLVideoElement) => new Promise<void>((resolve, reject) => {
  video.onloadedmetadata = () => resolve()
  video.onerror = () => reject(new Error('Video no compatible. Usa MP4/H.264, WebM o MOV reproducible por el navegador.'))
})

const seek = (video: HTMLVideoElement, time: number) => new Promise<void>((resolve, reject) => {
  const done = () => resolve()
  video.addEventListener('seeked', done, { once: true })
  video.addEventListener('error', () => reject(new Error('No se pudo leer un frame del video.')), { once: true })
  video.currentTime = time
})

const cleanKey = (value: string) =>
  value
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

/** Genera un Background reutilizable directamente desde el editor de la página. */
export default function PageBackgroundQuickUpload() {
  const sourceField = useField<string>({ path: 'backgroundSource' })
  const savedBackgroundField = useField<string | number | null>({ path: 'savedBackground' })
  const appearanceField = useField<Appearance>({ path: 'pageAppearance' })
  const imageInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const [frames, setFrames] = useState(60)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const apply = (background: BackgroundDoc) => {
    sourceField.setValue('saved')
    savedBackgroundField.setValue(background.id)
    appearanceField.setValue({
      ...(appearanceField.value || {}),
      surfaceMode: 'transparent',
      overlayOpacity: 0,
      backgroundFit: 'cover',
    })
  }

  async function useImage(file?: File) {
    if (!file || busy) return
    setBusy(true)
    setMessage('Optimizando y subiendo la imagen…')
    const url = URL.createObjectURL(file)

    try {
      const image = new Image()
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('No se pudo abrir la imagen.'))
        image.src = url
      })
      const optimized = await optimize(image, image.naturalWidth, image.naturalHeight, cleanKey(file.name) || 'background')
      const target: Target = image.naturalHeight > image.naturalWidth ? 'mobile' : 'desktop'
      const media = await uploadMedia(optimized, {
        alt: file.name.replace(/\.[^.]+$/, ''),
        category: 'background',
        device: target,
        storageFolder: 'backgrounds',
      })
      const background = await createBackground({
        name: file.name.replace(/\.[^.]+$/, ''),
        kind: 'image',
        device: target,
        status: 'ready',
        category: 'hero',
        image: media.id,
      })
      apply(background)
      setMessage(`Imagen optimizada (${Math.round(optimized.size / 1024)} KB), guardada en Backgrounds y asignada a esta página.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo subir la imagen.')
    } finally {
      URL.revokeObjectURL(url)
      setBusy(false)
      if (imageInput.current) imageInput.current.value = ''
    }
  }

  async function useVideo(file?: File) {
    if (!file || busy) return
    const requestedFrames = Math.max(2, Math.round(Number(frames) || 60))
    setFrames(requestedFrames)
    setBusy(true)
    setMessage(`Preparando ${requestedFrames} frames WebP…`)
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = url

    try {
      await metadata(video)
      if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('El video no tiene una duración válida.')
      const target: Target = video.videoHeight > video.videoWidth ? 'mobile' : 'desktop'
      const key = `page-${cleanKey(file.name) || 'video'}-${Date.now()}`
      const ids: Array<string | number> = []

      for (let index = 0; index < requestedFrames; index += 1) {
        const time = Math.min(
          Math.max(0.01, video.duration - 0.04),
          Math.max(0.01, (video.duration * index) / Math.max(1, requestedFrames - 1)),
        )
        await seek(video, time)
        const frame = await optimize(
          video,
          video.videoWidth,
          video.videoHeight,
          `${key}-${String(index + 1).padStart(Math.max(3, String(requestedFrames).length), '0')}`,
        )
        const media = await uploadMedia(frame, {
          alt: `${file.name.replace(/\.[^.]+$/, '')} · frame ${index + 1}`,
          category: 'frame',
          device: target,
          frameOrder: index + 1,
          collectionKey: key,
          storageFolder: `frames/${key}`,
        })
        ids.push(media.id)
        setMessage(`Generando y subiendo ${index + 1}/${requestedFrames} frames WebP…`)
      }

      const background = await createBackground({
        name: file.name.replace(/\.[^.]+$/, ''),
        kind: 'frames',
        device: target,
        status: 'ready',
        category: 'hero',
        desktopFrames: target === 'desktop' ? ids : [],
        mobileFrames: target === 'mobile' ? ids : [],
        poster: ids[0],
        engine: 'gsap-canvas',
        playback: {
          trigger: 'scroll',
          fit: 'cover',
          scrub: 0.32,
          pin: true,
          snap: false,
          scrollLength: Math.min(1500, Math.max(500, Math.round(requestedFrames * 10))),
          overlayOpacity: 22,
        },
      })
      apply(background)
      setMessage(`Secuencia lista: ${requestedFrames} frames ordenados, Background creado y asignado. Guarda o publica la página.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo procesar el video.')
    } finally {
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      video.load()
      setBusy(false)
      if (videoInput.current) videoInput.current.value = ''
    }
  }

  return (
    <section className="page-background-quick-upload">
      <div>
        <strong>Background desde esta página</strong>
        <p>Sube una imagen o convierte un video en una secuencia reutilizable. La cantidad no está limitada a 60: escribe 80, 120 o la cifra que necesites.</p>
      </div>

      <div className="page-background-quick-upload__frame-control">
        <label>
          Cantidad de frames
          <input
            type="number"
            min={2}
            step={1}
            value={frames}
            disabled={busy}
            onChange={(event) => setFrames(Math.max(2, Math.round(Number(event.target.value) || 2)))}
          />
        </label>
        <div className="page-background-quick-upload__presets">
          {FRAME_PRESETS.map((count) => (
            <button type="button" className={frames === count ? 'active' : ''} disabled={busy} key={count} onClick={() => setFrames(count)}>
              {count}
            </button>
          ))}
        </div>
      </div>

      <p className="page-background-quick-upload__note">Más frames producen una transición más fina, pero necesitan más tiempo de procesamiento, almacenamiento y carga progresiva.</p>

      <div className="page-background-quick-upload__actions">
        <button type="button" disabled={busy} onClick={() => imageInput.current?.click()}><ImagePlus size={16} /> Imagen optimizada</button>
        <button type="button" disabled={busy} onClick={() => videoInput.current?.click()}><Video size={16} /> Video → frames</button>
      </div>
      <input ref={imageInput} hidden type="file" accept="image/*" onChange={(event) => void useImage(event.target.files?.[0])} />
      <input ref={videoInput} hidden type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => void useVideo(event.target.files?.[0])} />
      {(busy || message) && <p className="page-background-quick-upload__status">{busy && <LoaderCircle size={15} className="spin" />} {message}</p>}

      <style jsx>{`
        .page-background-quick-upload{margin:18px 0;padding:16px;border:1px solid color-mix(in srgb,var(--theme-elevation-150) 68%,#f1bf36 32%);border-radius:14px;background:linear-gradient(135deg,color-mix(in srgb,var(--theme-elevation-50) 92%,#f1bf36 8%),var(--theme-elevation-50));display:grid;gap:13px}
        .page-background-quick-upload strong{display:block;font-size:16px}.page-background-quick-upload p{margin:5px 0 0;color:var(--theme-elevation-600);line-height:1.48}
        .page-background-quick-upload__frame-control{display:flex;align-items:end;gap:12px;flex-wrap:wrap}.page-background-quick-upload label{display:grid;gap:6px;min-width:180px;font-size:12px;font-weight:750}.page-background-quick-upload input[type=number]{padding:10px;border:1px solid var(--theme-elevation-250);border-radius:8px;background:var(--theme-input-bg);color:var(--theme-text)}
        .page-background-quick-upload__presets{display:flex;gap:7px;flex-wrap:wrap}.page-background-quick-upload__presets button{min-width:48px;padding:9px 10px;background:transparent;color:var(--theme-text);border:1px solid var(--theme-elevation-250)}.page-background-quick-upload__presets button.active{background:#d4a51d;color:#15120b;border-color:#d4a51d}
        .page-background-quick-upload__note{font-size:12px}.page-background-quick-upload__actions{display:flex;gap:10px;flex-wrap:wrap}.page-background-quick-upload button{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:8px;padding:11px 14px;background:var(--theme-elevation-800);color:#fff;font-weight:750;cursor:pointer}.page-background-quick-upload__actions button:last-child{background:#b48712}.page-background-quick-upload button:disabled{opacity:.55;cursor:wait}
        .page-background-quick-upload__status{display:flex;align-items:center;gap:7px}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:720px){.page-background-quick-upload__frame-control,.page-background-quick-upload__actions{display:grid}.page-background-quick-upload label,.page-background-quick-upload button{width:100%;min-height:44px}.page-background-quick-upload__presets{display:grid;grid-template-columns:repeat(4,1fr)}}
      `}</style>
    </section>
  )
}
