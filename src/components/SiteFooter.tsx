import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { appearanceProps } from '@/lib/appearance'
import { getMediaURL } from '@/lib/media'
import { PrivacySettingsButton } from './PrivacySettingsButton'

type Item = { id?: string | number; label?: string | null; url?: string | null }
type Social = { id?: string | number; platform?: string | null; url?: string | null }

const defaultFooterAppearance = {
  surfaceMode: 'glass', surfaceColor: '#08090c', surfaceOpacity: 72, backdropBlur: 18,
  headingColor: '#ffffff', bodyColor: '#aaaab2', accentColor: '#ffffff', buttonColor: '#ffffff',
  buttonTextColor: '#090a0d', paddingTop: 58, paddingBottom: 22, overlayOpacity: 0,
}

export function SiteFooter({ footer, settings }: { footer?: Record<string, any> | null; settings?: Record<string, any> | null }) {
  const links = Array.isArray(footer?.links) ? (footer.links as Item[]) : []
  const legalLinks = Array.isArray(footer?.legalLinks) ? (footer.legalLinks as Item[]) : []
  const social = Array.isArray(footer?.social) ? (footer.social as Social[]) : []
  const contact = (settings?.contact || {}) as { phone?: string; email?: string; address?: string }
  const portfolioName = String(footer?.portfolioName || settings?.portfolioName || 'FabrickBuild')
  const backgroundMedia = getMediaURL(footer?.backgroundMedia, 'hero')
  const { className, style } = appearanceProps(footer?.appearance || defaultFooterAppearance, 'site-footer site-footer--portfolio footer-reimagined')
  if (backgroundMedia) style.backgroundImage = `url("${backgroundMedia}")`

  const navigation = links.length ? links : [
    { label: 'Servicios', url: '/servicios' }, { label: 'Proyectos', url: '/proyectos' }, { label: 'Cotización', url: '/#contacto' },
  ]
  const legal = legalLinks.length ? legalLinks : [
    { label: 'Privacidad', url: '/privacidad' }, { label: 'Cookies', url: '/cookies' }, { label: 'Términos', url: '/terminos' },
  ]

  return (
    <footer className={className} style={style}>
      <div className="cms-surface__overlay" aria-hidden="true" />
      <div className="shell footer-stage">
        <div className="footer-intro">
          <Link href="/" className="footer-wordmark" aria-label="FabrickBuild, inicio"><strong>FABRICK</strong><em>BUILD</em></Link>
          <p>{String(footer?.description || 'Experiencias digitales con diseño, código y movimiento para marcas que quieren ser recordadas.')}</p>
          <a className="footer-main-cta" href="/#contacto">Conversemos <ArrowUpRight size={18} /></a>
        </div>

        <div className="footer-mobile-panels">
          <details open><summary>Explorar</summary><nav>{navigation.map((item, index) => <Link key={item.id || index} href={item.url || '/'}>{item.label}<ArrowUpRight size={14} /></Link>)}</nav></details>
          <details><summary>Contacto</summary><div className="footer-contact-list">{contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}{contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}<span>{contact.address || 'Santiago, Chile'}</span></div></details>
          {social.length > 0 && <details><summary>Redes</summary><div className="footer-social">{social.map((item, index) => <a key={item.id || index} href={item.url || '#'} target="_blank" rel="noreferrer">{item.platform}</a>)}</div></details>}
        </div>

        <div className="footer-desktop-columns">
          <nav aria-label="Navegación del pie">{navigation.map((item, index) => <Link key={item.id || index} href={item.url || '/'}>{item.label}</Link>)}</nav>
          <div><span>Hablemos</span>{contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}{contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}<small>{contact.address || 'Santiago, Chile'}</small></div>
        </div>
      </div>

      <div className="shell footer-legal footer-legal--stacked"><div>{legal.map((item, index) => <Link key={item.id || index} href={item.url || '/'}>{item.label}</Link>)}{footer?.showPrivacySettings !== false && <PrivacySettingsButton />}</div><span>© {new Date().getFullYear()} {portfolioName}</span><span>Diseño · código · movimiento</span></div>
    </footer>
  )
}
