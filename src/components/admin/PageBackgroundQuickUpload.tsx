'use client'

import { useField } from '@payloadcms/ui'
import { ImagePlus, LoaderCircle, Video } from 'lucide-react'
import { useRef, useState } from 'react'

type Appearance = Record<string, unknown>
type Target = 'desktop' | 'mobile'

const MAX_BYTES = 190 * 1024

const optimize = async (source: CanvasImageSource, width: number, height: number, name: string): Promise<File> => {
  let scale = Math.min(1, 1600 / Math.max(width, height, 1))
  let quality = .82
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(2, Math.round(width * scale))
    canvas.height = Math.max(2, Math.round(height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('El navegador no pudo preparar la imagen.')
    context.drawImage(source, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
    if (blob && blob.size <= MAX_BYTES) return new File([blob], `${name}.webp`, { type: 'image/webp' })
    quality = quality > .48 ? quality - .08 : .82
    if (quality === .82) scale *= .82
  }
  throw new Error('No se pudo optimizar el archivo bajo 190 KB. Prueba un archivo más pequeño.')
}

const uploadFrame = async (file: File, target: Target, order: number, collectionKey: string) => {
  const form = new FormData()
  form.append('file', file)
  form.append('_payload', JSON.stringify({ alt: file.name.replace(/\.[^.]+$/, ''), category: 'frame', device: target, frameOrder: order, collectionKey, storageFolder: `frames/${collectionKey}` }))
  const response = await fetch('/api/media', { method: 'POST', body: form, credentials: 'include' })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.doc?.id) throw new Error(result?.errors?.[0]?.message || `No se pudo subir ${file.name}.`)
  return result.doc
}

const metadata = (video: HTMLVideoElement) => new Promise<void>((resolve, reject) => {
  video.onloadedmetadata = () => resolve()
  video.onerror = () => reject(new Error('Vídeo no compatible. Usa MP4/H.264 o WebM.'))
})
const seek = (video: HTMLVideoElement, time: number) => new Promise<void>((resolve, reject) => {
  const done = () => resolve()
  video.addEventListener('seeked', done, { once: true })
  video.addEventListener('error', () => reject(new Error('No se pudo leer un frame del vídeo.')), { once: true })
  video.currentTime = time
})

/** Upload a page background without leaving the native Payload page form. */
export default function PageBackgroundQuickUpload() {
  const { value, setValue } = useField<Appearance>({ path: 'pageAppearance' })
  const imageInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const [frames, setFrames] = useState(24)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const apply = (background: Record<string, unknown>) => setValue({ ...(value || {}), backgroundMode: 'image', savedBackground: background, backgroundMedia: undefined, surfaceOpacity: 0, overlayOpacity: 22, backgroundFit: 'cover' })

  async function useImage(file?: File) {
    if (!file || busy) return
    setBusy(true); setMessage('Optimizando y subiendo imagen…')
    const url = URL.createObjectURL(file)
    try {
      const image = new Image()
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('No se pudo abrir la imagen.')); image.src = url })
      const optimized = await optimize(image, image.naturalWidth, image.naturalHeight, file.name.replace(/\.[^.]+$/, ''))
      const target: Target = image.naturalHeight > image.naturalWidth ? 'mobile' : 'desktop'
      const media = await uploadFrame(optimized, target, 1, `page-${Date.now()}`)
      apply({ id: `page-image-${media.id}`, name: file.name, kind: 'image', image: media })
      setMessage(`Imagen optimizada (${Math.round(optimized.size / 1024)} KB) y aplicada. Guarda la página para publicar.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo subir la imagen.') }
    finally { URL.revokeObjectURL(url); setBusy(false); if (imageInput.current) imageInput.current.value = '' }
  }

  async function useVideo(file?: File) {
    if (!file || busy) return
    setBusy(true); setMessage(`Extrayendo ${frames} frames WebP…`)
    const url = URL.createObjectURL(file); const video = document.createElement('video')
    video.muted = true; video.playsInline = true; video.preload = 'auto'; video.src = url
    try {
      await metadata(video)
      const target: Target = video.videoHeight > video.videoWidth ? 'mobile' : 'desktop'
      const key = `page-${file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now()}`
      const docs: Array<Record<string, unknown>> = []
      for (let index = 0; index < frames; index += 1) {
        await seek(video, Math.min(video.duration - .04, Math.max(.01, (video.duration * index) / Math.max(1, frames - 1))))
        const frame = await optimize(video, video.videoWidth, video.videoHeight, `${key}-${String(index + 1).padStart(3, '0')}`)
        docs.push(await uploadFrame(frame, target, index + 1, key))
        setMessage(`Generando y subiendo ${index + 1}/${frames} frames WebP (máx. 190 KB)…`)
      }
      const payload = { name: file.name.replace(/\.[^.]+$/, ''), kind: 'frames', device: target, status: 'ready', desktopFrames: target === 'desktop' ? docs.map((doc) => doc.id) : [], mobileFrames: target === 'mobile' ? docs.map((doc) => doc.id) : [], poster: docs[0]?.id, playback: { trigger: 'scroll', fit: 'cover', scrub: .32, pin: true, overlayOpacity: 22 } }
      const response = await fetch('/api/backgrounds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.doc) throw new Error(result?.errors?.[0]?.message || 'Los frames se subieron, pero no se pudo crear el background.')
      apply(result.doc)
      setMessage(`Secuencia lista: ${frames} frames WebP y ScrollTrigger configurado. Guarda la página para publicarla.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo procesar el vídeo.') }
    finally { URL.revokeObjectURL(url); video.removeAttribute('src'); video.load(); setBusy(false); if (videoInput.current) videoInput.current.value = '' }
  }

  return <section className="page-background-quick-upload">
    <div><strong>Subir background desde esta página</strong><p>Optimiza imágenes y transforma vídeo en una secuencia ScrollTrigger reutilizable, sin salir del editor.</p></div>
    <label>Frames de vídeo<select value={frames} disabled={busy} onChange={(event) => setFrames(Number(event.target.value))}>{[12, 24, 36, 48, 60].map((count) => <option key={count} value={count}>{count} frames</option>)}</select></label>
    <div className="page-background-quick-upload__actions"><button type="button" disabled={busy} onClick={() => imageInput.current?.click()}><ImagePlus size={16} /> Imagen optimizada</button><button type="button" disabled={busy} onClick={() => videoInput.current?.click()}><Video size={16} /> Vídeo → frames</button></div>
    <input ref={imageInput} hidden type="file" accept="image/*" onChange={(event) => void useImage(event.target.files?.[0])} />
    <input ref={videoInput} hidden type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => void useVideo(event.target.files?.[0])} />
    {(busy || message) && <p className="page-background-quick-upload__status">{busy && <LoaderCircle size={15} />} {message}</p>}
    <style jsx>{`.page-background-quick-upload{margin:18px 0;padding:16px;border:1px solid color-mix(in srgb,var(--theme-elevation-150) 68%,#ff1f35 32%);border-radius:14px;background:linear-gradient(135deg,color-mix(in srgb,var(--theme-elevation-50) 92%,#ff1f35 8%),var(--theme-elevation-50));display:grid;gap:12px}.page-background-quick-upload strong{display:block;font-size:16px}.page-background-quick-upload p{margin:5px 0 0;color:var(--theme-elevation-600);line-height:1.45}.page-background-quick-upload label{display:grid;gap:6px;max-width:240px;font-size:12px;font-weight:700}.page-background-quick-upload select{padding:9px;border:1px solid var(--theme-elevation-250);border-radius:8px;background:var(--theme-input-bg);color:var(--theme-text)}.page-background-quick-upload__actions{display:flex;gap:10px;flex-wrap:wrap}.page-background-quick-upload button{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:8px;padding:11px 14px;background:var(--theme-elevation-800);color:#fff;font-weight:700;cursor:pointer}.page-background-quick-upload button:last-child{background:#b5122b}.page-background-quick-upload button:disabled{opacity:.55;cursor:wait}.page-background-quick-upload__status{display:flex;align-items:center;gap:7px}@media(max-width:720px){.page-background-quick-upload button{width:100%;justify-content:center;min-height:44px}.page-background-quick-upload__actions{display:grid}}`}</style>
  </section>
}
