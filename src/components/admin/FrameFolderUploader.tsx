'use client'

import { useField } from '@payloadcms/ui'
import { useEffect, useMemo, useRef, useState } from 'react'

type UploadTarget = 'desktopFrames' | 'mobileFrames'
type Provider = 'blob' | 'cloudinary'
type Stage = 'idle' | 'preparing' | 'extracting' | 'uploading' | 'syncing' | 'ready' | 'error'
type PreviewFile = { file: File; url: string; order: number }
type Diagnostic = { title: string; cause: string; solution: string; endpoint?: string; status?: number; file?: string; requestId?: string; raw?: string }
type Props = { path?: string }

const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'secuencia'
const cleanName = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
const naturalSort = (files: File[]) => [...files].sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, undefined, { numeric: true, sensitivity: 'base' }))

function classifyFailure(status: number, message: string, file: string, provider: Provider, requestId?: string): Diagnostic {
  const lower = message.toLowerCase()
  const endpoint = '/api/frame-upload'
  if (status === 401 || status === 403) return { title: 'Sesión o permisos insuficientes', cause: `El servidor rechazó ${file} con HTTP ${status}.`, solution: 'Vuelve a iniciar sesión en el admin y repite el envío.', endpoint, status, file, requestId, raw: message }
  if (status === 413) return { title: 'Frame demasiado grande', cause: `${file} supera el límite de carga.`, solution: 'Reduce la resolución o calidad WebP.', endpoint, status, file, requestId, raw: message }
  if (provider === 'cloudinary' || lower.includes('cloudinary')) return { title: 'Cloudinary rechazó la carga', cause: message, solution: 'Abre Cloudinary en el panel, prueba las credenciales y confirma la carpeta raíz.', endpoint, status, file, requestId, raw: message }
  if (lower.includes('blob') || lower.includes('private')) return { title: 'Vercel Blob rechazó la carga', cause: message, solution: 'Confirma BLOB_READ_WRITE_TOKEN y que el store siga configurado como privado.', endpoint, status, file, requestId, raw: message }
  return { title: 'Error interno del servidor', cause: message || `No se pudo registrar ${file}.`, solution: 'Revisa Sistema y rendimiento y los registros Runtime de Vercel.', endpoint, status, file, requestId, raw: message }
}

const waitForEvent = (target: EventTarget, event: string) => new Promise<void>((resolve, reject) => {
  const timeout = window.setTimeout(() => { cleanup(); reject(new Error(`Tiempo agotado esperando ${event}.`)) }, 15000)
  const done = () => { cleanup(); resolve() }
  const fail = () => { cleanup(); reject(new Error('No fue posible leer el video seleccionado.')) }
  const cleanup = () => { clearTimeout(timeout); target.removeEventListener(event, done); target.removeEventListener('error', fail) }
  target.addEventListener(event, done, { once: true }); target.addEventListener('error', fail, { once: true })
})

