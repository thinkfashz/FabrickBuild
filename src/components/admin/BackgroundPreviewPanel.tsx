'use client'

import { useEffect, useMemo, useState } from 'react'

type Media = {
  id?: string | number
  filename?: string
  url?: string | null
  externalURL?: string | null
  sizes?: Record<string, { url?: string | null } | null> | null
}

type Background = {
  id: string | number
  name?: string
  kind?: string
  image?: Media | null
  poster?: Media | null
  externalURL?: string | null
  desktopFrames?: Media[] | null
  mobileFrames?: Media[] | null
}

type Doctor = {
  ok?: boolean
  configuredOnHome?: boolean
  issues?: string[]
  error?: string
  frames?: { desktop: number; mobile: number; total: number; usable: number; missing: number }
}

const mediaURL = (media: Media | null | undefined) => {
  if (!media) return null
  return media.externalURL || media.sizes?.hero?.url || media.sizes?.card?.url || media.url || (media.id ? `/api/media-file/${media.id}` : null)
}

const backgroundIDFromURL = () => {
  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(/\/backgrounds\/([^/]+)(?:\/|$)/)
  return match?.[1] || null
}

const isVideo = (url?: string | null) => Boolean(url && /\.(mp4|webm|mov)(\?|$)/i.test(url))

