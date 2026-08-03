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
          <p>Puedes crear una página conectada a Payload o comenzar en el editor local sin depender de PostgreSQL.</p>
        </div>
        <nav>
          <a className="pages-overview__primary" href="/admin/collections/pages/create">Crear en Payload</a>
          <a href="/editor-local" target="_blank" rel="noreferrer">Diseñar sin base de datos</a>
        </nav>
        <style>{styles}</style>
      </section>
    )
  }

  return (
    <section className="pages-overview">
      <header>
        <div>
          <small>EDITOR VISUAL GLOBAL</small>
          <h2>Páginas publicadas y borradores</h2>
          <p>Las tarjetas ya no cargan iframes ni animaciones pesadas. Abre una página para editarla en vivo.</p>
        </div>
        <a href="/editor-local" target="_blank" rel="noreferrer">Modo local</a>
      </header>
      <div className="pages-overview__grid">
        {docs.map((page: any) => {
          const slug = typeof page.slug === 'string' ? page.slug : 'home'
          const live = pageURL(slug)
          const preview = `/preview-page/${encodeURIComponent(slug)}?secret=${encodeURIComponent(secret)}`
          return (
            <article key={page.id}>
              <div className="pages-overview__visual" aria-hidden="true">
                <span>{page._status === 'published' ? 'PUBLICADA' : 'BORRADOR'}</span>
                <strong>{page.title || slug}</strong>
                <code>{live}</code>
              </div>
              <div className="pages-overview__meta">
                <nav>
                  <a className="pages-overview__primary" href={`/admin/collections/pages/${page.id}`}>Abrir editor visual</a>
                  <a href={preview} target="_blank" rel="noreferrer">Vista publicada</a>
                </nav>
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
.pages-overview{margin:0 0 24px;padding:18px;border:1px solid var(--theme-elevation-150);border-radius:14px;background:var(--theme-elevation-50)}.pages-overview header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}.pages-overview small{font-size:10px;font-weight:900;letter-spacing:.14em;color:#d5a820}.pages-overview h2{margin:5px 0;font-size:22px}.pages-overview p{margin:0;color:var(--theme-elevation-600);line-height:1.5}.pages-overview__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.pages-overview article{overflow:hidden;border:1px solid var(--theme-elevation-150);border-radius:12px;background:var(--theme-elevation-0)}.pages-overview__visual{min-height:180px;display:grid;align-content:end;gap:7px;padding:18px;color:#fff;background:radial-gradient(circle at 80% 10%,rgba(244,200,75,.28),transparent 38%),linear-gradient(145deg,#080b0c,#172023)}.pages-overview__visual span{font-size:9px;font-weight:900;letter-spacing:.12em;color:#f4c84b}.pages-overview__visual strong{font-size:clamp(20px,3vw,30px)}.pages-overview__visual code{color:#aeb7b9}.pages-overview__meta{padding:12px}.pages-overview nav{display:flex;flex-wrap:wrap;gap:7px}.pages-overview a{padding:9px 11px;border:1px solid var(--theme-elevation-200);border-radius:8px;color:var(--theme-text);text-decoration:none}.pages-overview a:hover{border-color:#d5a820}.pages-overview .pages-overview__primary{color:#17140e;border-color:#e4a400;background:#e4a400;font-weight:800}.pages-overview--empty{display:flex;justify-content:space-between;align-items:center;gap:18px}@media(max-width:720px){.pages-overview{padding:12px}.pages-overview header,.pages-overview--empty{display:grid}.pages-overview__grid{grid-template-columns:1fr}.pages-overview nav{display:grid}.pages-overview a{text-align:center}.pages-overview__visual{min-height:150px}}
`