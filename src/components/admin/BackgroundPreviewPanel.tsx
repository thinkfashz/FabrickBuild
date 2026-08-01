'use client'

import { useEffect, useMemo, useState } from 'react'

type Media = { id?: string | number; filename?: string; url?: string | null; externalURL?: string | null; sizes?: Record<string, { url?: string | null } | null> | null }
type Background = { id: string | number; name?: string; kind?: string; image?: Media | null; poster?: Media | null; externalURL?: string | null; desktopFrames?: Media[] | null; mobileFrames?: Media[] | null }
type Doctor = { ok?: boolean; configuredOnHome?: boolean; issues?: string[]; error?: string; frames?: { desktop: number; mobile: number; total: number; usable: number; missing: number } }

const mediaURL = (media?: Media | null) => media?.externalURL || media?.sizes?.hero?.url || media?.sizes?.card?.url || media?.url || (media?.id ? `/api/media-file/${media.id}` : null)
const isVideo = (url?: string | null) => Boolean(url && /\.(mp4|webm|mov)(\?|$)/i.test(url))

function backgroundIDFromURL() {
  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(/\/backgrounds\/([^/]+)(?:\/|$)/)
  const candidate = match?.[1] || ''
  if (!candidate || candidate === 'create' || candidate === 'new') return null
  return /^\d+$/.test(candidate) ? candidate : null
}

