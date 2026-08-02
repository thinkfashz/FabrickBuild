'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Asset = { public_id: string; secure_url: string; width?: number; height?: number; bytes?: number; format?: string }
type Folder = { name: string; path: string }

type Settings = {
  ok?: boolean
  configured?: boolean
  enabled?: boolean
  cloudName?: string
  rootFolder?: string
  environment?: string
  status?: string
  message?: string
}

const thumb = (url: string) => url.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_420,h_280,c_fill/')

export default function CloudinaryStudioSafe() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [prefix, setPrefix] = useState('fabrickbuild')
  const [folders, setFolders] = useState<Folder[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [message, setMessage] = useState('Comprobando configuración…')
  const [newFolder, setNewFolder] = useState('')
  const [selected, setSelected] = useState<Asset | null>(null)

  const totalWeight = useMemo(() => assets.reduce((sum, asset) => sum + Number(asset.bytes || 0), 0), [assets])

  useEffect(() => {
    let active = true
    fetch('/api/cloudinary/settings', { credentials: 'include', cache: 'no-store' })
      .then((response) => response.json())
      .then((json) => {
        if (!active) return
        setSettings(json)
        const root = json.rootFolder || 'fabrickbuild'
        setPrefix(root)
        setMessage(json.configured ? 'Configuración lista. Pulsa “Cargar imágenes”.' : json.message || 'Cloudinary necesita configuración.')
      })
      .catch(() => active && setMessage('No fue posible leer la configuración.'))
    return () => { active = false }
  }, [])

  async function loadAssets(nextPrefix = prefix, nextCursor?: string | null, append = false) {
    setBusy(true)
    try {
      const params = new URLSearchParams({ prefix: nextPrefix, limit: '24' })
      if (nextCursor) params.set('cursor', nextCursor)
      const response = await fetch(`/api/cloudinary/assets?${params.toString()}`, { credentials: 'include', cache: 'no-store' })
      const json = await response.json()
      if (!response.ok || !json.ok) throw new Error(json.message || 'No fue posible cargar la biblioteca.')
      setFolders(json.folders || [])
      setAssets((current) => append ? [...current, ...(json.resources || [])] : (json.resources || []))
      setCursor(json.nextCursor || null)
      setPrefix(nextPrefix)
      setLoaded(true)
      setMessage(`${append ? assets.length + (json.resources?.length || 0) : (json.resources?.length || 0)} imágenes visibles.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cloudinary no respondió.')
    } finally {
      setBusy(false)
    }
  }

  async function mutate(action: string, payload: Record<string, string>) {
    setBusy(true)
    try {
      const response = await fetch('/api/cloudinary/assets', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) throw new Error(json.message || 'Cloudinary rechazó la operación.')
      setSelected(null)
      await loadAssets(prefix)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible completar la operación.')
    } finally {
      setBusy(false)
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const data = new FormData()
        data.append('file', file)
        data.append('folder', prefix)
        const response = await fetch('/api/cloudinary/assets', { method: 'POST', credentials: 'include', body: data })
        const json = await response.json()
        if (!response.ok || !json.ok) throw new Error(json.message || `Falló ${file.name}`)
      }
      await loadAssets(prefix)
      setMessage('Carga completada.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible subir las imágenes.')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <main className="cloud-safe">
      <header>
        <div><small>PAYLOAD / STUDIO / CLOUDINARY</small><h1>Cloudinary</h1><p>Biblioteca paginada y optimizada para móvil. Las imágenes no se descargan en tamaño original.</p></div>
        <nav><a href="/admin/studio">Studio</a><a href="/admin">Payload</a></nav>
      </header>

      <section className="status">
        <b>{settings?.configured ? 'Configurado' : 'Revisión requerida'}</b>
        <span>{settings?.environment || '—'} · {settings?.status || 'sin probar'}</span>
        <em>{message}</em>
      </section>

      <section className="toolbar">
        <label>Carpeta<input value={prefix} onChange={(event) => setPrefix(event.target.value)} /></label>
        <button className="primary" disabled={busy || !settings?.configured} onClick={() => void loadAssets(prefix)}>Cargar imágenes</button>
        <button disabled={busy} onClick={() => fileInput.current?.click()}>Subir imágenes</button>
        <input ref={fileInput} hidden type="file" accept="image/*" multiple onChange={(event) => void upload(event.target.files)} />
      </section>

      <section className="folder-create">
        <input placeholder="Nueva carpeta" value={newFolder} onChange={(event) => setNewFolder(event.target.value)} />
        <button disabled={busy || !newFolder.trim()} onClick={() => void mutate('create-folder', { folder: [prefix, newFolder].filter(Boolean).join('/') })}>Crear carpeta</button>
      </section>

      {loaded && <section className="summary"><b>{assets.length} recursos</b><span>{Math.round(totalWeight / 1024)} KB visibles</span></section>}

      <section className="folders">
        {folders.map((folder) => <button key={folder.path || folder.name} onClick={() => void loadAssets(folder.path || [prefix, folder.name].filter(Boolean).join('/'))}>📁 {folder.name}</button>)}
      </section>

      {!loaded ? (
        <section className="empty"><h2>La biblioteca está en pausa</h2><p>Esto evita que el teléfono cargue decenas de imágenes originales al abrir la página.</p></section>
      ) : (
        <section className="grid">
          {assets.map((asset) => (
            <button key={asset.public_id} className="card" onClick={() => setSelected(asset)}>
              <img src={thumb(asset.secure_url)} alt={asset.public_id} loading="lazy" decoding="async" />
              <span><strong>{asset.public_id.split('/').pop()}</strong><small>{asset.width || 0}×{asset.height || 0} · {Math.round((asset.bytes || 0) / 1024)} KB</small></span>
            </button>
          ))}
        </section>
      )}

      {cursor && <button className="more" disabled={busy} onClick={() => void loadAssets(prefix, cursor, true)}>Cargar 24 más</button>}

      {selected && <aside className="modal" onClick={() => setSelected(null)}>
        <div onClick={(event) => event.stopPropagation()}>
          <img src={thumb(selected.secure_url)} alt={selected.public_id} />
          <h2>{selected.public_id}</h2>
          <a href={selected.secure_url} target="_blank" rel="noreferrer">Abrir original</a>
          <button className="danger" disabled={busy} onClick={() => void mutate('delete-asset', { publicID: selected.public_id })}>Eliminar imagen</button>
          <button onClick={() => setSelected(null)}>Cerrar</button>
        </div>
      </aside>}

      <style>{`
        .cloud-safe{min-height:100vh;padding:clamp(16px,3vw,40px);background:var(--theme-bg,#111);color:var(--theme-text,#eee);font-family:Inter,system-ui,sans-serif}.cloud-safe header{display:flex;justify-content:space-between;gap:20px;align-items:end;border-bottom:1px solid var(--theme-elevation-150,#333);padding-bottom:18px}.cloud-safe h1{font-size:clamp(38px,7vw,74px);margin:4px 0}.cloud-safe small{color:#d4aa2b;font-weight:900;letter-spacing:.12em}.cloud-safe p,.cloud-safe span,.cloud-safe em{color:var(--theme-elevation-600,#aaa)}.cloud-safe nav{display:flex;gap:8px}.cloud-safe a,.cloud-safe button{color:inherit;text-decoration:none;border:1px solid var(--theme-elevation-250,#444);background:var(--theme-elevation-50,#191919);border-radius:9px;padding:10px 13px}.cloud-safe button{cursor:pointer}.cloud-safe button:disabled{opacity:.5}.cloud-safe .primary{background:#d4aa2b;color:#111;font-weight:900}.status,.toolbar,.folder-create,.summary{margin-top:16px;padding:14px;border:1px solid var(--theme-elevation-150,#333);border-radius:12px;background:var(--theme-elevation-50,#181818);display:flex;gap:12px;align-items:center;flex-wrap:wrap}.status em{font-style:normal;margin-left:auto}.toolbar label{display:grid;gap:5px;flex:1;min-width:220px}.cloud-safe input{padding:11px;border:1px solid var(--theme-elevation-250,#444);border-radius:8px;background:var(--theme-elevation-0,#111);color:inherit}.folder-create input{flex:1}.folders{display:flex;gap:8px;overflow:auto;padding:14px 0}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}.card{padding:0!important;overflow:hidden;text-align:left}.card img{width:100%;aspect-ratio:3/2;object-fit:cover;display:block;background:#0b0b0b}.card span{display:grid;gap:4px;padding:10px}.card strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.card small{font-size:10px}.empty{margin-top:18px;padding:32px;text-align:center;border:1px dashed var(--theme-elevation-250,#444);border-radius:12px}.more{display:block;margin:18px auto}.modal{position:fixed;inset:0;background:#000b;display:grid;place-items:center;padding:16px;z-index:1000}.modal>div{width:min(560px,100%);max-height:90vh;overflow:auto;background:var(--theme-bg,#111);border:1px solid var(--theme-elevation-250,#444);border-radius:14px;padding:16px;display:grid;gap:12px}.modal img{width:100%;max-height:420px;object-fit:contain;background:#080808}.danger{border-color:#8d3030!important;color:#ff8c8c!important}@media(max-width:720px){.cloud-safe header{display:grid;align-items:start}.cloud-safe nav{flex-wrap:wrap}.status em{margin-left:0;width:100%}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.toolbar{display:grid}.toolbar label{min-width:0}.folder-create{display:grid}}
      `}</style>
    </main>
  )
}