export default function BackgroundPreviewPanel() {
  const [background, setBackground] = useState<Background | null>(null)
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [frame, setFrame] = useState(0)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [loading, setLoading] = useState(true)
  const [id, setID] = useState<string | null>(null)

  useEffect(() => setID(backgroundIDFromURL()), [])

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let active = true
    const load = async () => {
      setLoading(true)
      const [record, health] = await Promise.all([
        fetch(`/api/backgrounds/${encodeURIComponent(id)}?depth=2`, { credentials: 'include', cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
        fetch(`/api/media-doctor?background=${encodeURIComponent(id)}`, { credentials: 'include', cache: 'no-store' }).then((response) => response.json()).catch(() => null),
      ])
      if (!active) return
      setBackground(record?.doc || record || null)
      setDoctor(health)
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [id])

  const frames = useMemo(() => {
    if (!background) return []
    const selected = device === 'mobile' && background.mobileFrames?.length
      ? background.mobileFrames
      : background.desktopFrames?.length
        ? background.desktopFrames
        : background.mobileFrames || []
    return selected.map(mediaURL).filter((url): url is string => Boolean(url))
  }, [background, device])

  const source = frames.length
    ? frames[Math.min(frame, frames.length - 1)]
    : mediaURL(background?.image) || background?.externalURL || mediaURL(background?.poster)

  useEffect(() => setFrame(0), [device, frames.length])
  useEffect(() => {
    if (frames.length < 2) return
    const interval = Math.max(45, Math.min(240, Math.round(6000 / frames.length)))
    const timer = window.setInterval(() => setFrame((current) => (current + 1) % frames.length), interval)
    return () => window.clearInterval(timer)
  }, [frames.length])

  return (
    <section className="background-preview-panel">
      <div className="background-preview-panel__heading">
        <div>
          <strong>Vista previa y Media Doctor</strong>
          <p>Comprueba el archivo, el orden completo y la relación con Inicio antes de publicar. No se recorta la secuencia a 60 frames.</p>
        </div>
        <a href="/" target="_blank" rel="noreferrer">Abrir Inicio ↗</a>
      </div>

      {!id && <p className="background-preview-panel__empty">Guarda primero este Background para activar la vista previa y el diagnóstico.</p>}
      {loading && id && <p className="background-preview-panel__empty">Cargando preview del Background…</p>}
      {!loading && id && (
        <>
          <div className="background-preview-panel__toolbar">
            <button type="button" className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')}>Escritorio</button>
            <button type="button" className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')}>Móvil</button>
            <span>{background?.name || 'Background'} · {frames.length ? `frame ${String(Math.min(frame + 1, frames.length)).padStart(3, '0')} / ${frames.length}` : 'archivo único'}</span>
          </div>

          <div className={`background-preview-panel__stage ${device === 'mobile' ? 'is-mobile' : ''}`}>
            {source ? (
              isVideo(source)
                ? <video src={source} muted autoPlay loop playsInline controls={false} />
                : <img src={source} alt="Vista previa del background" onError={(event) => { event.currentTarget.dataset.error = 'true' }} />
            ) : <div className="background-preview-panel__empty">No hay un archivo reproducible asignado todavía.</div>}
            <div className="background-preview-panel__veil"><b>FabrickBuild</b><span>Preview cinematográfico</span></div>
          </div>

          {frames.length > 1 && (
            <input aria-label="Elegir frame" type="range" min="0" max={frames.length - 1} value={Math.min(frame, frames.length - 1)} onChange={(event) => setFrame(Number(event.target.value))} />
          )}

          <div className="background-preview-panel__report">
            <b>{doctor?.configuredOnHome ? '✓ Configurado para Inicio' : '○ Aún no se ha asignado a Inicio'}</b>
            {doctor?.frames && <span>{doctor.frames.usable}/{doctor.frames.total} frames reproducibles · web {doctor.frames.desktop} · móvil {doctor.frames.mobile}</span>}
            {doctor?.issues?.length ? <ul>{doctor.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : <span className="ok">Sin problemas estructurales detectados.</span>}
            {doctor?.error && <span className="warning">No se pudo obtener el diagnóstico: {doctor.error}</span>}
          </div>
        </>
      )}

      <style jsx>{`
        .background-preview-panel{margin:8px 0 24px;padding:clamp(13px,3vw,22px);border:1px solid color-mix(in srgb,var(--theme-elevation-150) 72%,#f1bf36 28%);border-radius:16px;background:linear-gradient(135deg,color-mix(in srgb,var(--theme-elevation-50) 92%,#f1bf36 8%),var(--theme-elevation-50));box-shadow:0 14px 34px rgba(0,0,0,.07)}
        .background-preview-panel__heading{display:flex;gap:16px;align-items:flex-start;justify-content:space-between}.background-preview-panel__heading strong{font-size:16px}.background-preview-panel__heading p{margin:5px 0 0;color:var(--theme-elevation-600);line-height:1.5}.background-preview-panel__heading a{white-space:nowrap;border-radius:8px;padding:9px 11px;background:#d4a51d;color:#15120b;text-decoration:none;font-weight:800}
        .background-preview-panel__toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:17px 0 10px}.background-preview-panel__toolbar button{border:1px solid var(--theme-elevation-250);border-radius:999px;background:transparent;color:var(--theme-text);padding:7px 10px;cursor:pointer}.background-preview-panel__toolbar button.active{background:var(--theme-elevation-900);color:var(--theme-elevation-0)}.background-preview-panel__toolbar span{margin-left:auto;color:var(--theme-elevation-600);font-size:12px}
        .background-preview-panel__stage{position:relative;overflow:hidden;min-height:260px;border-radius:12px;background:#151712}.background-preview-panel__stage.is-mobile{width:min(100%,330px);min-height:420px;margin-inline:auto}.background-preview-panel__stage img,.background-preview-panel__stage video{display:block;width:100%;height:100%;min-height:260px;object-fit:cover}.background-preview-panel__stage.is-mobile img,.background-preview-panel__stage.is-mobile video{min-height:420px}.background-preview-panel__veil{position:absolute;inset:auto 0 0;padding:28px 16px 14px;display:grid;gap:3px;color:white;background:linear-gradient(transparent,rgba(0,0,0,.74));font-size:11px;letter-spacing:.09em;text-transform:uppercase}.background-preview-panel__veil b{font-size:13px}.background-preview-panel__stage :global(img[data-error]){opacity:.2}
        input[type=range]{width:100%;accent-color:#d4a51d;margin-top:12px}.background-preview-panel__report{display:grid;gap:5px;margin-top:13px;padding:12px;border-radius:10px;background:var(--theme-elevation-100);font-size:13px}.background-preview-panel__report span{color:var(--theme-elevation-650)}.background-preview-panel__report .ok{color:#27875d;font-weight:700}.background-preview-panel__report .warning,li{color:#b87526}.background-preview-panel__report ul{margin:3px 0 0;padding-left:18px}.background-preview-panel__empty{display:grid;place-items:center;min-height:110px;margin:14px 0 0;color:var(--theme-elevation-600);text-align:center}
        @media(max-width:720px){.background-preview-panel__heading{flex-direction:column}.background-preview-panel__heading a{width:100%;text-align:center}.background-preview-panel__toolbar span{width:100%;margin-left:0}.background-preview-panel__stage{min-height:210px}.background-preview-panel__stage img,.background-preview-panel__stage video{min-height:210px}}
      `}</style>
    </section>
  )
}
