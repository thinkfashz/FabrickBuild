'use client'

import { useField } from '@payloadcms/ui'
import { useEffect, useMemo, useRef, useState } from 'react'

type UploadTarget = 'desktopFrames' | 'mobileFrames'
type UploadStage = 'idle' | 'preparing' | 'extracting' | 'uploading' | 'syncing' | 'ready' | 'error'

type Props = {
  path?: string
}

type PreviewFile = {
  file: File
  url: string
  order: number
}

const naturalSort = (files: File[]) =>
  [...files].sort((a, b) => {
    const pathA = a.webkitRelativePath || a.name
    const pathB = b.webkitRelativePath || b.name
    return pathA.localeCompare(pathB, undefined, { numeric: true, sensitivity: 'base' })
  })

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'secuencia'

const cleanName = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()

const detectedGroupName = (files: File[]) => {
  const first = files[0]
  const folder = first?.webkitRelativePath?.split('/').filter(Boolean)[0]
  if (folder) return slugify(folder)
  return slugify(cleanName(first?.name || 'secuencia').replace(/\s*\d+\s*$/, '').trim())
}

const stageOrder: UploadStage[] = ['preparing', 'extracting', 'uploading', 'syncing', 'ready']
const stageLabel: Record<UploadStage, string> = {
  idle: 'Esperando archivos',
  preparing: 'Preparando',
  extracting: 'Generando frames',
  uploading: 'Enviando a Multimedia / Blob',
  syncing: 'Relacionando la secuencia',
  ready: 'Aplicación correcta',
  error: 'Revisión requerida',
}

const waitForEvent = (target: EventTarget, event: string) =>
  new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error(`Tiempo agotado esperando ${event}.`))
    }, 15_000)
    const done = () => {
      cleanup()
      resolve()
    }
    const fail = () => {
      cleanup()
      reject(new Error('No fue posible leer el video seleccionado.'))
    }
    const cleanup = () => {
      window.clearTimeout(timeout)
      target.removeEventListener(event, done)
      target.removeEventListener('error', fail)
    }
    target.addEventListener(event, done, { once: true })
    target.addEventListener('error', fail, { once: true })
  })

