import type { BeforeListTableServerProps } from 'payload'

const pageURL = (slug?: string | null) => !slug || slug === 'home' ? '/' : `/${slug}`

export default function PagesOverview({ data }: BeforeListTableServerProps) {
  const docs = Array.isArray(data?.docs) ? data.docs : []
  const secret = process.env.PREVIEW_SECRET || ''

  if (!docs.length) {
    return (
      <section className="pages-overview pages-overview--empty">
        <div>
          <small>PÁGINAS · PAYLOAD</small>
          <h2>No hay páginas en esta base de datos</h2>
          <p>Este deployment puede estar conectado a otra base PostgreSQL. Crea Inicio aquí y seguirá usando el editor oficial de Payload.</p>
        </div>
        <a href="/admin/collections/pages/create">Crear página</a>
        <style>{styles}</style>
      </section>
    )
  }

  return (
    <section className="pages-overview">
      <header>
        <div><small>VISTA REAL</small><h2>Páginas publicadas y borradores</h2><p>Edita exclusivamente desde Payload y abre la vista real del mismo deployment.</p></div>
      </header>
      <div className="pages-overview__grid">
        {docs.map((page: any) => {
          const slug = typeof page.slug === 'string' ? page.slug : 'home'
          const live = pageURL(slug)
          const preview = `/preview-page/${encodeURIComponent(slug)}?secret=${encodeURIComponent(secret)}`
          return (
            <article key={page.id}>
              <div className="pages-overview__browser"><iframe src={preview} title={`Vista previa de ${page.title || slug}`} loading="lazy" /></div>
              <div className="pages-overview__meta">
                <span>{page._status === 'published' ? 'PUBLICADA' : 'BORRADOR'}</span>
                <strong>{page.title || slug}</strong>
                <code>{live}</code>
                <nav><a href={`/admin/collections/pages/${page.id}`}>Editar en Payload</a><a href={preview} target="_blank" rel="noreferrer">Vista previa</a></nav>
              </div>
            </article>
          )
        })}
      </div>
      <style>{styles}</style>
    </section>
  )
}

const styles = `
.pages-overview{margin:0 0 24px;padding:18px;border:1px solid var(--theme-elevation-150);border-radius:12px;background:var(--theme-elevation-50)}.pages-overview header{margin-bottom:14px}.pages-overview small{font-size:10px;font-weight:900;letter-spacing:.14em;color:#d5a820}.pages-overview h2{margin:5px 0;font-size:22px}.pages-overview p{margin:0;color:var(--theme-elevation-600);line-height:1.5}.pages-overview__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.pages-overview article{overflow:hidden;border:1px solid var(--theme-elevation-150);border-radius:10px;background:var(--theme-elevation-0)}.pages-overview__browser{height:210px;overflow:hidden;background:#111}.pages-overview iframe{width:1440px;height:900px;border:0;transform:scale(.2);transform-origin:top left;pointer-events:none}.pages-overview__meta{display:grid;gap:7px;padding:13px}.pages-overview__meta span{font-size:9px;font-weight:900;letter-spacing:.12em;color:#d5a820}.pages-overview__meta strong{font-size:18px}.pages-overview__meta code{color:var(--theme-elevation-500)}.pages-overview nav{display:flex;gap:7px;margin-top:5px}.pages-overview a{padding:8px 10px;border:1px solid var(--theme-elevation-200);border-radius:7px;color:var(--theme-text);text-decoration:none}.pages-overview--empty{display:flex;justify-content:space-between;align-items:center;gap:18px}@media(max-width:720px){.pages-overview{padding:12px}.pages-overview__grid{grid-template-columns:1fr}.pages-overview__browser{height:180px}.pages-overview iframe{transform:scale(.18)}.pages-overview--empty{display:grid}.pages-overview nav{display:grid}}
`