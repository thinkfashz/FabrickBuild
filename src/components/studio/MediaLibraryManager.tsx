'use client'

import { ArrowUpFromLine, Cloud, Database, FolderInput, Image as ImageIcon, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

type Source = 'database' | 'vercel-blob' | 'cloudinary' | 's3'
type Asset = {
  id?: string | number
  key?: string
  storageKey?: string
  storageFolder?: string
  storageProvider?: Source
  url?: string
  externalURL?: string
  filename?: string
  alt?: string
  name?: string
  size?: number
  uploadedAt?: string
  mimeType?: string
  contentType?: string
}
type Integration = { id: string | number; provider: Source; label: string; enabled?: boolean; status?: string }

const SOURCE_COPY: Record<Source, { label: string; detail: string }> = {
  database: { label: 'Biblioteca del proyecto', detail: 'Registro en PostgreSQL y archivo guardado en el Blob privado del proyecto.' },
  'vercel-blob': { label: 'Vercel Blob', detail: 'Archivos persistentes con CDN, organizados por carpeta.' },
  cloudinary: { label: 'Cloudinary', detail: 'Optimización, transformación y biblioteca remota.' },
  s3: { label: 'Amazon S3', detail: 'AWS S3, R2, MinIO u otro endpoint compatible.' },
}

function humanSize(value?: number) {
  if (!value) return '—'
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function assetURL(asset: Asset) {
  return asset.externalURL || asset.url || ''
}

export default function MediaLibraryManager() {
  const [source, setSource] = useState<Source>('database')
  const [folder, setFolder] = useState('general')
  const [assets, setAssets] = useState<Asset[]>([])
  const [databaseAssets, setDatabaseAssets] = useState<Asset[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [integrationID, setIntegrationID] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const availableIntegrations = useMemo(
    () => integrations.filter((item) => item.provider === source && item.enabled !== false),
    [integrations, source],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setNotice(null)
    try {
      const [libraryResponse, integrationResponse] = await Promise.all([
        fetch(`/api/media-library?source=${encodeURIComponent(source)}&folder=${encodeURIComponent(folder)}${integrationID ? `&integrationId=${encodeURIComponent(integrationID)}` : ''}`, { credentials: 'include', cache: 'no-store' }),
        fetch('/api/integrations', { credentials: 'include', cache: 'no-store' }),
      ])
      const library = await libraryResponse.json()
      const connected = await integrationResponse.json()
      if (!libraryResponse.ok || !library.ok) throw new Error(library.error || 'No se pudo abrir la biblioteca.')
      if (connected.ok) setIntegrations(connected.integrations || [])
      setAssets(library.assets || [])
      if (source === 'database') setDatabaseAssets(library.assets || [])
    } catch (error) {
      setAssets([])
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo abrir la biblioteca.' })
    } finally {
      setLoading(false)
    }
  }, [folder, integrationID, source])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const first = integrations.find((item) => item.provider === source && item.enabled !== false)
    setIntegrationID(first ? String(first.id) : '')
  }, [integrations, source])

  async function upload(file: File) {
    setUploading(true)
    setNotice(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('source', source)
      form.append('folder', folder)
      form.append('integrationId', integrationID)
      form.append('alt', file.name.replace(/\.[^.]+$/, ''))
      const response = await fetch('/api/media-library', { method: 'POST', body: form, credentials: 'include' })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'El proveedor no confirmó la subida.')
      setNotice({ type: 'success', text: 'Archivo subido y registrado en la biblioteca.' })
      await load()
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo subir el archivo.' })
    } finally {
      setUploading(false)
    }
  }

  async function move(asset: Asset) {
    const nextFolder = window.prompt('Carpeta de destino', folder)
    if (!nextFolder?.trim()) return
    try {
      const response = await fetch('/api/media-library', {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, integrationID, key: asset.key || asset.storageKey, mediaID: asset.id, folder: nextFolder }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo mover el archivo.')
      setNotice({ type: 'success', text: 'Archivo movido y referencia actualizada.' })
      await load()
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo mover el archivo.' })
    }
  }

  async function remove(asset: Asset) {
    if (!window.confirm(`¿Eliminar “${asset.name || asset.filename || asset.alt || 'este archivo'}”? Esta acción también borra el archivo remoto cuando corresponda.`)) return
    try {
      const response = await fetch('/api/media-library', {
        method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, integrationID, key: asset.key || asset.storageKey, mediaID: asset.id }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo eliminar el archivo.')
      setNotice({ type: 'success', text: 'Archivo y registro eliminados.' })
      await load()
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo eliminar el archivo.' })
    }
  }

  const linkedMedia = useMemo(() => new Map(databaseAssets.map((item) => [item.storageKey, item])), [databaseAssets])

  return (
    <main className="studio-page media-library-page">
      <div className="studio-page-head">
        <div>
          <p className="studio-kicker">Biblioteca central / Archivos persistentes / Carpetas</p>
          <h1>Una biblioteca, cuatro destinos.</h1>
          <p>La base de datos conserva metadatos y relaciones. Elige dónde vive cada archivo: subida nativa, Vercel Blob, Cloudinary o S3.</p>
        </div>
        <button className="studio-button" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} /> Actualizar</button>
      </div>

      {notice && <div className={`studio-notice studio-notice-${notice.type}`}>{notice.text}</div>}

      <section className="studio-card media-source-card">
        <div className="media-source-tabs" role="tablist" aria-label="Origen multimedia">
          {(Object.keys(SOURCE_COPY) as Source[]).map((item) => <button type="button" role="tab" aria-selected={source === item} key={item} className={source === item ? 'active' : ''} onClick={() => setSource(item)}>{item === 'database' ? <Database size={16} /> : <Cloud size={16} />}{SOURCE_COPY[item].label}</button>)}
        </div>
        <div className="media-source-controls">
          <div><strong>{SOURCE_COPY[source].label}</strong><p>{SOURCE_COPY[source].detail}</p></div>
          {source !== 'database' && <label className="studio-field"><span>Integración cifrada</span><select className="studio-select" value={integrationID} onChange={(event) => setIntegrationID(event.target.value)}><option value="">Seleccionar</option>{availableIntegrations.map((item) => <option key={item.id} value={String(item.id)}>{item.label} · {item.status || 'sin probar'}</option>)}</select></label>}
          <label className="studio-field"><span>Carpeta</span><input className="studio-input" value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="general" /></label>
          <label className="studio-button studio-button-primary media-upload-button"><ArrowUpFromLine size={16} /> {uploading ? 'Subiendo…' : 'Subir archivo'}<input hidden type="file" accept="image/*,video/mp4,application/pdf" disabled={uploading || (source !== 'database' && !integrationID)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = '' }} /></label>
        </div>
        {source !== 'database' && !integrationID && <p className="media-connect-note">Conecta este proveedor en Integraciones y vuelve aquí para subir, explorar, mover o eliminar archivos.</p>}
      </section>

      <section className="studio-card media-assets-card">
        <div className="studio-card-head"><div><h2>{source === 'database' ? 'Archivos registrados' : 'Archivos remotos'}</h2><p>{loading ? 'Consultando el origen…' : `${assets.length} archivo(s) en “${folder}”`}</p></div></div>
        {loading ? <div className="media-loading"><Loader2 className="spin" size={22} /> Cargando biblioteca…</div> : assets.length ? <div className="media-asset-grid">{assets.map((asset, index) => {
          const record = source === 'database' ? asset : linkedMedia.get(asset.key || '')
          const url = assetURL(record || asset)
          return <article className="media-asset" key={asset.id || asset.key || index}>
            <div className="media-asset-preview">{url ? <img src={url} alt={asset.alt || asset.name || asset.filename || 'Archivo multimedia'} /> : <ImageIcon size={26} />}</div>
            <div className="media-asset-copy"><strong>{asset.name || asset.filename || asset.alt || 'Archivo sin título'}</strong><small>{humanSize(asset.size)} · {asset.contentType || asset.mimeType || 'archivo'}</small>{record && source !== 'database' && <small>Registrado en PostgreSQL</small>}</div>
            <div className="media-asset-actions"><button type="button" onClick={() => void move({ ...asset, id: record?.id })} aria-label="Mover archivo"><FolderInput size={15} /></button><button type="button" className="danger" onClick={() => void remove({ ...asset, id: record?.id })} aria-label="Eliminar archivo"><Trash2 size={15} /></button></div>
          </article>
        })}</div> : <div className="media-empty"><ImageIcon size={28} /><strong>No hay archivos en esta carpeta.</strong><span>Sube uno o cambia la carpeta/origen.</span></div>}
      </section>
    </main>
  )
}