export default function FrameFolderUploader({ path = 'frameUploader' }: Props) {
  const folderInput = useRef<HTMLInputElement | null>(null)
  const imageInput = useRef<HTMLInputElement | null>(null)
  const videoInput = useRef<HTMLInputElement | null>(null)
  const previewRef = useRef<PreviewFile[]>([])
  const [target, setTarget] = useState<UploadTarget>('mobileFrames')
  const [provider, setProvider] = useState<Provider>('blob')
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [processed, setProcessed] = useState(0)
  const [total, setTotal] = useState(0)
  const [message, setMessage] = useState('Selecciona una carpeta, imágenes o un video para comenzar.')
  const [preview, setPreview] = useState<PreviewFile[]>([])
  const [folderName, setFolderName] = useState('secuencia-portafolio')
  const [frameAmount, setFrameAmount] = useState(60)
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null)
  const desktop = useField<unknown[]>({ path: 'desktopFrames' })
  const mobile = useField<unknown[]>({ path: 'mobileFrames' })
  const backgroundStatus = useField<string>({ path: 'status' })
  const activeField = target === 'desktopFrames' ? desktop : mobile
  const device = target === 'desktopFrames' ? 'desktop' : 'mobile'
  const storageFolder = `frames/${slugify(folderName)}/${device}`
  const existingIDs = useMemo(() => (Array.isArray(activeField.value) ? activeField.value : []).map((item: any) => typeof item === 'object' && item ? item.id : item).filter(Boolean), [activeField.value])

  useEffect(() => { previewRef.current = preview }, [preview])
  useEffect(() => () => previewRef.current.forEach((item) => URL.revokeObjectURL(item.url)), [])

  function clearPreview(reset = true) {
    previewRef.current.forEach((item) => URL.revokeObjectURL(item.url))
    previewRef.current = []; setPreview([]); setProcessed(0); setTotal(0); setProgress(0)
    if (reset) { setStage('idle'); setDiagnostic(null); setMessage('Selecciona una carpeta, imágenes o un video para comenzar.') }
  }

  function setPreparedFiles(files: File[], source: string) {
    const sorted = naturalSort(files.filter((file) => file.type.startsWith('image/')))
    if (!sorted.length) throw new Error('La selección no contiene imágenes compatibles.')
    clearPreview(false)
    const first = sorted[0]
    const detected = first.webkitRelativePath?.split('/').filter(Boolean)[0] || cleanName(first.name).replace(/\s*\d+\s*$/, '')
    setFolderName(slugify(detected)); setDiagnostic(null)
    const next = sorted.map((file, index) => ({ file, url: URL.createObjectURL(file), order: index + 1 }))
    previewRef.current = next; setPreview(next); setTotal(next.length); setProgress(5); setStage('preparing'); setMessage(`${next.length} frames detectados desde ${source}. Proveedor: ${provider === 'cloudinary' ? 'Cloudinary' : 'Vercel Blob'}.`)
  }

  function prepare(list: FileList | null) {
    if (!list?.length || busy) return
    try { setPreparedFiles(Array.from(list), 'la selección') } catch (error) { setStage('error'); setMessage(error instanceof Error ? error.message : 'No fue posible preparar las imágenes.') }
  }

  async function extractFramesFromVideo(file: File) {
    if (busy) return
    setBusy(true); setDiagnostic(null); setStage('extracting'); setProgress(1); setTotal(frameAmount); backgroundStatus.setValue('processing'); setMessage(`Analizando ${file.name}…`)
    const video = document.createElement('video'); const source = URL.createObjectURL(file); video.preload = 'auto'; video.muted = true; video.playsInline = true; video.src = source
    try {
      await waitForEvent(video, 'loadedmetadata'); if (video.readyState < 2) await waitForEvent(video, 'loadeddata')
      const maxWidth = target === 'mobileFrames' ? 1080 : 1600
      const scale = Math.min(1, maxWidth / Math.max(1, video.videoWidth))
      const width = Math.max(2, Math.round(video.videoWidth * scale)); const height = Math.max(2, Math.round(video.videoHeight * scale))
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
      const context = canvas.getContext('2d', { alpha: false }); if (!context) throw new Error('El navegador no permitió crear el generador de frames.')
      const files: File[] = []
      for (let index = 0; index < frameAmount; index += 1) {
        const ratio = frameAmount <= 1 ? 0 : index / (frameAmount - 1)
        video.currentTime = Math.min(Math.max(0, video.duration - 0.01), video.duration * ratio)
        await waitForEvent(video, 'seeked'); context.drawImage(video, 0, 0, width, height)
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No fue posible convertir un frame.')), 'image/webp', 0.76))
        files.push(new File([blob], `frame_${String(index + 1).padStart(3, '0')}.webp`, { type: 'image/webp' }))
        setProcessed(index + 1); setProgress(Math.round(((index + 1) / frameAmount) * 30))
      }
      setPreparedFiles(files, `el video ${file.name}`); setProgress(32); setMessage(`${files.length} frames WebP generados. Se guardarán en ${provider === 'cloudinary' ? 'Cloudinary' : 'Blob privado'}.`)
    } catch (error) {
      const text = error instanceof Error ? error.message : 'No fue posible generar los frames.'
      setDiagnostic({ title: 'Error al generar frames', cause: text, solution: 'Prueba con MP4/WebM, reduce la cantidad de frames o usa Chrome actualizado.', file: file.name }); setStage('error'); setMessage(text); backgroundStatus.setValue('draft')
    } finally { URL.revokeObjectURL(source); video.removeAttribute('src'); video.load(); setBusy(false) }
  }

  async function uploadOne(file: File, index: number) {
    const form = new FormData(); form.append('file', file)
    form.append('metadata', JSON.stringify({ alt: `${cleanName(file.name)} — ${folderName}`, category: 'frame', device, frameOrder: index + 1, collectionKey: slugify(folderName), caption: `Carpeta virtual: ${storageFolder}`, provider }))
    let response: Response
    try { response = await fetch('/api/frame-upload', { method: 'POST', body: form, credentials: 'include' }) }
    catch (error) { throw { diagnostic: { title: 'No hay conexión con el servidor', cause: error instanceof Error ? error.message : 'Falló la red.', solution: 'Comprueba internet, el deployment y vuelve a enviar.', endpoint: '/api/frame-upload', file: file.name } as Diagnostic } }
    const requestId = response.headers.get('x-vercel-id') || response.headers.get('x-request-id') || undefined
    const text = await response.text(); let result: any = null
    try { result = text ? JSON.parse(text) : null } catch {}
    if (!response.ok || !result?.doc?.id) throw { diagnostic: classifyFailure(response.status, result?.message || text || `HTTP ${response.status}`, file.name, provider, requestId) }
    return result.doc.id as string | number
  }

  async function upload() {
    if (!preview.length || busy) return
    const files = preview.map((item) => item.file); const uploadedIDs: Array<string | number> = new Array(files.length)
    let cursor = 0; let completed = 0; let failure: Diagnostic | null = null
    setBusy(true); setDiagnostic(null); setStage('uploading'); setProgress(34); setProcessed(0); setTotal(files.length); backgroundStatus.setValue('processing'); setMessage(`Enviando ${files.length} frames a ${provider === 'cloudinary' ? 'Cloudinary' : 'Vercel Blob'}…`)
    const worker = async () => { while (!failure) { const index = cursor++; if (index >= files.length) return; try { uploadedIDs[index] = await uploadOne(files[index], index); completed += 1; setProcessed(completed); setProgress(34 + Math.round((completed / files.length) * 58)); setMessage(`Envío confirmado: ${completed} de ${files.length}`) } catch (error: any) { failure = error?.diagnostic || { title: 'Error inesperado', cause: error?.message || 'Ocurrió un error durante la carga.', solution: 'Revisa el proveedor seleccionado.', file: files[index].name } } } }
    try {
      const concurrency = window.matchMedia('(max-width: 720px)').matches ? 2 : provider === 'cloudinary' ? 3 : 4
      await Promise.all(Array.from({ length: Math.min(files.length, concurrency) }, () => worker()))
      if (failure) throw failure
      setStage('syncing'); setProgress(96); activeField.setValue([...existingIDs, ...uploadedIDs.filter(Boolean)]); backgroundStatus.setValue('ready'); setProgress(100); setStage('ready'); setMessage(`${uploadedIDs.length} frames guardados en ${provider === 'cloudinary' ? 'Cloudinary' : 'Blob'}. Guarda el background para confirmar.`); clearPreview(false); setProcessed(uploadedIDs.length); setTotal(uploadedIDs.length)
    } catch (error) { const report = error as Diagnostic; setDiagnostic(report); setStage('error'); backgroundStatus.setValue('processing'); setMessage(report.cause || 'Ocurrió un error durante la carga.') }
    finally { setBusy(false) }
  }

  async function copyDiagnostic() { if (diagnostic) { await navigator.clipboard.writeText(JSON.stringify({ ...diagnostic, provider, folder: storageFolder, browser: navigator.userAgent, time: new Date().toISOString() }, null, 2)); setMessage('Informe técnico copiado.') } }

  return <section className="uploader" data-path={path} data-stage={stage}>
    <header><div><span>CREADOR DE BACKGROUNDS</span><h3>Video, carpeta o secuencia</h3><p>Selecciona Vercel Blob o Cloudinary antes de generar y subir los frames.</p></div><div className="selectors"><label>Proveedor<select value={provider} onChange={(e) => setProvider(e.target.value as Provider)} disabled={busy}><option value="blob">Vercel Blob privado</option><option value="cloudinary">Cloudinary</option></select></label><label>Formato<select value={target} onChange={(e) => setTarget(e.target.value as UploadTarget)} disabled={busy}><option value="mobileFrames">Móvil vertical</option><option value="desktopFrames">Web / escritorio</option></select></label></div></header>
    <div className="provider-card"><strong>{provider === 'cloudinary' ? 'Cloudinary activo' : 'Vercel Blob activo'}</strong><span>{provider === 'cloudinary' ? 'Los frames se agrupan por carpeta y quedan disponibles por URL CDN.' : 'Los frames se guardan en el store privado y se sirven mediante proxy autenticado.'}</span>{provider === 'cloudinary' && <a href="/studio/cloudinary">Configurar y gestionar Cloudinary</a>}</div>
    <div className="settings"><label>Carpeta / grupo<input value={folderName} onChange={(e) => setFolderName(slugify(e.target.value))}/></label><label>Frames desde video<input type="number" min="12" max="180" value={frameAmount} onChange={(e) => setFrameAmount(Math.min(180, Math.max(12, Number(e.target.value) || 60)))}/></label><code>{storageFolder}</code></div>
    <div className="actions"><button type="button" onClick={() => videoInput.current?.click()} disabled={busy}>Subir video</button><button type="button" onClick={() => folderInput.current?.click()} disabled={busy}>Subir carpeta</button><button type="button" onClick={() => imageInput.current?.click()} disabled={busy}>Imágenes</button>{preview.length > 0 && <button className="primary" type="button" onClick={() => void upload()} disabled={busy}>Enviar a {provider === 'cloudinary' ? 'Cloudinary' : 'Blob'}</button>}</div>
    <input ref={(element) => { folderInput.current = element; element?.setAttribute('webkitdirectory', '') }} hidden type="file" multiple accept="image/*" onChange={(e) => prepare(e.target.files)}/><input ref={imageInput} hidden type="file" multiple accept="image/*" onChange={(e) => prepare(e.target.files)}/><input ref={videoInput} hidden type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => { const file = e.target.files?.[0]; if (file) void extractFramesFromVideo(file) }}/>
    {preview.length > 0 && <div className="preview">{preview.slice(0, 48).map((item) => <figure key={`${item.file.name}-${item.order}`}><img src={item.url} alt=""/><b>{String(item.order).padStart(3, '0')}</b></figure>)}</div>}
    <div className={`status ${stage}`}><div><strong>{stage}</strong><span>{processed}/{total || preview.length || 0}</span></div><progress max="100" value={progress}/><p>{message}</p></div>
    {diagnostic && <aside className="diagnostic"><h4>{diagnostic.title}</h4><p>{diagnostic.cause}</p><p><strong>Solución:</strong> {diagnostic.solution}</p><button type="button" onClick={() => void copyDiagnostic()}>Copiar informe</button></aside>}
    <style jsx>{`
      .uploader{padding:clamp(16px,3vw,24px);border:1px solid var(--theme-elevation-150);border-radius:18px;background:linear-gradient(145deg,var(--theme-elevation-50),color-mix(in srgb,var(--theme-elevation-100) 84%,#8d1730 16%))}header{display:flex;justify-content:space-between;gap:18px}header span{color:#d33b58;font-size:10px;font-weight:900;letter-spacing:.14em}h3{margin:7px 0;font-size:20px}p{color:var(--theme-elevation-600);line-height:1.5}.selectors{display:grid;grid-template-columns:1fr 1fr;gap:8px;min-width:370px}.selectors label,.settings label{display:grid;gap:6px;font-size:11px}select,input{min-height:42px;padding:9px;border:1px solid var(--theme-elevation-250);border-radius:9px;background:var(--theme-input-bg);color:var(--theme-text)}.provider-card{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;margin-top:14px;padding:12px;border-radius:12px;background:var(--theme-elevation-100)}.provider-card a{color:#d33b58;font-weight:800}.settings{display:grid;grid-template-columns:1fr 160px 1fr;gap:10px;margin-top:16px}.settings code{display:flex;align-items:center;padding:10px;border-radius:9px;background:var(--theme-elevation-100);overflow:hidden}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}button{padding:11px 14px;border:1px solid var(--theme-elevation-250);border-radius:9px;background:var(--theme-elevation-800);color:#fff;font-weight:750;cursor:pointer}.primary{background:#e8b928;color:#111}.preview{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:7px;max-height:360px;overflow:auto;margin-top:15px;padding:8px;background:var(--theme-elevation-100);border-radius:12px}figure{margin:0;position:relative;border-radius:8px;overflow:hidden}img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover}figure b{position:absolute;left:6px;bottom:6px;padding:4px;border-radius:5px;background:#111;color:#fff}.status{margin-top:15px;padding:13px;border:1px solid var(--theme-elevation-150);border-radius:12px}.status>div{display:flex;justify-content:space-between}.status.error{border-color:var(--theme-error-500)}progress{width:100%;accent-color:#d33b58}.diagnostic{margin-top:15px;padding:16px;border:1px solid #ff506d;border-radius:14px;background:color-mix(in srgb,var(--theme-error-100) 20%,var(--theme-elevation-50))}@media(max-width:760px){header{flex-direction:column}.selectors,.settings{grid-template-columns:1fr;min-width:0}.provider-card{grid-template-columns:1fr}.actions{display:grid}.actions button,select,input{width:100%}.preview{grid-template-columns:repeat(3,1fr)}}
    `}</style>
  </section>
}
