import Image from 'next/image'
import Link from 'next/link'
import { Menu } from 'lucide-react'

import { appearanceProps } from '@/lib/appearance'
import { getMediaAlt, getMediaURL } from '@/lib/media'

type NavItem = { id?: string | number; label?: string | null; url?: string | null }

const defaultHeaderAppearance = {
  surfaceMode: 'glass',
  surfaceColor: '#08090c',
  surfaceOpacity: 22,
  backdropBlur: 20,
  headingColor: '#ffffff',
  bodyColor: '#d7d7da',
  accentColor: '#ffffff',
  buttonColor: '#ffffff',
  buttonTextColor: '#090a0d',
  paddingTop: 0,
  paddingBottom: 0,
  overlayOpacity: 0,
}

export function SiteHeader({
  header,
  settings,
}: {
  header?: Record<string, any> | null
  settings?: Record<string, any> | null
}) {
  const navItems = Array.isArray(header?.navItems)
    ? (header.navItems as NavItem[])
    : [
        { label: 'Servicios', url: '/servicios' },
        { label: 'Proyectos', url: '/proyectos' },
        { label: 'Nosotros', url: '/nosotros' },
      ]
  const cta = (header?.cta || {}) as { label?: string; url?: string }
  const brandName = String(settings?.brandName || 'FabrickBuild')
  const portfolioName = String(header?.portfolioName || settings?.portfolioName || 'Portafolio Fabrick')
  const desktopLogoDoc = header?.logo || settings?.logo
  const mobileLogoDoc = header?.mobileLogo || settings?.mobileLogo || desktopLogoDoc
  const desktopLogo = getMediaURL(desktopLogoDoc, 'thumbnail')
  const mobileLogo = getMediaURL(mobileLogoDoc, 'thumbnail')
  const backgroundMedia = getMediaURL(header?.backgroundMedia, 'hero')
  const { className, style } = appearanceProps(header?.appearance || defaultHeaderAppearance, 'site-header site-header--portfolio')
  const logoSizeDesktop = Math.min(160, Math.max(28, Number(header?.logoSizeDesktop || 46)))
  const logoSizeMobile = Math.min(120, Math.max(28, Number(header?.logoSizeMobile || 40)))
  const logoAnimation = String(header?.logoAnimation || 'glow')

  if (backgroundMedia) style.backgroundImage = `url("${backgroundMedia}")`
  style['--brand-logo-desktop'] = `${logoSizeDesktop}px`
  style['--brand-logo-mobile'] = `${logoSizeMobile}px`

  const Brand = () => (
    <Link
      href="/"
      className={`brand brand--${logoAnimation}`}
      aria-label={`${portfolioName}, inicio`}
      data-mobile-centered={header?.centerLogoMobile !== false ? 'true' : 'false'}
    >
      {desktopLogo ? (
        <>
          <span className="brand-logo brand-logo--desktop">
            <Image
              src={desktopLogo}
              alt={getMediaAlt(desktopLogoDoc, brandName)}
              fill
              sizes={`${logoSizeDesktop}px`}
              priority
            />
          </span>
          <span className="brand-logo brand-logo--mobile">
            <Image
              src={mobileLogo || desktopLogo}
              alt={getMediaAlt(mobileLogoDoc, brandName)}
              fill
              sizes={`${logoSizeMobile}px`}
              priority
            />
          </span>
        </>
      ) : (
        <span className="brand-mark" aria-hidden="true"><b>F</b><i /></span>
      )}
      <span className="brand-name">
        <small>PORTAFOLIO</small>
        <strong>Fabrick</strong>
      </span>
    </Link>
  )

  return (
    <header
      className={`${className} ${header?.sticky !== false ? 'site-header--sticky' : ''}`.trim()}
      style={style}
    >
      <div className="cms-surface__overlay" aria-hidden="true" />
      <div className="shell header-inner">
        <span className="header-mobile-spacer" aria-hidden="true" />
        <Brand />
        <nav className="desktop-nav" aria-label="Navegación principal">
          {navItems.map((item, index) => (
            <Link key={item.id || index} href={item.url || '/'}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href={cta.url || '/#contacto'}
          className={`header-cta ${header?.showCTAMobile ? 'header-cta--mobile' : ''}`}
        >
          {cta.label || 'Cotizar proyecto'}
        </Link>
        <details className="mobile-menu">
          <summary aria-label="Abrir menú">
            <Menu size={21} />
          </summary>
          <div>
            <span className="mobile-menu__title">{portfolioName}</span>
            {navItems.map((item, index) => (
              <Link key={item.id || index} href={item.url || '/'}>
                {item.label}
              </Link>
            ))}
            <Link href={cta.url || '/#contacto'}>{cta.label || 'Cotizar proyecto'}</Link>
          </div>
        </details>
      </div>
    </header>
  )
}
