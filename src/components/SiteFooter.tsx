import Image from 'next/image'
import Link from 'next/link'

import { appearanceProps } from '@/lib/appearance'
import { getMediaAlt, getMediaURL } from '@/lib/media'
import { PrivacySettingsButton } from './PrivacySettingsButton'

type Item = { id?: string | number; label?: string | null; url?: string | null }
type Social = { id?: string | number; platform?: string | null; url?: string | null }

export function SiteFooter({
  footer,
  settings,
}: {
  footer?: Record<string, any> | null
  settings?: Record<string, any> | null
}) {
  const links = Array.isArray(footer?.links) ? (footer.links as Item[]) : []
  const legalLinks = Array.isArray(footer?.legalLinks) ? (footer.legalLinks as Item[]) : []
  const social = Array.isArray(footer?.social) ? (footer.social as Social[]) : []
  const contact = (settings?.contact || {}) as { phone?: string; email?: string; address?: string }
  const brandName = String(settings?.brandName || 'FabrickBuild')
  const logoDoc = footer?.logo || settings?.logo
  const logo = getMediaURL(logoDoc, 'thumbnail')
  const backgroundMedia = getMediaURL(footer?.backgroundMedia, 'hero')
  const { className, style } = appearanceProps(footer?.appearance, 'site-footer')

  if (backgroundMedia) style.backgroundImage = `url("${backgroundMedia}")`

  return (
    <footer className={className} style={style}>
      <div className="cms-surface__overlay" aria-hidden="true" />
      <div className="shell footer-grid">
        <div className="footer-brand-column">
          <Link href="/" className="brand brand-light">
            {logo ? (
              <span className="brand-logo brand-logo--footer">
                <Image src={logo} alt={getMediaAlt(logoDoc, brandName)} fill sizes="56px" />
              </span>
            ) : (
              <span className="brand-mark">F</span>
            )}
            <span>{brandName === 'FabrickBuild' ? <>Fabrick<strong>Build</strong></> : brandName}</span>
          </Link>
          <p>{String(footer?.description || 'Construimos casas y resolvemos cada detalle.')}</p>
        </div>
        <div>
          <h3>Explorar</h3>
          {links.length ? (
            links.map((item, index) => <Link key={item.id || index} href={item.url || '/'}>{item.label}</Link>)
          ) : (
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
      <div className="shell footer-legal">
        <div>
          {(legalLinks.length ? legalLinks : [
            { label: 'Privacidad', url: '/privacidad' },
            { label: 'Cookies', url: '/cookies' },
            { label: 'Términos', url: '/terminos' },
          ]).map((item, index) => <Link key={item.id || index} href={item.url || '/'}>{item.label}</Link>)}
          {footer?.showPrivacySettings !== false && <PrivacySettingsButton />}
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} {String(footer?.copyrightText || `${brandName}. Todos los derechos reservados.`)}</span>
        <span>Base CMS bajo licencia MIT; atribución original preservada.</span>
      </div>
    </footer>
  )
}
