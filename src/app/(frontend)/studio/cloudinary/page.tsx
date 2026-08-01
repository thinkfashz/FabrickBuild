'use client'

import { useEffect, useState } from 'react'

type Asset = { public_id: string; secure_url: string; width?: number; height?: number; bytes?: number; format?: string }
type Folder = { name: string; path: string }

export default function CloudinaryStudioPage() {
  const [settings, setSettings] = useState<any>(null)
  const [form, setForm] = useState({ cloudName: '', apiKey: '', apiSecret: '', rootFolder: 'fabrickbuild' })
  const [prefix, setPrefix] = useState('fabrickbuild')
  const [newFolder, setNewFolder] = useState('')
  const [folders, setFolders] = useState<Folder[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Cargando configuración…')

  async function loadSettings() {
    const response = await fetch('/api/cloudinary/settings', { credentials: 'include' })
    const json = await response.json()
    setSettings(json)
    if (json.ok) {
      setForm((value) => ({ ...value, cloudName: json.cloudName || '', rootFolder: json.rootFolder || 'fabrickbuild' }))
      setPrefix(json.rootFolder || 'fabrickbuild')
      setMessage(json.configured ? 'Credenciales protegidas y listas para probar.' : 'Añade las credenciales de Cloudinary.')
    } else setMessage(json.message || 'No fue posible abrir la configuración.')
  }

  async function loadAssets(nextPrefix = prefix) {
    setBusy(true)
    try {
      const response = await fetch(`/api/cloudinary/assets?prefix=${encodeURIComponent(nextPrefix)}`, { credentials: 'include' })
      const json = await response.json()
      if (!json.ok) throw new Error(json.message)
      setFolders(json.folders || [])
      setAssets(json.resources || [])
      setMessage(`${json.resources?.length || 0} recursos encontrados en ${nextPrefix || 'raíz'}.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error consultando Cloudinary.') }
    finally { setBusy(false) }
  }

  useEffect(() => { void loadSettings() }, [])
  useEffect(() => { if (settings?.configured) void loadAssets(prefix) }, [settings?.configured])

  async function save(action: 'save' | 'test') {
    setBusy(true); setMessage(action === 'test' ? 'Probando conexión…' : 'Cifrando y guardando…')
    try {
      const response = await fetch('/api/cloudinary/settings', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, action }) })
      const json = await response.json()
      if (!json.ok) throw new Error(json.message)
      setForm((value) => ({ ...value, apiKey: '', apiSecret: '' }))
      setMessage(json.message)
      await loadSettings()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible guardar.') }
    finally { setBusy(false) }
  }

  async function mutate(action: string, data: Record<string, string>) {
    setBusy(true)
    try {
      const response = await fetch('/api/cloudinary/assets', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) })
      const json = await response.json()
      if (!json.ok) throw new Error(json.message)
      setMessage('Operación completada correctamente.')
      await loadAssets()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Cloudinary rechazó la operación.') }
    finally { setBusy(false) }
  }

  return <main className="cloudinary-studio">
    <header><div><span>CLOUDINARY CONTROL CENTER</span><h1>Proveedor multimedia secundario</h1><p>Configura la bóveda, prueba la conexión y administra las carpetas que usarán los backgrounds cinematográficos.</p></div><a href="/admin">Volver al admin</a></header>

    <section className="panel credentials">
      <div className="panel-title"><div><small>CONEXIÓN CIFRADA</small><h2>Credenciales API</h2></div><b data-status={settings?.status}>{settings?.status || 'untested'}</b></div>
      <div className="grid">
        <label>Cloud name<input value={form.cloudName} onChange={(e) => setForm({ ...form, cloudName: e.target.value })} placeholder="mi-cloud" /></label>
        <label>API key<input value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder={settings?.hint || 'Nueva API key'} /></label>
        <label>API secret<input type="password" value={form.apiSecret} onChange={(e) => setForm({ ...form, apiSecret: e.target.value })} placeholder={settings?.configured ? '•••••••• (conservar actual)' : 'API secret'} /></label>
        <label>Carpeta raíz<input value={form.rootFolder} onChange={(e) => setForm({ ...form, rootFolder: e.target.value })} /></label>
      </div>
      <div className="actions"><button disabled={busy} onClick={() => void save('test')}>Probar conexión</button><button className="primary" disabled={busy} onClick={() => void save('save')}>Guardar en bóveda</button></div>
      <p className="notice">{message}</p>
    </section>

    <section className="panel library">
      <div className="panel-title"><div><small>MEDIA LIBRARY</small><h2>Carpetas y frames</h2></div><button disabled={busy || !settings?.configured} onClick={() => void loadAssets()}>Actualizar</button></div>
      <div className="browser"><label>Ruta actual<input value={prefix} onChange={(e) => setPrefix(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void loadAssets(e.currentTarget.value) }} /></label><label>Nueva carpeta<div><input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder={`${prefix}/nuevo-background`} /><button disabled={busy || !newFolder} onClick={() => void mutate('create-folder', { folder: newFolder })}>Crear</button></div></label></div>
      <div className="folders">{folders.map((folder) => <article key={folder.path || folder.name}><button className="folder" onClick={() => { const path = folder.path || [prefix, folder.name].filter(Boolean).join('/'); setPrefix(path); void loadAssets(path) }}>📁 <strong>{folder.name}</strong></button><button className="danger" onClick={() => void mutate('delete-folder', { folder: folder.path || folder.name })}>Eliminar</button></article>)}</div>
      <div className="assets">{assets.map((asset) => <figure key={asset.public_id}><img src={asset.secure_url} alt={asset.public_id} loading="lazy" /><figcaption><strong>{asset.public_id.split('/').pop()}</strong><small>{asset.width || 0}×{asset.height || 0} · {Math.round((asset.bytes || 0) / 1024)} KB</small><button className="danger" onClick={() => void mutate('delete-asset', { publicID: asset.public_id })}>Eliminar</button></figcaption></figure>)}</div>
    </section>

    <style jsx>{`
      .cloudinary-studio{min-height:100vh;padding:clamp(18px,4vw,50px);color:#f8f3eb;background:radial-gradient(circle at 80% 0,#5c1630 0,transparent 34%),linear-gradient(150deg,#08090d,#151018 55%,#07080b)}header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;max-width:1400px;margin:auto auto 24px}header span,.panel small{font-size:11px;font-weight:900;letter-spacing:.16em;color:#ff5e80}h1{font-size:clamp(30px,5vw,64px);margin:8px 0}header p{max-width:760px;color:#c8bec4}header a,.actions button,.panel-title button,.browser button,.danger{border:1px solid #ffffff24;border-radius:10px;padding:11px 14px;color:#fff;background:#ffffff0b;text-decoration:none;cursor:pointer}.panel{max-width:1400px;margin:0 auto 22px;padding:clamp(18px,3vw,30px);border:1px solid #ffffff18;border-radius:20px;background:#ffffff0a;backdrop-filter:blur(20px)}.panel-title{display:flex;justify-content:space-between;gap:16px;align-items:center}.panel-title h2{margin:5px 0 0}.panel-title b{padding:7px 10px;border-radius:99px;background:#ffffff10;color:#ffcf5a}.grid,.browser{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:20px}label{display:grid;gap:7px;font-size:12px;font-weight:800}input{width:100%;box-sizing:border-box;padding:13px;border:1px solid #ffffff20;border-radius:10px;background:#090a0ecc;color:#fff}.actions{display:flex;gap:10px;margin-top:16px}.actions .primary{background:#f0c638;color:#161107}.notice{padding:12px;border-radius:10px;background:#0006;color:#d8cdd2}.browser label>div{display:flex;gap:8px}.folders{display:grid;gap:8px;margin:18px 0}.folders article{display:flex;gap:8px}.folder{flex:1;text-align:left;padding:12px;border:1px solid #ffffff18;border-radius:10px;background:#ffffff08;color:#fff;cursor:pointer}.danger{background:#7d1830!important}.assets{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}.assets figure{margin:0;overflow:hidden;border:1px solid #ffffff16;border-radius:14px;background:#08090d}.assets img{width:100%;aspect-ratio:16/10;object-fit:cover;display:block}.assets figcaption{display:grid;gap:6px;padding:11px}.assets small{overflow:hidden;text-overflow:ellipsis;color:#aaa}.assets strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@media(max-width:760px){header{display:grid}.grid,.browser{grid-template-columns:1fr}.assets{grid-template-columns:repeat(2,minmax(0,1fr))}.panel-title{align-items:flex-start}}
    `}</style>
  </main>
}
