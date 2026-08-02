import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

import { DIGITAL_CONTACT } from '@/lib/digitalCatalog'

type HeaderProps = {
  header?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
}

const navigation = [
  { label: 'Servicios', href: '/servicios' },
  { label: 'Proyectos', href: '/proyectos' },
  { label: 'Método', href: '/nosotros' },
]

export function SiteHeader({ settings }: HeaderProps) {
  const brandName = String(settings?.brandName || 'FabrickBuild')

  return (
    <header className="site-header site-header--portfolio site-header--sticky digital-site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand brand--wordmark brand--digital" aria-label={`${brandName}, inicio`}>
          <span className="brand-digital-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <b />
          </span>
          <span className="brand-digital-copy">
            <span className="brand-wordmark" aria-label={brandName}>
              <strong>FABRICK</strong>
              <em>BUILD</em>
            </span>
            <small>DIGITAL SYSTEMS</small>
          </span>
          <span className="brand-digital-scan" aria-hidden="true" />
        </Link>

        <nav className="desktop-nav desktop-nav--digital" aria-label="Navegación principal">
          {navigation.map((item, index) => (
            <Link key={item.href} href={item.href}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <a
          className="header-cta header-cta--signal"
          href={DIGITAL_CONTACT.whatsappURL}
          target="_blank"
          rel="noreferrer"
          data-no-transition
        >
          <span className="header-cta__pulse" aria-hidden="true" />
          <MessageCircle size={17} />
          <span>Hablemos</span>
        </a>
      </div>
    </header>
  )
}
