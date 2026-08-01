'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Asset = { public_id: string; secure_url: string; width?: number; height?: number; bytes?: number; format?: string; created_at?: string }
type Folder = { name: string; path: string }
type Device = 'mobile' | 'desktop'
type Prepared = { file: File; url: string; order: number }

const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'background'
const naturalSort = (files: File[]) => [...files].sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, undefined, { numeric: true }))

async function waitFor(target: EventTarget, event: string) {
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => { cleanup(); reject(new Error(`Tiempo agotado esperando ${event}.`)) }, 15000)
    const done = () => { cleanup(); resolve() }
    const fail = () => { cleanup(); reject(new Error('El navegador no pudo leer el video.')) }
    const cleanup = () => { clearTimeout(timer); target.removeEventListener(event, done); target.removeEventListener('error', fail) }
    target.addEventListener(event, done, { once: true }); target.addEventListener('error', fail, { once: true })
  })
}

export default function CloudinaryStudioManager() {
  const imageInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)
  const frameInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const [settings, setSettings] = useState<any>(null)
  const [form, setForm] = useState({ cloudName: '', apiKey: '', apiSecret: '', rootFolder: 'fabrickbuild' })
  const [prefix, setPrefix] = useState('fabrickbuild')
  const [newFolder, setNewFolder] = useState('')
  const [folders, setFolders] = useState<Folder[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [selected, setSelected] = useState<Asset | null>(null)
  const [renameTo, setRenameTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Cargando configuración…')
  const [prepared, setPrepared] = useState<Prepared[]>([])
  const [device, setDevice] = useState<Device>('mobile')
  const [backgroundName, setBackgroundName] = useState('Nueva secuencia')
  const [frameAmount, setFrameAmount] = useState(60)
  const [progress, setProgress] = useState(0)

  const frameFolder = useMemo(() => `frames/${slugify(backgroundName)}/${device}`, [backgroundName, device])

  async function loadSettings() {
    const response = await fetch('/api/cloudinary/settings', { credentials: 'include', cache: 'no-store' })
    const json = await response.json()
    setSettings(json)
    if (json.ok) {
      setForm((value) => ({ ...value, cloudName: json.cloudName || '', rootFolder: json.rootFolder || 'fabrickbuild' }))
      setPrefix(json.rootFolder || 'fabrickbuild')
      setMessage(json.configured ? `Configuración ${json.environment || ''} lista.` : 'Añade las credenciales de Cloudinary.')
    } else setMessage(json.message || 'No fue posible abrir la configuración.')
  }

  async function loadAssets(nextPrefix = prefix) {
    setBusy(true)
    try {
      const response = await fetch(`/api/cloudinary/assets?prefix=${encodeURIComponent(nextPrefix)}`, { credentials: 'include', cache: 'no-store' })
      const json = await response.json()
      if (!json.ok) throw new Error(json.message)
      setFolders(json.folders || []); setAssets(json.resources || []); setPrefix(nextPrefix)
      setMessage(`${json.resources?.length || 0} recursos en ${nextPrefix || 'raíz'}.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error consultando Cloudinary.') }
    finally { setBusy(false) }
  }

  useEffect(() => { void loadSettings() }, [])
  useEffect(() => { if (settings?.configured) void loadAssets(settings.rootFolder || 'fabrickbuild') }, [settings?.configured])
  useEffect(() => () => prepared.forEach((item) => URL.revokeObjectURL(item.url)), [prepared])

  async function save(action: 'save' | 'test') {
    setBusy(true); setMessage(action === 'test' ? 'Probando conexión…' : 'Guardando credenciales cifradas…')
    try {
      const response = await fetch('/api/cloudinary/settings', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, action }) })
      const json = await response.json(); if (!json.ok) throw new Error(json.message)
      setForm((value) => ({ ...value, apiKey: '', apiSecret: '' })); setMessage(json.message); await loadSettings()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible guardar.') }
    finally { setBusy(false) }
  }

  async function mutate(action: string, data: Record<string, string>) {
    setBusy(true)
    try {
      const response = await fetch('/api/cloudinary/assets', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) })
      const json = await response.json(); if (!json.ok) throw new Error(json.message)
      setMessage('Operación completada.'); setSelected(null); await loadAssets(prefix)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Cloudinary rechazó la operación.') }
    finally { setBusy(false) }
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return
    setBusy(true); setProgress(0)
    try {
      const list = Array.from(files).filter((file) => file.type.startsWith('image/'))
      for (let index = 0; index < list.length; index += 1) {
        const formData = new FormData(); formData.append('file', list[index]); formData.append('folder', prefix)
        const response = await fetch('/api/cloudinary/assets', { method: 'POST', credentials: 'include', body: formData })
        const json = await response.json(); if (!json.ok) throw new Error(json.message)
        setProgress(Math.round(((index + 1) / list.length) * 100))
      }
      setMessage(`${list.length} imagen(es) subidas a ${prefix}.`); await loadAssets(prefix)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error subiendo imágenes.') }
    finally { setBusy(false); if (imageInput.current) imageInput.current.value = ''; if (folderInput.current) folderInput.current.value = '' }
  }

  function prepareFrames(files: File[]) {
    prepared.forEach((item) => URL.revokeObjectURL(item.url))
    const sorted = naturalSort(files.filter((file) => file.type.startsWith('image/')))
    setPrepared(sorted.map((file, index) => ({ file, url: URL.createObjectURL(file), order: index + 1 })))
    setMessage(`${sorted.length} frames preparados. Revisa el orden y guarda el Background.`)
  }

  async function extractVideo(file: File) {
    setBusy(true); setProgress(0); setMessage(`Generando ${frameAmount} frames…`)
    const video = document.createElement('video'); const source = URL.createObjectURL(file)
    video.src = source; video.muted = true; video.playsInline = true; video.preload = 'auto'
    try {
      await waitFor(video, 'loadedmetadata'); if (video.readyState < 2) await waitFor(video, 'loadeddata')
      const maxWidth = device === 'mobile' ? 1080 : 1600
      const scale = Math.min(1, maxWidth / Math.max(1, video.videoWidth))
      const canvas = document.createElement('canvas'); canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale)
      const context = canvas.getContext('2d', { alpha: false }); if (!context) throw new Error('No fue posible iniciar Canvas.')
      const generated: File[] = []
      for (let index = 0; index < frameAmount; index += 1) {
        video.currentTime = Math.min(Math.max(0, video.duration - .01), video.duration * (index / Math.max(1, frameAmount - 1)))
        await waitFor(video, 'seeked'); context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo convertir el frame.')), 'image/webp', .78))
        generated.push(new File([blob], `frame_${String(index + 1).padStart(3, '0')}.webp`, { type: 'image/webp' }))
        setProgress(Math.round(((index + 1) / frameAmount) * 35))
      }
      prepareFrames(generated)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible generar frames.') }
    finally { URL.revokeObjectURL(source); video.removeAttribute('src'); setBusy(false); if (videoInput.current) videoInput.current.value = '' }
  }

  async function uploadFrame(file: File, order: number) {
    const data = new FormData(); data.append('file', file)
    data.append('metadata', JSON.stringify({ provider: 'cloudinary', category: 'frame', device, frameOrder: order, collectionKey: slugify(backgroundName), folder: frameFolder, alt: `${backgroundName} frame ${order}` }))
    const response = await fetch('/api/frame-upload', { method: 'POST', body: data, credentials: 'include' })
    const json = await response.json(); if (!response.ok || !json?.doc?.id) throw new Error(json?.message || `Falló ${file.name}`)
    return json.doc.id
  }

  async function saveBackground() {
    if (!prepared.length) return
    setBusy(true); setProgress(36); setMessage('Subiendo frames a Cloudinary y Multimedia…')
    try {
      const ids: Array<string | number> = []
      for (let index = 0; index < prepared.length; index += 1) {
        ids.push(await uploadFrame(prepared[index].file, index + 1))
        setProgress(36 + Math.round(((index + 1) / prepared.length) * 56))
      }
      const payload: any = { name: backgroundName, slug: `${slugify(backgroundName)}-${Date.now().toString().slice(-6)}`, kind: 'frames', device, status: 'ready', playback: { trigger: 'scroll', scrub: .35, pin: true, snap: false, scrollLength: 780, parallax: 12, fit: 'cover', overlayOpacity: 20 } }
      payload[device === 'mobile' ? 'mobileFrames' : 'desktopFrames'] = ids
      const response = await fetch('/api/backgrounds', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await response.json(); if (!response.ok || !json?.doc?.id) throw new Error(json?.errors?.[0]?.message || json?.message || 'No se pudo guardar el Background.')
      setProgress(100); setMessage(`Background guardado. ID ${json.doc.id}. Disponible en Multimedia y Backgrounds.`)
      prepared.forEach((item) => URL.revokeObjectURL(item.url)); setPrepared([])
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible guardar el Background.') }
    finally { setBusy(false) }
  }

  return <main className="cloudinary-admin-studio">
    <header><div><small>ADMIN / STUDIO / CLOUDINARY</small><h1>Cloudinary Media Studio</h1><p>Biblioteca privada, carpetas, imágenes y generador de frames conectado a Payload Multimedia y Backgrounds.</p></div><nav><a href="/admin/studio">Studio</a><a href="/admin">Payload</a></nav></header>
    <section className="statusbar"><b>{settings?.enabled ? 'Conectado' : 'Revisión requerida'}</b><span>{settings?.environment || '—'} · DB {settings?.databaseFingerprint || '—'} · {settings?.deployment || 'local'}</span></section>
    <section className="panel"><div className="title"><div><small>CONEXIÓN CIFRADA</small><h2>Credenciales</h2></div><b>{settings?.status || 'untested'}</b></div><div className="grid"><label>Cloud name<input value={form.cloudName} onChange={(e) => setForm({ ...form, cloudName: e.target.value })}/></label><label>API key<input value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder={settings?.hint || 'API key'}/></label><label>API secret<input type="password" value={form.apiSecret} onChange={(e) => setForm({ ...form, apiSecret: e.target.value })} placeholder={settings?.configured ? 'Conservar actual' : 'API secret'}/></label><label>Carpeta raíz<input value={form.rootFolder} onChange={(e) => setForm({ ...form, rootFolder: e.target.value })}/></label></div><div className="actions"><button onClick={() => void save('test')} disabled={busy}>Probar</button><button className="primary" onClick={() => void save('save')} disabled={busy}>Guardar</button></div></section>
    <section className="panel"><div className="title"><div><small>BIBLIOTECA</small><h2>Carpetas e imágenes</h2></div><button onClick={() => void loadAssets(prefix)} disabled={busy}>Actualizar</button></div><div className="browser"><label>Ruta<input value={prefix} onChange={(e) => setPrefix(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void loadAssets(e.currentTarget.value)}/></label><label>Nueva carpeta<div><input value={newFolder} onChange={(e) => setNewFolder(e.target.value)}/><button onClick={() => void mutate('create-folder', { folder: newFolder })} disabled={!newFolder || busy}>Crear</button></div></label></div><div className="actions"><button onClick={() => imageInput.current?.click()} disabled={busy}>Subir imágenes</button><button onClick={() => folderInput.current?.click()} disabled={busy}>Subir carpeta completa</button><input ref={imageInput} hidden type="file" multiple accept="image/*" onChange={(e) => void uploadImages(e.target.files)}/><input ref={(element) => { folderInput.current = element; element?.setAttribute('webkitdirectory','') }} hidden type="file" multiple accept="image/*" onChange={(e) => void uploadImages(e.target.files)}/></div>{progress > 0 && progress < 100 && <progress max="100" value={progress}/>}<div className="folders">{folders.map((folder) => <article key={folder.path || folder.name}><button onClick={() => void loadAssets(folder.path || [prefix, folder.name].filter(Boolean).join('/'))}>📁 {folder.name}</button><button className="danger" onClick={() => void mutate('delete-folder', { folder: folder.path || folder.name })}>Eliminar</button></article>)}</div><div className="assets">{assets.map((asset) => <figure key={asset.public_id} onClick={() => { setSelected(asset); setRenameTo(asset.public_id.split('/').pop() || '') }}><img src={asset.secure_url} alt={asset.public_id} loading="lazy"/><figcaption><strong>{asset.public_id.split('/').pop()}</strong><small>{asset.width}×{asset.height} · {Math.round((asset.bytes || 0)/1024)} KB</small></figcaption></figure>)}</div></section>
    {selected && <section className="panel editor"><div><img src={selected.secure_url} alt={selected.public_id}/></div><div><small>EDITOR DE RECURSO</small><h2>{selected.public_id}</h2><label>Nuevo nombre o carpeta<input value={renameTo} onChange={(e) => setRenameTo(e.target.value)}/></label><div className="actions"><button onClick={() => void mutate('rename-asset', { publicID: selected.public_id, toPublicID: [prefix, renameTo].filter(Boolean).join('/') })}>Guardar cambio</button><a href={selected.secure_url} target="_blank" rel="noreferrer">Abrir original</a><button className="danger" onClick={() => void mutate('delete-asset', { publicID: selected.public_id })}>Eliminar</button></div></div></section>}
    <section className="panel"><div className="title"><div><small>FRAME ENGINE</small><h2>Generador de Background</h2><p>Sube un video, una carpeta o imágenes. Los frames se guardan en Cloudinary, se registran en Multimedia y se crea el Background.</p></div></div><div className="grid"><label>Nombre<input value={backgroundName} onChange={(e) => setBackgroundName(e.target.value)}/></label><label>Dispositivo<select value={device} onChange={(e) => setDevice(e.target.value as Device)}><option value="mobile">Móvil vertical</option><option value="desktop">Escritorio</option></select></label><label>Frames desde video<input type="number" min="12" max="180" value={frameAmount} onChange={(e) => setFrameAmount(Math.min(180, Math.max(12, Number(e.target.value) || 60)))}/></label><label>Destino<code>{frameFolder}</code></label></div><div className="actions"><button onClick={() => videoInput.current?.click()} disabled={busy}>Generar desde video</button><button onClick={() => frameInput.current?.click()} disabled={busy}>Seleccionar imágenes o carpeta</button>{prepared.length > 0 && <button className="primary" onClick={() => void saveBackground()} disabled={busy}>Guardar Background ({prepared.length})</button>}<input ref={videoInput} hidden type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => { const file=e.target.files?.[0]; if(file) void extractVideo(file) }}/><input ref={(element) => { frameInput.current = element; element?.setAttribute('webkitdirectory','') }} hidden type="file" multiple accept="image/*" onChange={(e) => e.target.files && prepareFrames(Array.from(e.target.files))}/></div>{prepared.length > 0 && <div className="frames">{prepared.slice(0,72).map((item) => <figure key={`${item.file.name}-${item.order}`}><img src={item.url} alt=""/><b>{String(item.order).padStart(3,'0')}</b></figure>)}</div>}</section>
    <p className="notice">{message}</p>
    <style jsx>{`
      :global(body){margin:0;background:var(--theme-bg,#111);color:var(--theme-text,#eee)}.cloudinary-admin-studio{min-height:100vh;padding:clamp(18px,3vw,42px);font-family:Inter,system-ui,sans-serif}header,.panel,.statusbar,.notice{max-width:1380px;margin-left:auto;margin-right:auto}header{display:flex;justify-content:space-between;gap:20px;align-items:start;margin-bottom:18px}header small,.title small{color:#d9ad29;font-weight:900;letter-spacing:.14em}h1{font-size:clamp(34px,6vw,72px);margin:9px 0}header p,.title p{color:var(--theme-elevation-600,#aaa);max-width:760px;line-height:1.5}nav{display:flex;gap:8px}a,button{border:1px solid var(--theme-elevation-250,#444);border-radius:9px;padding:10px 13px;background:var(--theme-elevation-100,#222);color:inherit;text-decoration:none;cursor:pointer}.statusbar,.notice{display:flex;justify-content:space-between;gap:12px;padding:12px 15px;border:1px solid var(--theme-elevation-150,#333);border-radius:12px;background:var(--theme-elevation-50,#181818)}.statusbar span{color:var(--theme-elevation-600,#aaa)}.panel{margin-top:14px;padding:clamp(16px,2.5vw,26px);border:1px solid var(--theme-elevation-150,#333);border-radius:15px;background:var(--theme-elevation-50,#181818)}.title{display:flex;justify-content:space-between;gap:16px;align-items:start}.title h2{margin:5px 0}.grid,.browser{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:16px}label{display:grid;gap:6px;font-size:12px;font-weight:800}input,select,code{box-sizing:border-box;width:100%;min-height:43px;padding:10px;border:1px solid var(--theme-elevation-250,#444);border-radius:9px;background:var(--theme-input-bg,#101010);color:inherit}code{display:flex;align-items:center}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.primary{background:#deb42f;color:#171207;border-color:#deb42f}.danger{background:#6f1c2c}.browser label>div,.folders article{display:flex;gap:8px}.folders{display:grid;gap:7px;margin:16px 0}.folders article>button:first-child{flex:1;text-align:left}.assets{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}.assets figure,.frames figure{margin:0;overflow:hidden;border:1px solid var(--theme-elevation-150,#333);border-radius:10px;background:#0d0d0d;cursor:pointer}.assets img{width:100%;aspect-ratio:16/10;object-fit:cover;display:block}.assets figcaption{display:grid;gap:4px;padding:9px}.assets strong,.assets small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.assets small{color:#999}.editor{display:grid;grid-template-columns:minmax(260px,.8fr) 1.2fr;gap:20px}.editor img{width:100%;max-height:480px;object-fit:contain;background:#090909;border-radius:12px}.frames{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:7px;max-height:430px;overflow:auto;margin-top:15px}.frames figure{position:relative}.frames img{display:block;width:100%;aspect-ratio:9/14;object-fit:cover}.frames b{position:absolute;left:5px;bottom:5px;background:#000c;color:#fff;padding:3px;border-radius:4px;font-size:9px}progress{width:100%;margin-top:12px;accent-color:#deb42f}@media(max-width:760px){header{display:grid}nav{width:100%}nav a{flex:1;text-align:center}.grid,.browser,.editor{grid-template-columns:1fr}.assets{grid-template-columns:repeat(2,minmax(0,1fr))}.statusbar{display:grid}.title{align-items:start}.actions{display:grid}.actions>*{width:100%;box-sizing:border-box;text-align:center}}
    `}</style>
  </main>
}
