'use client'

import { useField } from '@payloadcms/ui'
import { useMemo, useRef, useState } from 'react'

type UploadTarget = 'desktopFrames' | 'mobileFrames'

type Props = {
  path?: string
}

type PreviewFile = {
  file: File
  url: string
  order: number
}

const MAX_FRAME_BYTES = 190 * 1024

const webpName = (name: string) => `${name.replace(/\.[^.]+$/, '') || 'frame'}.webp`

async function openImage(file: File) {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error(`No se pudo procesar ${file.name}`))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function asWebP(file: File, maxEdge: number): Promise<File> {
  if (file.type === 'image/webp' && file.size <= MAX_FRAME_BYTES) return file
  const image = await openImage(file)
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight)
  let scale = Math.min(1, maxEdge / Math.max(1, longestSide))
  let quality = 0.82
  let output: Blob | null = null

  // The loop gives a practical hard ceiling for cellular use while retaining
  // enough detail for a canvas sequence. It falls back gracefully on browsers
  // that do not support WebP encoding.
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const width = Math.max(2, Math.round(image.naturalWidth * scale))
    const height = Math.max(2, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('El navegador no pudo preparar el canvas de optimización.')
    context.drawImage(image, 0, 0, width, height)
    output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
    if (!output) return file
    if (output.size <= MAX_FRAME_BYTES) break
    if (quality > 0.48) quality = Math.max(0.48, quality - 0.09)
    else { scale *= 0.82; quality = 0.76 }
  }
  return output ? new File([output], webpName(file.name), { type: 'image/webp', lastModified: file.lastModified }) : file
}

const videoMetadata = (video: HTMLVideoElement) => new Promise<void>((resolve, reject) => {
  video.onloadedmetadata = () => resolve()
  video.onerror = () => reject(new Error('No se pudo leer este vídeo. Usa MP4/H.264 o un vídeo compatible con el navegador.'))
})

const seekVideo = (video: HTMLVideoElement, time: number) => new Promise<void>((resolve, reject) => {
  let fail: () => void
  const done = () => { video.removeEventListener('seeked', done); video.removeEventListener('error', fail); resolve() }
  fail = () => { video.removeEventListener('seeked', done); video.removeEventListener('error', fail); reject(new Error('No se pudo extraer un fotograma del vídeo.')) }
  video.addEventListener('seeked', done, { once: true })
  video.addEventListener('error', fail, { once: true })
  video.currentTime = time
})

async function videoFrame(video: HTMLVideoElement, file: File, index: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight, 1))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(2, Math.round(video.videoWidth * scale))
  canvas.height = Math.max(2, Math.round(video.videoHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('El navegador no pudo crear el canvas de vídeo.')
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82))
  if (!blob) throw new Error('No se pudo convertir este vídeo a WebP.')
  const name = `${cleanName(file.name).replace(/\s+/g, '-')}-${String(index + 1).padStart(3, '0')}.webp`
  return asWebP(new File([blob], name, { type: 'image/webp', lastModified: file.lastModified }), maxEdge)
}

const naturalSort = (files: File[]) =>
  [...files].sort((a, b) => {
    const pathA = a.webkitRelativePath || a.name
    const pathB = b.webkitRelativePath || b.name
    return pathA.localeCompare(pathB, undefined, { numeric: true, sensitivity: 'base' })
  })

const cleanName = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()

const groupName = (files: File[]) => {
  const first = files[0]
  const folder = first?.webkitRelativePath?.split('/').filter(Boolean)[0]
  if (folder) return folder
  return cleanName(first?.name || 'secuencia').replace(/\s*\d+\s*$/, '').trim() || 'secuencia'
}

