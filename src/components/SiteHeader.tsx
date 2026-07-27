import Image from 'next/image'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { getMediaAlt, getMediaURL } from '@/lib/media'

type NavItem = { id?: string | number; label?: string | null; url?: string | null }

export function SiteHeader({
  header,
  settings
}: {
  header?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
}) {
  const navItems = Array.isArray(header?.navItems) ? (header.navItems as NavItem[]) : [
    { label: 'Servicios', url: '/servicios' },
    { label: 'Proyectos', url: '/proyectos' },
    { label: 'Nosotros', url: '/nosotros' }
  ]
  const cta = (header?.cta || {}) as { label?: string; url?: string }
  const brandName = String(settings?.brandName || 'FabrickBuild')
  const logo = getMediaURL(settings?.logo as never, 'thumbnail')

  const Brand = () => (
    <Link href="/" className="brand" aria-label={`${brandName}, inicio`}>
      {logo ? (
        <span className="brand-logo"><Image src={logo} alt={getMediaAlt(settings?.logo as never, brandName)} fill sizes="48px" /></span>
      ) : (
        <span className="brand-mark">F</span>
      )}
      <span>{brandName === 'FabrickBuild' ? <>Fabrick<strong>Build</strong></> : brandName}</span>
    </Link>
  )

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Navegación principal">
          {navItems.map((item, index) => (
            <Link key={item.id || index} href={item.url || '/'}>{item.label}</Link>
          ))}
        </nav>
        <Link href={cta.url || '/#contacto'} className="header-cta">
          {cta.label || 'Cotizar proyecto'}
        </Link>
        <details className="mobile-menu">
          <summary aria-label="Abrir menú"><Menu size={22} /></summary>
          <div>
            {navItems.map((item, index) => (
              <Link key={item.id || index} href={item.url || '/'}>{item.label}</Link>
            ))}
            <Link href={cta.url || '/#contacto'}>{cta.label || 'Cotizar proyecto'}</Link>
          </div>
        </details>
      </div>
    </header>
  )
}
