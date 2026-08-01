'use client'

import { useEffect, useMemo, useState } from 'react'

type Media = { id?: string | number; filename?: string; url?: string | null; externalURL?: string | null; sizes?: Record<string, { url?: string | null } | null> | null }
type Background = { id: string | number; name?: string; kind?: string; image?: Media | null; poster?: Media | null; externalURL?: string | null; desktopFrames?: Media[] | null; mobileFrames?: Media[] | null; engine?: string; playback?: Record<string, any> }
type PageDoc = { id: string | number; title?: string; slug?: string; backgroundExperiences?: Array<{ background?: Background | string | number; enabled?: boolean }> }

const mediaURL = (media?: Media | null) => media?.externalURL || media?.sizes?.hero?.url || media?.sizes?.card?.url || media?.url || (media?.id ? `/api/media-file/${media.id}` : null)
const isVideo = (url?: string | null) => Boolean(url && /\.(mp4|webm|mov)(\?|$)/i.test(url))
const relationID = (value: unknown) => typeof value === 'object' && value && 'id' in value ? String((value as { id: unknown }).id) : String(value || '')

function backgroundIDFromURL() {
  if (typeof window === 'undefined') return null
  const candidate = window.location.pathname.match(/\/backgrounds\/([^/]+)(?:\/|$)/)?.[1] || ''
  return /^\d+$/.test(candidate) ? candidate : null
}

const presets = [
  { name: 'Suave', scrub: 0.6, length: 520, parallax: 6, description: 'Movimiento calmado para textos y servicios.' },
  { name: 'Cinematográfico', scrub: 0.35, length: 780, parallax: 12, description: 'Equilibrio recomendado entre control y fluidez.' },
  { name: 'Directo', scrub: 0.12, length: 420, parallax: 4, description: 'Respuesta rápida, ideal para secuencias cortas.' },
]