export default function BackgroundPreviewPanel() {
  const [background, setBackground] = useState<Background | null>(null)
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [frame, setFrame] = useState(0)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [loading, setLoading] = useState(false)
  const [id, setID] = useState<string | null>(null)

  useEffect(() => setID(backgroundIDFromURL()), [])
  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    Promise.all([
      fetch(`/api/backgrounds/${id}?depth=2`, { credentials: 'include', cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
      fetch(`/api/media-doctor?background=${id}`, { credentials: 'include', cache: 'no-store' }).then((response) => response.ok ? response.json() : null).catch(() => null),
    ]).then(([record, health]) => {
      if (!active) return
      setBackground(record?.doc || record || null)
      setDoctor(health)
      setLoading(false)
    })
    return () => { active = false }
  }, [id])

  const frames = useMemo(() => {
    if (!background) return []
    const selected = device === 'mobile' && background.mobileFrames?.length ? background.mobileFrames : background.desktopFrames?.length ? background.desktopFrames : background.mobileFrames || []
    return selected.map(mediaURL).filter((url): url is string => Boolean(url))
  }, [background, device])
  const source = frames.length ? frames[Math.min(frame, frames.length - 1)] : mediaURL(background?.image) || background?.externalURL || mediaURL(background?.poster)

  useEffect(() => setFrame(0), [device, frames.length])
  useEffect(() => {
    if (frames.length < 2) return
    const timer = window.setInterval(() => setFrame((current) => (current + 1) % frames.length), Math.max(55, Math.min(220, Math.round(6000 / frames.length))))
    return () => window.clearInterval(timer)
  }, [frames.length])

  return (
    <section className="background-preview-panel">
      <header className="background-preview-panel__heading">
        <div><strong>Proceso guiado y vista previa</strong><p>1. Configura nombre y destino. 2. Abre Frames. 3. Genera o selecciona la secuencia. 4. Pulsa “Enviar y aplicar”. 5. Guarda el Background. 6. Comprueba aquí el resultado.</p></div>
        <a href="/" target="_blank" rel="noreferrer">Abrir Inicio ↗</a>
      </header>

      {!id && <div className="background-preview-panel__new"><b>Estás creando un Background nuevo</b><span>No se realizará ninguna consulta con el valor “create”. Completa los pasos y guarda una vez para activar el diagnóstico.</span></div>}
      {loading && <p className="background-preview-panel__empty">Cargando Background guardado…</p>}
      {!loading && id && (
        <>
          <div className="background-preview-panel__toolbar">
            <button type="button" className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')}>Escritorio</button>
            <button type="button" className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')}>Móvil</button>
            <span>{background?.name || 'Background'} · {frames.length ? `${frame + 1} / ${frames.length}` : 'archivo único'}</span>
          </div>
          <div className={`background-preview-panel__stage ${device === 'mobile' ? 'is-mobile' : ''}`}>
            {source ? (isVideo(source) ? <video src={source} muted autoPlay loop playsInline /> : <img src={source} alt="Vista previa" />) : <div className="background-preview-panel__empty">Todavía no hay archivos relacionados.</div>}
          </div>
          {frames.length > 1 && <input aria-label="Elegir frame" type="range" min="0" max={frames.length - 1} value={Math.min(frame, frames.length - 1)} onChange={(event) => setFrame(Number(event.target.value))} />}
          <div className="background-preview-panel__report">
            <b>{doctor?.configuredOnHome ? '✓ Asignado a Inicio' : '○ Pendiente de asignar a Inicio'}</b>
            {doctor?.frames && <span>{doctor.frames.usable}/{doctor.frames.total} reproducibles · web {doctor.frames.desktop} · móvil {doctor.frames.mobile}</span>}
            {doctor?.issues?.length ? <ul>{doctor.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : <span className="ok">Conexión estructural correcta.</span>}
            {doctor?.error && <span className="warning">Diagnóstico: {doctor.error}</span>}
          </div>
        </>
      )}
      <style jsx>{`
        .background-preview-panel{margin:8px 0 24px;padding:clamp(14px,3vw,22px);border:1px solid color-mix(in srgb,var(--theme-elevation-150) 70%,#f1bf36 30%);border-radius:17px;background:linear-gradient(145deg,color-mix(in srgb,var(--theme-elevation-50) 94%,#f1bf36 6%),var(--theme-elevation-50));box-shadow:0 14px 34px rgba(0,0,0,.08)}
        .background-preview-panel__heading{display:flex;gap:16px;justify-content:space-between}.background-preview-panel__heading strong{font-size:17px}.background-preview-panel__heading p{max-width:75ch;line-height:1.55;color:var(--theme-elevation-650)}.background-preview-panel__heading a{height:max-content;padding:10px 13px;border-radius:9px;background:#d4a51d;color:#15120b;text-decoration:none;font-weight:800;white-space:nowrap}
        .background-preview-panel__new,.background-preview-panel__report{display:grid;gap:7px;margin-top:16px;padding:14px;border-radius:12px;background:var(--theme-elevation-100)}.background-preview-panel__new span,.background-preview-panel__report span{color:var(--theme-elevation-650)}
        .background-preview-panel__toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:17px 0 10px}.background-preview-panel__toolbar button{padding:8px 11px;border:1px solid var(--theme-elevation-250);border-radius:999px;background:transparent;color:var(--theme-text)}.background-preview-panel__toolbar button.active{background:var(--theme-elevation-900);color:var(--theme-elevation-0)}.background-preview-panel__toolbar span{margin-left:auto;font-size:12px}
        .background-preview-panel__stage{overflow:hidden;min-height:260px;border-radius:13px;background:#111}.background-preview-panel__stage.is-mobile{width:min(100%,330px);min-height:430px;margin:auto}.background-preview-panel__stage img,.background-preview-panel__stage video{display:block;width:100%;height:100%;min-height:260px;object-fit:cover}.background-preview-panel__stage.is-mobile img,.background-preview-panel__stage.is-mobile video{min-height:430px}.background-preview-panel__empty{display:grid;place-items:center;min-height:120px;text-align:center;color:var(--theme-elevation-600)}input[type=range]{width:100%;margin-top:12px;accent-color:#d4a51d}.ok{color:#27875d!important;font-weight:700}.warning,li{color:#b87526}
        @media(max-width:720px){.background-preview-panel__heading{flex-direction:column}.background-preview-panel__heading a{width:100%;text-align:center}.background-preview-panel__toolbar span{width:100%;margin-left:0}}
      `}</style>
    </section>
  )
}
