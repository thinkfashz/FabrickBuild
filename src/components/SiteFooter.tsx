import Link from 'next/link'

type Item = { id?: string | number; label?: string | null; url?: string | null }
type Social = { id?: string | number; platform?: string | null; url?: string | null }

export function SiteFooter({
  footer,
  settings
}: {
  footer?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
}) {
  const links = Array.isArray(footer?.links) ? (footer.links as Item[]) : []
  const social = Array.isArray(footer?.social) ? (footer.social as Social[]) : []
  const contact = (settings?.contact || {}) as {
    phone?: string
    email?: string
    address?: string
  }

  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Link href="/" className="brand brand-light">
            <span className="brand-mark">F</span>
            <span>Fabrick<strong>Build</strong></span>
          </Link>
          <p>{String(footer?.description || 'Construimos casas y resolvemos cada detalle.')}</p>
        </div>
        <div>
          <h3>Explorar</h3>
          {links.length ? links.map((item, index) => (
            <Link key={item.id || index} href={item.url || '/'}>{item.label}</Link>
          )) : (
            <>
              <Link href="/servicios">Servicios</Link>
              <Link href="/proyectos">Proyectos</Link>
              <Link href="/#contacto">Cotización</Link>
            </>
          )}
        </div>
        <div>
          <h3>Contacto</h3>
          {contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}
          {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
          <span>{contact.address || 'Santiago, Chile'}</span>
        </div>
        <div>
          <h3>Redes</h3>
          {social.map((item, index) => (
            <a key={item.id || index} href={item.url || '#'} target="_blank" rel="noreferrer">
              {item.platform}
            </a>
          ))}
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} FabrickBuild.</span>
        <span>Base CMS bajo licencia MIT; atribución original preservada.</span>
      </div>
    </footer>
  )
}