export default function FrameFolderUploader({ path = 'frameUploader' }: Props) {
  const folderInput = useRef<HTMLInputElement | null>(null)
  const imageInput = useRef<HTMLInputElement | null>(null)
  const videoInput = useRef<HTMLInputElement | null>(null)
  const previewRef = useRef<PreviewFile[]>([])
  const [target, setTarget] = useState<UploadTarget>('mobileFrames')
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState<UploadStage>('idle')
  const [progress, setProgress] = useState(0)
  const [processed, setProcessed] = useState(0)
  const [total, setTotal] = useState(0)
  const [message, setMessage] = useState('Selecciona una carpeta, imágenes o un video para comenzar.')
  const [preview, setPreview] = useState<PreviewFile[]>([])
  const [folderName, setFolderName] = useState('secuencia-portafolio')
  const [frameAmount, setFrameAmount] = useState(60)
  const desktop = useField<unknown[]>({ path: 'desktopFrames' })
  const mobile = useField<unknown[]>({ path: 'mobileFrames' })
  const backgroundStatus = useField<string>({ path: 'status' })

  const activeField = target === 'desktopFrames' ? desktop : mobile
  const targetLabel = target === 'desktopFrames' ? 'Web / escritorio' : 'Móvil vertical'
  const device = target === 'desktopFrames' ? 'desktop' : 'mobile'
  const storageFolder = `frames/${slugify(folderName)}/${device}`
  const existingIDs = useMemo(() => {
    const value = Array.isArray(activeField.value) ? activeField.value : []
    return value.map((item: any) => (typeof item === 'object' && item ? item.id : item)).filter(Boolean)
  }, [activeField.value])

  useEffect(() => {
    previewRef.current = preview
  }, [preview])

  useEffect(() => () => {
    previewRef.current.forEach((item) => URL.revokeObjectURL(item.url))
  }, [])

  function clearPreview(resetMessage = true) {
    previewRef.current.forEach((item) => URL.revokeObjectURL(item.url))
    previewRef.current = []
    setPreview([])
    setProcessed(0)
    setTotal(0)
    setProgress(0)
    if (resetMessage) {
      setStage('idle')
      setMessage('Selecciona una carpeta, imágenes o un video para comenzar.')
    }
  }

  function setPreparedFiles(files: File[], sourceLabel: string) {
    const sorted = naturalSort(files.filter((file) => file.type.startsWith('image/')))
    if (!sorted.length) throw new Error('La selección no contiene imágenes compatibles.')
    clearPreview(false)
    const group = detectedGroupName(sorted)
    setFolderName(group)
    const next = sorted.map((file, index) => ({ file, url: URL.createObjectURL(file), order: index + 1 }))
    previewRef.current = next
    setPreview(next)
    setTotal(next.length)
    setProcessed(0)
    setProgress(5)
    setStage('preparing')
    setMessage(`${next.length} frames detectados desde ${sourceLabel}. Revisa el orden y la carpeta virtual antes de enviar.`)
  }

  function prepare(filesList: FileList | null) {
    if (!filesList?.length || busy) return
    try {
      setPreparedFiles(Array.from(filesList), 'la selección')
    } catch (error) {
      setStage('error')
      setMessage(error instanceof Error ? error.message : 'No fue posible preparar las imágenes.')
    }
  }

  async function extractFramesFromVideo(file: File) {
    if (busy) return
    setBusy(true)
    setStage('extracting')
    setProgress(1)
    setProcessed(0)
    setTotal(frameAmount)
    setFolderName(slugify(cleanName(file.name)))
    backgroundStatus.setValue('processing')
    setMessage(`Analizando ${file.name} y preparando ${frameAmount} frames…`)

    const video = document.createElement('video')
    const source = URL.createObjectURL(file)
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.src = source

    try {
      await waitForEvent(video, 'loadedmetadata')
      if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('El video no tiene una duración válida.')

      const maxWidth = target === 'mobileFrames' ? 1080 : 1600
      const scale = Math.min(1, maxWidth / Math.max(1, video.videoWidth))
      const width = Math.max(2, Math.round(video.videoWidth * scale))
      const height = Math.max(2, Math.round(video.videoHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { alpha: false })
      if (!context) throw new Error('El navegador no permitió crear el generador de frames.')
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'

      const files: File[] = []
      for (let index = 0; index < frameAmount; index += 1) {
        const ratio = frameAmount <= 1 ? 0 : index / (frameAmount - 1)
        const nextTime = Math.min(Math.max(0, video.duration - 0.01), video.duration * ratio)
        if (Math.abs(video.currentTime - nextTime) > 0.002) {
          video.currentTime = nextTime
          await waitForEvent(video, 'seeked')
        }
        context.drawImage(video, 0, 0, width, height)
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((result) => result ? resolve(result) : reject(new Error('No fue posible convertir un frame.')), 'image/webp', 0.78)
        })
        const number = String(index + 1).padStart(3, '0')
        files.push(new File([blob], `frame_${number}.webp`, { type: 'image/webp', lastModified: Date.now() }))
        setProcessed(index + 1)
        setProgress(Math.round(((index + 1) / frameAmount) * 30))
        setMessage(`Generando frames: ${index + 1} de ${frameAmount}`)
      }

      setPreparedFiles(files, `el video ${file.name}`)
      setProgress(32)
      setStage('preparing')
      setMessage(`${files.length} frames WebP generados. Pulsa “Enviar y aplicar” para guardarlos en Multimedia / Blob.`)
    } catch (error) {
      backgroundStatus.setValue('draft')
      setStage('error')
      setMessage(error instanceof Error ? error.message : 'No fue posible generar los frames del video.')
    } finally {
      URL.revokeObjectURL(source)
      video.removeAttribute('src')
      video.load()
      setBusy(false)
      if (videoInput.current) videoInput.current.value = ''
    }
  }

  async function uploadOne(file: File, index: number) {
    const payload = {
      alt: `${cleanName(file.name)} — ${folderName}`,
      category: 'frame',
      device,
      frameOrder: index + 1,
      collectionKey: slugify(folderName),
      storageFolder,
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
    return result.doc.id as string | number
  }

  async function upload() {
    if (!preview.length || busy) return
    const files = preview.map((item) => item.file)
    const uploadedIDs: Array<string | number> = new Array(files.length)
    let cursor = 0
    let completed = 0
    let firstError: Error | null = null

    setBusy(true)
    setStage('uploading')
    setProgress(34)
    setProcessed(0)
    setTotal(files.length)
    backgroundStatus.setValue('processing')
    setMessage(`Enviando ${files.length} frames a ${storageFolder}…`)

    const worker = async () => {
      while (!firstError) {
        const index = cursor
        cursor += 1
        if (index >= files.length) return
        try {
          uploadedIDs[index] = await uploadOne(files[index], index)
          completed += 1
          setProcessed(completed)
          setProgress(34 + Math.round((completed / files.length) * 58))
          setMessage(`Envío confirmado: ${completed} de ${files.length} · ${storageFolder}`)
        } catch (error) {
          firstError = error instanceof Error ? error : new Error('Ocurrió un error durante la carga.')
        }
      }
    }

    try {
      const workerCount = Math.min(files.length, window.matchMedia('(max-width: 720px)').matches ? 2 : 4)
      await Promise.all(Array.from({ length: workerCount }, () => worker()))
      if (firstError) throw firstError

      setStage('syncing')
      setProgress(96)
      setMessage('Relacionando los documentos de Multimedia con el background…')
      activeField.setValue([...existingIDs, ...uploadedIDs.filter(Boolean)])
      backgroundStatus.setValue('ready')
      setProgress(100)
      setStage('ready')
      setMessage(`${uploadedIDs.length} frames guardados y aplicados correctamente. Carpeta virtual: ${storageFolder}. Guarda el background para confirmar la relación.`)
      clearPreview(false)
      setProgress(100)
      setProcessed(uploadedIDs.length)
      setTotal(uploadedIDs.length)
    } catch (error) {
      backgroundStatus.setValue('processing')
      setStage('error')
      setMessage(error instanceof Error ? error.message : 'Ocurrió un error durante la carga.')
    } finally {
      setBusy(false)
      if (folderInput.current) folderInput.current.value = ''
      if (imageInput.current) imageInput.current.value = ''
    }
  }

  const currentStageIndex = stageOrder.indexOf(stage)

  return (
    <section className="frame-folder-uploader" data-path={path} data-stage={stage}>
      <div className="frame-folder-uploader__head">
        <div>
          <span className="kicker">CREADOR DE BACKGROUNDS</span>
          <strong>Video, carpeta o secuencia de imágenes</strong>
          <p>Genera frames WebP desde el navegador o selecciona una secuencia existente. El envío se realiza con concurrencia limitada y cada archivo queda agrupado en Multimedia mediante una carpeta virtual.</p>
        </div>
        <select value={target} onChange={(event) => setTarget(event.target.value as UploadTarget)} disabled={busy}>
          <option value="mobileFrames">Móvil vertical</option>
          <option value="desktopFrames">Web / escritorio</option>
        </select>
      </div>

      <div className="frame-folder-uploader__settings">
        <label><span>Carpeta / grupo</span><input value={folderName} onChange={(event) => setFolderName(slugify(event.target.value))} disabled={busy} /></label>
        <label><span>Frames desde video</span><input type="number" min={12} max={180} step={1} value={frameAmount} onChange={(event) => setFrameAmount(Math.min(180, Math.max(12, Number(event.target.value) || 60)))} disabled={busy} /></label>
        <div><span>Destino organizado</span><code>{storageFolder}</code></div>
      </div>

      <div className="frame-folder-uploader__actions">
        <button type="button" disabled={busy} onClick={() => videoInput.current?.click()}>Subir video y generar</button>
        <button type="button" disabled={busy} onClick={() => folderInput.current?.click()}>Subir carpeta</button>
        <button type="button" disabled={busy} onClick={() => imageInput.current?.click()}>Seleccionar imágenes</button>
        {preview.length > 0 && <button type="button" className="primary" disabled={busy} onClick={() => void upload()}>Enviar y aplicar</button>}
        {preview.length > 0 && <button type="button" className="ghost" disabled={busy} onClick={() => clearPreview()}>Cancelar</button>}
      </div>

      <input ref={(element) => { folderInput.current = element; element?.setAttribute('webkitdirectory', ''); element?.setAttribute('directory', '') }} hidden type="file" multiple accept="image/*" onChange={(event) => prepare(event.target.files)} />
      <input ref={imageInput} hidden type="file" multiple accept="image/*" onChange={(event) => prepare(event.target.files)} />
      <input ref={videoInput} hidden type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => { const file = event.target.files?.[0]; if (file) void extractFramesFromVideo(file) }} />

      <div className="frame-folder-uploader__pipeline" aria-label="Estado del proceso">
        {stageOrder.map((item, index) => (
          <span key={item} data-active={stage === item} data-complete={currentStageIndex > index || stage === 'ready'}>
            <i>{currentStageIndex > index || stage === 'ready' ? '✓' : index + 1}</i>{stageLabel[item]}
          </span>
        ))}
      </div>

      {preview.length > 0 && (
        <div className="frame-folder-uploader__preview" aria-label="Vista previa del orden de frames">
          {preview.slice(0, 48).map((item) => (
            <figure key={`${item.file.name}-${item.order}`}>
              <img src={item.url} alt="" />
              <figcaption><b>{String(item.order).padStart(3, '0')}</b><span>{item.file.name}</span></figcaption>
            </figure>
          ))}
          {preview.length > 48 && <div className="more">+{preview.length - 48} frames</div>}
        </div>
      )}

      <div className={`frame-folder-uploader__status status--${stage}`} role="status" aria-live="polite">
        <div><strong>{stageLabel[stage]}</strong><span>{processed}/{total || preview.length || 0}</span></div>
        <progress max={100} value={progress} />
        <p>{message}</p>
      </div>

      <style jsx>{`
        .frame-folder-uploader{border:1px solid var(--theme-elevation-150);border-radius:18px;padding:clamp(16px,3vw,24px);margin:8px 0 22px;background:linear-gradient(145deg,var(--theme-elevation-50),color-mix(in srgb,var(--theme-elevation-100) 84%,#8d1730 16%));box-shadow:0 18px 55px rgba(0,0,0,.08)}
        .frame-folder-uploader__head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.kicker{display:block;margin-bottom:7px;color:#d33b58;font-size:10px;font-weight:900;letter-spacing:.14em}strong{display:block;font-size:18px;margin-bottom:6px}p{margin:0;max-width:820px;color:var(--theme-elevation-600);line-height:1.55}
        select,input{min-height:42px;padding:9px 11px;border:1px solid var(--theme-elevation-250);border-radius:9px;background:var(--theme-input-bg);color:var(--theme-text)}select{min-width:190px}.frame-folder-uploader__settings{display:grid;grid-template-columns:1fr 160px minmax(220px,1fr);gap:10px;margin-top:18px}.frame-folder-uploader__settings label,.frame-folder-uploader__settings>div{display:grid;gap:6px}.frame-folder-uploader__settings span{color:var(--theme-elevation-600);font-size:11px;font-weight:750}.frame-folder-uploader__settings code{display:flex;align-items:center;min-height:42px;padding:9px 11px;overflow:hidden;border:1px solid var(--theme-elevation-150);border-radius:9px;background:var(--theme-elevation-100);font-size:11px;text-overflow:ellipsis;white-space:nowrap}
        .frame-folder-uploader__actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:17px}button{border:1px solid var(--theme-elevation-250);border-radius:9px;padding:11px 14px;cursor:pointer;background:var(--theme-elevation-800);color:#fff;font-weight:750}button.primary{border-color:#e8b928;background:#e8b928;color:#111}button.ghost{background:transparent;color:var(--theme-text)}button:disabled{opacity:.55;cursor:wait}
        .frame-folder-uploader__pipeline{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:18px}.frame-folder-uploader__pipeline span{display:flex;align-items:center;gap:7px;min-height:44px;padding:7px 9px;border:1px solid var(--theme-elevation-150);border-radius:9px;color:var(--theme-elevation-500);background:var(--theme-elevation-50);font-size:10px;font-weight:700}.frame-folder-uploader__pipeline i{display:grid;place-items:center;width:22px;height:22px;flex:none;border-radius:50%;background:var(--theme-elevation-150);font-style:normal}.frame-folder-uploader__pipeline span[data-active=true]{border-color:#d33b58;color:var(--theme-text);box-shadow:0 0 0 2px color-mix(in srgb,#d33b58 18%,transparent)}.frame-folder-uploader__pipeline span[data-active=true] i{background:#d33b58;color:#fff}.frame-folder-uploader__pipeline span[data-complete=true] i{background:var(--theme-success-500);color:#fff}
        .frame-folder-uploader__preview{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px;margin-top:16px;max-height:380px;overflow:auto;padding:9px;border-radius:11px;background:var(--theme-elevation-100)}figure{margin:0;min-width:0;border-radius:8px;overflow:hidden;background:var(--theme-elevation-50)}img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover}figcaption{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px;padding:7px;font-size:9px}figcaption span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.more{display:grid;place-items:center;min-height:96px;font-weight:800}
        .frame-folder-uploader__status{display:grid;gap:8px;margin-top:15px;padding:13px;border:1px solid var(--theme-elevation-150);border-radius:11px;background:var(--theme-elevation-50)}.frame-folder-uploader__status>div{display:flex;justify-content:space-between;gap:12px}.frame-folder-uploader__status>div strong{margin:0;font-size:13px}.frame-folder-uploader__status>div span{font-size:11px}.frame-folder-uploader__status p{font-size:12px}.status--ready{border-color:color-mix(in srgb,var(--theme-success-500) 58%,var(--theme-elevation-150));background:color-mix(in srgb,var(--theme-success-100) 45%,var(--theme-elevation-50))}.status--error{border-color:var(--theme-error-500)}progress{width:100%;height:9px;accent-color:#d33b58}
        @media(max-width:760px){.frame-folder-uploader__head{flex-direction:column}select,button,input{width:100%}.frame-folder-uploader__settings{grid-template-columns:1fr}.frame-folder-uploader__actions{display:grid;grid-template-columns:1fr}.frame-folder-uploader__pipeline{grid-template-columns:1fr 1fr}.frame-folder-uploader__pipeline span:last-child{grid-column:1/-1}.frame-folder-uploader__preview{grid-template-columns:repeat(3,minmax(0,1fr));padding:6px;gap:5px}figcaption span{display:none}}
      `}</style>
    </section>
  )
}