export default function FrameFolderUploader({ path = 'frameUploader' }: Props) {
  const folderInput = useRef<HTMLInputElement | null>(null)
  const imageInput = useRef<HTMLInputElement | null>(null)
  const videoInput = useRef<HTMLInputElement | null>(null)
  const [target, setTarget] = useState<UploadTarget>('desktopFrames')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<PreviewFile[]>([])
  const [album, setAlbum] = useState('secuencia')
  const desktop = useField<unknown[]>({ path: 'desktopFrames' })
  const mobile = useField<unknown[]>({ path: 'mobileFrames' })

  const activeField = target === 'desktopFrames' ? desktop : mobile
  const targetLabel = target === 'desktopFrames' ? 'Web / escritorio' : 'Móvil vertical'
  const existingIDs = useMemo(() => {
    const value = Array.isArray(activeField.value) ? activeField.value : []
    return value.map((item: any) => (typeof item === 'object' && item ? item.id : item)).filter(Boolean)
  }, [activeField.value])

  function clearPreview() {
    preview.forEach((item) => URL.revokeObjectURL(item.url))
    setPreview([])
  }

  async function prepare(filesList: FileList | null) {
    if (!filesList?.length || busy) return
    const files = naturalSort(Array.from(filesList).filter((file) => file.type.startsWith('image/')))
    if (!files.length) {
      setMessage('La selección no contiene imágenes compatibles.')
      return
    }

    setBusy(true)
    setMessage(`Optimizando ${files.length} imágenes a WebP para que cada frame use hasta 190 KB…`)
    const sourceAlbum = groupName(files)
    try {
      const optimized: File[] = []
      const maxEdge = target === 'desktopFrames' ? 1920 : 1080
      for (let index = 0; index < files.length; index += 1) {
        optimized.push(await asWebP(files[index], maxEdge))
        setProgress(Math.round(((index + 1) / files.length) * 100))
      }
      clearPreview()
      setAlbum(sourceAlbum)
      setPreview(optimized.map((file, index) => ({ file, url: URL.createObjectURL(file), order: index + 1 })))
      const totalKB = Math.round(optimized.reduce((total, file) => total + file.size, 0) / 1024)
      setMessage(`${optimized.length} frames listos para ${targetLabel} en el álbum “${sourceAlbum}” (${totalKB} KB en total). Revisa el orden y pulsa “Subir y organizar”.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudieron optimizar las imágenes seleccionadas.')
    } finally {
      setBusy(false)
    }
  }

  async function prepareVideo(file: File | null) {
    if (!file || busy) return
    if (!file.type.startsWith('video/')) {
      setMessage('Selecciona un vídeo compatible, idealmente MP4/H.264.')
      return
    }
    setBusy(true)
    setProgress(0)
    setMessage('Leyendo el vídeo y preparando hasta 61 fotogramas WebP…')
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.src = url
    video.load()
    try {
      await videoMetadata(video)
      if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('El vídeo no tiene una duración válida.')
      const count = Math.min(61, Math.max(2, Math.ceil(video.duration)))
      const frames: File[] = []
      const maxEdge = target === 'desktopFrames' ? 1920 : 1080
      for (let index = 0; index < count; index += 1) {
        const time = count === 1 ? 0 : Math.min(video.duration - 0.04, Math.max(0.01, (video.duration * index) / (count - 1)))
        await seekVideo(video, time)
        frames.push(await videoFrame(video, file, index, maxEdge))
        setProgress(Math.round(((index + 1) / count) * 100))
      }
      clearPreview()
      const sourceAlbum = cleanName(file.name).replace(/\s+/g, '-').toLowerCase() || 'video-secuencia'
      setAlbum(sourceAlbum)
      setPreview(frames.map((frameFile, index) => ({ file: frameFile, url: URL.createObjectURL(frameFile), order: index + 1 })))
      const totalKB = Math.round(frames.reduce((total, frameFile) => total + frameFile.size, 0) / 1024)
      setMessage(`${frames.length} frames extraídos de “${file.name}” en el álbum “${sourceAlbum}” (${totalKB} KB). Revisa y súbelos cuando estés listo.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudieron extraer los fotogramas del vídeo.')
    } finally {
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      video.load()
      setBusy(false)
      if (videoInput.current) videoInput.current.value = ''
    }
  }

  async function upload() {
    if (!preview.length || busy) return
    const files = preview.map((item) => item.file)
    const collectionKey = album || groupName(files)

    setBusy(true)
    setProgress(0)
    setMessage(`Subiendo ${files.length} frames para ${targetLabel}…`)

    try {
      const uploadedIDs: Array<string | number> = []
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const payload = {
          alt: cleanName(file.name),
          category: 'frame',
          device: target === 'desktopFrames' ? 'desktop' : 'mobile',
          frameOrder: index + 1,
          collectionKey,
          storageFolder: `frames/${collectionKey}`,
        }
        const form = new FormData()
        form.append('file', file)
        form.append('_payload', JSON.stringify(payload))

        const response = await fetch('/api/media', {
          method: 'POST',
          body: form,
          credentials: 'include',
        })
        const result = await response.json().catch(() => null)
        if (!response.ok || !result?.doc?.id) {
          throw new Error(result?.errors?.[0]?.message || `No se pudo subir ${file.name}`)
        }

        uploadedIDs.push(result.doc.id)
        setProgress(Math.round(((index + 1) / files.length) * 100))
      }

      activeField.setValue([...existingIDs, ...uploadedIDs])
      setMessage(`${uploadedIDs.length} frames cargados y numerados del 1 al ${uploadedIDs.length}. Guarda el background para fijar el orden final.`)
      clearPreview()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ocurrió un error durante la carga.')
    } finally {
      setBusy(false)
      if (folderInput.current) folderInput.current.value = ''
      if (imageInput.current) imageInput.current.value = ''
    }
  }

  return (
    <section className="frame-folder-uploader" data-path={path}>
      <div className="frame-folder-uploader__head">
        <div>
          <strong>Carga automatizada de frames</strong>
          <p>Selecciona primero Web o Móvil. Puedes subir una carpeta completa o imágenes sueltas; el sistema aplica orden natural y luego numera la secuencia sin saltos.</p>
        </div>
        <select value={target} onChange={(event) => setTarget(event.target.value as UploadTarget)} disabled={busy}>
          <option value="desktopFrames">Web / escritorio</option>
          <option value="mobileFrames">Móvil vertical</option>
        </select>
      </div>

      <div className="frame-folder-uploader__actions">
        <button type="button" disabled={busy} onClick={() => folderInput.current?.click()}>Subir carpeta</button>
        <button type="button" disabled={busy} onClick={() => imageInput.current?.click()}>Seleccionar imágenes</button>
        <button type="button" disabled={busy} onClick={() => videoInput.current?.click()}>Extraer vídeo (hasta 61 frames)</button>
        {preview.length > 0 && <button type="button" className="primary" disabled={busy} onClick={() => void upload()}>Subir y organizar</button>}
        {preview.length > 0 && <button type="button" className="ghost" disabled={busy} onClick={clearPreview}>Cancelar</button>}
      </div>

      <input ref={(element) => { folderInput.current = element; element?.setAttribute('webkitdirectory', ''); element?.setAttribute('directory', '') }} hidden type="file" multiple accept="image/*" onChange={(event) => { void prepare(event.target.files) }} />
      <input ref={imageInput} hidden type="file" multiple accept="image/*" onChange={(event) => { void prepare(event.target.files) }} />
      <input ref={videoInput} hidden type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => { void prepareVideo(event.target.files?.[0] || null) }} />

      {preview.length > 0 && (
        <div className="frame-folder-uploader__preview" aria-label="Vista previa del orden de frames">
          {preview.slice(0, 60).map((item) => (
            <figure key={`${item.file.name}-${item.order}`}>
              <img src={item.url} alt="" />
              <figcaption><b>{String(item.order).padStart(3, '0')}</b><span>{item.file.name}</span></figcaption>
            </figure>
          ))}
          {preview.length > 60 && <div className="more">+{preview.length - 60} frames</div>}
        </div>
      )}

      {(busy || message) && <div className="frame-folder-uploader__status" role="status">{busy && <progress max={100} value={progress} />}<span>{message}</span></div>}

      <style jsx>{`
        .frame-folder-uploader{border:1px solid color-mix(in srgb,var(--theme-elevation-150) 74%,#f4c84b 26%);border-radius:16px;padding:clamp(12px,3vw,20px);margin:8px 0 22px;background:linear-gradient(135deg,color-mix(in srgb,var(--theme-elevation-50) 93%,#f4c84b 7%),var(--theme-elevation-50));box-shadow:0 12px 28px rgba(0,0,0,.05)}
        .frame-folder-uploader__head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px} strong{display:block;font-size:16px;margin-bottom:5px} p{margin:0;max-width:760px;color:var(--theme-elevation-600);line-height:1.5}
        select{min-width:190px;padding:10px 12px;border:1px solid var(--theme-elevation-250);border-radius:8px;background:var(--theme-input-bg);color:var(--theme-text)}
        .frame-folder-uploader__actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px} button{border:0;border-radius:8px;padding:11px 15px;cursor:pointer;background:var(--theme-elevation-800);color:#fff;font-weight:700} button.primary{background:#c99b19;color:#111} button.ghost{background:transparent;color:var(--theme-text);border:1px solid var(--theme-elevation-250)} button:disabled{opacity:.55;cursor:wait}
        .frame-folder-uploader__preview{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px;margin-top:18px;max-height:430px;overflow:auto;padding:10px;border-radius:10px;background:var(--theme-elevation-100)} figure{margin:0;min-width:0;border-radius:8px;overflow:hidden;background:var(--theme-elevation-50)} img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover} figcaption{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px;padding:7px;font-size:10px} figcaption span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.more{display:grid;place-items:center;min-height:100px;font-weight:800}
        .frame-folder-uploader__status{display:grid;gap:8px;margin-top:14px;color:var(--theme-elevation-700)} progress{width:100%;height:8px}
        @media(max-width:720px){.frame-folder-uploader__head{flex-direction:column}select,button{width:100%;min-height:44px}.frame-folder-uploader__actions{display:grid}.frame-folder-uploader__preview{grid-template-columns:repeat(3,minmax(0,1fr));padding:6px;gap:6px}figcaption span{display:none}}
      `}</style>
    </section>
  )
}
