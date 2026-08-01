import Image from 'next/image'
import Link from 'next/link'

import { appearanceProps } from '@/lib/appearance'
import { getMediaAlt, getMediaURL } from '@/lib/media'
import { PrivacySettingsButton } from './PrivacySettingsButton'

type Item = { id?: string | number; label?: string | null; url?: string | null }
type Social = { id?: string | number; platform?: string | null; url?: string | null }

const defaultFooterAppearance = {
  surfaceMode: 'glass',
  surfaceColor: '#08090c',
  surfaceOpacity: 72,
  backdropBlur: 18,
  headingColor: '#ffffff',
  bodyColor: '#aaaab2',
  accentColor: '#ffffff',
  buttonColor: '#ffffff',
  buttonTextColor: '#090a0d',
  paddingTop: 58,
  paddingBottom: 22,
  overlayOpacity: 0,
}

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
  const portfolioName = String(footer?.portfolioName || settings?.portfolioName || 'Portafolio Fabrick')
  const logoDoc = footer?.logo || settings?.logo
  const logo = getMediaURL(logoDoc, 'thumbnail')
  const backgroundMedia = getMediaURL(footer?.backgroundMedia, 'hero')
  const { className, style } = appearanceProps(footer?.appearance || defaultFooterAppearance, 'site-footer site-footer--portfolio')

  if (backgroundMedia) style.backgroundImage = `url("${backgroundMedia}")`

  const navigation = links.length ? links : [
    { label: 'Servicios', url: '/servicios' },
    { label: 'Proyectos', url: '/proyectos' },
    { label: 'Cotización', url: '/#contacto' },
  ]

  return (
    <footer className={className} style={style}>
      <div className="cms-surface__overlay" aria-hidden="true" />
      <div className="shell footer-grid footer-grid--minimal">
        <div className="footer-brand-column">
          <Link href="/" className="brand brand-light footer-brand">
            {logo ? (
              <span className="brand-logo brand-logo--footer">
                <Image src={logo} alt={getMediaAlt(logoDoc, portfolioName)} fill sizes="46px" />
              </span>
            ) : (
              <span className="brand-mark" aria-hidden="true"><b>F</b><i /></span>
            )}
            <span className="footer-brand__name"><small>PORTAFOLIO</small><strong>Fabrick</strong></span>
          </Link>
          <p>{String(footer?.description || 'Experiencias digitales con diseño, código y movimiento para marcas que quieren ser recordadas.')}</p>
        </div>

        <nav className="footer-nav" aria-label="Navegación del pie">
          {navigation.map((item, index) => <Link key={item.id || index} href={item.url || '/'}>{item.label}</Link>)}
        </nav>

        <div className="footer-contact">
          <span>Hablemos</span>
          {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
          {contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}
          <small>{contact.address || 'Santiago, Chile'}</small>
          {social.length > 0 && (
            <div className="footer-social">
              {social.map((item, index) => (
                <a key={item.id || index} href={item.url || '#'} target="_blank" rel="noreferrer">{item.platform}</a>
              ))}
            </div>
          )}
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
        <span>© {new Date().getFullYear()} {portfolioName}</span>
        <span>Diseño · código · movimiento</span>
      </div>
    </footer>
  )
}
