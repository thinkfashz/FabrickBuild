'use client'

import { useEffect, useMemo, useState } from 'react'

type Media = { id: string | number; filename?: string; url?: string; filesize?: number; frameOrder?: number }
type Background = { id: string | number; name?: string; slug?: string; status?: string; device?: string; desktopFrames?: Media[]; mobileFrames?: Media[]; updatedAt?: string }

const mediaURL = (item: Media) => item.url || `/api/media/file/${item.id}`

export default function BackgroundsLibraryOverview() {
  const [docs, setDocs] = useState<Background[]>([])
  const [open, setOpen] = useState<string>('')
  const [message, setMessage] = useState('Cargando backgrounds…')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const response = await fetch('/api/backgrounds?depth=2&limit=100&sort=-updatedAt', { credentials: 'include', cache: 'no-store' })
      const json = await response.json()
      if (!response.ok) throw new Error(json?.message || 'No fue posible consultar Backgrounds.')
      setDocs(json.docs || [])
      setMessage(`${json.totalDocs || json.docs?.length || 0} backgrounds encontrados.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error consultando Backgrounds.') }
  }

  useEffect(() => { void load() }, [])

  const totalFrames = useMemo(() => docs.reduce((sum, doc) => sum + (doc.desktopFrames?.length || 0) + (doc.mobileFrames?.length || 0), 0), [docs])

  async function removeFrame(backgroundId: string | number, mediaId: string | number, device: 'desktop' | 'mobile') {
    if (!window.confirm('¿Eliminar este frame de la secuencia y de Multimedia?')) return
    setBusy(true)
    try {
      const response = await fetch('/api/background-frame-manager', {
        method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backgroundId, mediaId, device, deleteMedia: true }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json?.message || 'No se pudo eliminar el frame.')
      setMessage(json.message || 'Frame eliminado.')
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error eliminando el frame.') }
    finally { setBusy(false) }
  }

  return <section className="bg-library">
    <header><div><small>BACKGROUND LIBRARY</small><h2>Secuencias guardadas</h2><p>{message}</p></div><div><b>{docs.length}</b><span>backgrounds</span><b>{totalFrames}</b><span>frames</span></div></header>
    <div className="bg-grid">{docs.map((doc) => {
      const frames = [...(doc.desktopFrames || []).map((item) => ({ ...item, target: 'desktop' as const })), ...(doc.mobileFrames || []).map((item) => ({ ...item, target: 'mobile' as const }))]
      const expanded = open === String(doc.id)
      return <article key={doc.id}>
        <div className="card-head"><div><span data-status={doc.status}>{doc.status || 'draft'}</span><strong>{doc.name || doc.slug || `Background ${doc.id}`}</strong><small>{doc.device || 'responsive'} · {frames.length} frames</small></div><nav><a href={`/admin/collections/backgrounds/${doc.id}`}>Editar</a><button type="button" onClick={() => setOpen(expanded ? '' : String(doc.id))}>{expanded ? 'Cerrar' : 'Ver frames'}</button></nav></div>
        {expanded && <div className="frame-grid">{frames.length ? frames.sort((a,b)=>(a.frameOrder||0)-(b.frameOrder||0)).map((frame) => <figure key={`${frame.target}-${frame.id}`}><img src={mediaURL(frame)} alt={frame.filename || 'Frame'} loading="lazy"/><figcaption><b>{frame.frameOrder || '—'}</b><span>{frame.target}</span><button disabled={busy} onClick={() => void removeFrame(doc.id, frame.id, frame.target)}>Eliminar</button></figcaption></figure>) : <p>No hay frames relacionados.</p>}</div>}
      </article>
    })}</div>
    <style jsx>{`.bg-library{margin:0 0 22px;padding:16px;border:1px solid var(--theme-elevation-150);border-radius:12px;background:var(--theme-elevation-50)}header{display:flex;justify-content:space-between;gap:15px;margin-bottom:14px}header small{font-size:10px;font-weight:900;letter-spacing:.14em;color:#d5a820}h2{margin:5px 0}p{margin:0;color:var(--theme-elevation-600)}header>div:last-child{display:grid;grid-template-columns:auto auto;gap:3px 8px;text-align:right}.bg-grid{display:grid;gap:9px}.bg-grid>article{border:1px solid var(--theme-elevation-150);border-radius:10px;background:var(--theme-elevation-0)}.card-head{display:flex;justify-content:space-between;gap:12px;padding:13px}.card-head>div{display:grid;gap:4px}.card-head span{width:max-content;font-size:9px;font-weight:900;text-transform:uppercase;color:#d5a820}.card-head strong{font-size:17px}.card-head small{color:var(--theme-elevation-500)}nav{display:flex;gap:7px;align-items:center}a,button{padding:8px 10px;border:1px solid var(--theme-elevation-200);border-radius:7px;background:transparent;color:var(--theme-text);text-decoration:none;cursor:pointer}.frame-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(115px,1fr));gap:7px;padding:10px;border-top:1px solid var(--theme-elevation-150)}figure{margin:0;overflow:hidden;border:1px solid var(--theme-elevation-150);border-radius:8px;background:#111}img{display:block;width:100%;aspect-ratio:9/14;object-fit:cover}figcaption{display:grid;grid-template-columns:auto 1fr;gap:4px;padding:6px;color:#fff;font-size:9px}figcaption button{grid-column:1/-1;padding:6px;color:#ff9dad;border-color:#7a2838}@media(max-width:720px){header,.card-head{display:grid}nav{display:grid;grid-template-columns:1fr 1fr}.frame-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}`}</style>
  </section>
}