export default function BackgroundPreviewPanel() {
  const [background, setBackground] = useState<Background | null>(null)
  const [pages, setPages] = useState<PageDoc[]>([])
  const [selectedPage, setSelectedPage] = useState('')
  const [frame, setFrame] = useState(0)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('mobile')
  const [loading, setLoading] = useState(false)
  const [id, setID] = useState<string | null>(null)

  useEffect(() => setID(backgroundIDFromURL()), [])
  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    Promise.all([
      fetch(`/api/backgrounds/${id}?depth=2`, { credentials: 'include', cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
      fetch('/api/pages?depth=2&limit=100', { credentials: 'include', cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
    ]).then(([record, pageResult]) => {
      if (!active) return
      const nextBackground = record?.doc || record || null
      const candidates = ((pageResult?.docs || []) as PageDoc[]).filter((page) =>
        Array.isArray(page.backgroundExperiences) && page.backgroundExperiences.some((item) => relationID(item.background) === String(id) && item.enabled !== false),
      )
      setBackground(nextBackground)
      setPages(candidates)
      setSelectedPage(candidates[0]?.slug || '')
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
  const liveURL = selectedPage ? (selectedPage === 'home' ? '/' : `/${selectedPage}`) : ''

  useEffect(() => setFrame(0), [device, frames.length])
  useEffect(() => {
    if (frames.length < 2 || liveURL) return
    const timer = window.setInterval(() => setFrame((current) => (current + 1) % frames.length), Math.max(55, Math.min(220, Math.round(6000 / frames.length))))
    return () => window.clearInterval(timer)
  }, [frames.length, liveURL])

  return (
    <section className="preview-panel">
      <header><div><strong>Vista previa real y guía de reproducción</strong><p>Guarda el Background, asígnalo a una página y selecciónala aquí para comprobar exactamente cómo se comporta con su contenido.</p></div>{liveURL && <a href={liveURL} target="_blank" rel="noreferrer">Abrir página ↗</a>}</header>
      {!id && <div className="notice"><b>Primero guarda el Background</b><span>Payload necesita un ID real antes de relacionarlo con páginas y activar la vista previa.</span></div>}
      {loading && <div className="notice">Cargando relaciones y archivos…</div>}
      {!loading && id && <>
        <div className="toolbar">
          <label>Página donde se publica<select value={selectedPage} onChange={(event) => setSelectedPage(event.target.value)}><option value="">Preview aislado</option>{pages.map((page) => <option key={page.id} value={page.slug || ''}>{page.title || page.slug}</option>)}</select></label>
          <div><button type="button" className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')}>Escritorio</button><button type="button" className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')}>Móvil</button></div>
        </div>
        {liveURL ? <div className={`browser ${device}`}><div className="browser-bar"><i/><i/><i/><span>{liveURL}</span></div><iframe src={liveURL} title={`Vista previa de ${background?.name || 'background'}`} /></div> : <div className={`stage ${device}`}>{source ? (isVideo(source) ? <video src={source} muted autoPlay loop playsInline /> : <img src={source} alt="Vista previa del background" />) : <div className="notice">No hay archivos reproducibles.</div>}</div>}
        {!pages.length && <div className="warning"><b>Aún no está publicado en una página</b><span>Ve a Páginas → Diseño de página → Fondos animados y añade este Background. Después volverá a aparecer aquí como opción.</span></div>}
        {!liveURL && frames.length > 1 && <input aria-label="Elegir frame" type="range" min="0" max={frames.length - 1} value={Math.min(frame, frames.length - 1)} onChange={(event) => setFrame(Number(event.target.value))} />}
        <div className="settings"><div><b>Motor actual</b><span>{background?.engine || 'gsap-three'}</span></div><div><b>Trigger</b><span>{background?.playback?.trigger || 'scroll'}</span></div><div><b>Scrub</b><span>{background?.playback?.scrub ?? 0.35}</span></div><div><b>Recorrido</b><span>{background?.playback?.scrollLength ?? 780}px</span></div></div>
        <details><summary>¿Para qué sirve cada configuración?</summary><dl><dt>GSAP ScrollTrigger</dt><dd>Convierte la posición del scroll en progreso entre 0 y 1. Ese progreso decide qué frame se dibuja.</dd><dt>Three.js</dt><dd>Úsalo cuando necesites capas 3D, shaders o profundidad. Para una secuencia normal, Canvas 2D consume menos recursos.</dd><dt>Scrub</dt><dd>Suaviza el seguimiento. 0.1 responde rápido; 0.35 es equilibrado; 0.8 se siente más flotante.</dd><dt>Pin</dt><dd>Mantiene la escena fija mientras el usuario recorre los frames.</dd><dt>Snap</dt><dd>Ajusta el progreso al frame o punto más cercano cuando se detiene el scroll.</dd><dt>Scroll Length</dt><dd>Define cuánto recorrido necesita la animación. 420 es corto; 780 cinematográfico; 1200 lento.</dd><dt>Parallax</dt><dd>Desplaza luces, capas o textos para producir profundidad. Entre 6 y 16 suele ser suficiente.</dd><dt>Fit</dt><dd>Cover llena toda la pantalla y puede recortar; Contain muestra la imagen completa.</dd><dt>Overlay</dt><dd>Oscurece el fondo para mejorar la lectura del texto.</dd></dl><div className="presets">{presets.map((preset) => <article key={preset.name}><b>{preset.name}</b><code>scrub {preset.scrub} · length {preset.length} · parallax {preset.parallax}</code><span>{preset.description}</span></article>)}</div></details>
      </>}
      <style jsx>{`
        .preview-panel{margin:8px 0 24px;padding:clamp(14px,3vw,22px);border:1px solid var(--theme-elevation-150);border-radius:12px;background:var(--theme-elevation-50)}header{display:flex;justify-content:space-between;gap:16px}header strong{font-size:18px}header p{max-width:75ch;color:var(--theme-elevation-600);line-height:1.55}header a{height:max-content;padding:10px 13px;border:1px solid var(--theme-elevation-250);border-radius:8px;color:var(--theme-text);text-decoration:none}.notice,.warning{display:grid;gap:6px;margin-top:15px;padding:14px;border:1px solid var(--theme-elevation-150);border-radius:9px;background:var(--theme-elevation-100)}.warning{border-color:var(--theme-warning-500)}.notice span,.warning span{color:var(--theme-elevation-600)}.toolbar{display:flex;justify-content:space-between;align-items:end;gap:12px;margin:18px 0 10px}.toolbar label{display:grid;gap:6px;min-width:min(100%,340px);font-size:12px}.toolbar select,.toolbar button{min-height:40px;padding:8px 10px;border:1px solid var(--theme-elevation-250);border-radius:7px;background:var(--theme-input-bg);color:var(--theme-text)}.toolbar button.active{background:var(--theme-elevation-800);color:var(--theme-elevation-0)}.browser,.stage{overflow:hidden;margin:auto;border:1px solid var(--theme-elevation-250);border-radius:10px;background:#111}.browser.mobile,.stage.mobile{max-width:390px}.browser-bar{display:flex;align-items:center;gap:6px;height:34px;padding:0 10px;background:var(--theme-elevation-100)}.browser-bar i{width:8px;height:8px;border-radius:50%;background:var(--theme-elevation-400)}.browser-bar span{margin-left:6px;color:var(--theme-elevation-500);font-size:10px}.browser iframe{display:block;width:100%;height:600px;border:0;background:#111}.browser.mobile iframe{height:720px}.stage{min-height:320px}.stage.mobile{min-height:620px}.stage img,.stage video{display:block;width:100%;height:100%;min-height:320px;object-fit:cover}.stage.mobile img,.stage.mobile video{min-height:620px}input[type=range]{width:100%;margin-top:12px}.settings{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}.settings>div{display:grid;gap:4px;padding:11px;border:1px solid var(--theme-elevation-150);border-radius:8px}.settings span{color:var(--theme-elevation-600);font-size:12px}details{margin-top:14px;padding:14px;border:1px solid var(--theme-elevation-150);border-radius:9px}summary{cursor:pointer;font-weight:800}dl{display:grid;grid-template-columns:150px 1fr;gap:8px 14px}dt{font-weight:800}dd{margin:0;color:var(--theme-elevation-600);line-height:1.5}.presets{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.presets article{display:grid;gap:5px;padding:11px;border-radius:8px;background:var(--theme-elevation-100)}.presets code,.presets span{font-size:11px;color:var(--theme-elevation-600)}@media(max-width:720px){header,.toolbar{flex-direction:column;align-items:stretch}.toolbar>div{display:grid;grid-template-columns:1fr 1fr}.settings,.presets{grid-template-columns:1fr}dl{grid-template-columns:1fr}.browser iframe{height:620px}}
      `}</style>
    </section>
  )
}
