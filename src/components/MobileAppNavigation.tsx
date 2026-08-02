'use client'

import type { CSSProperties, MouseEvent } from 'react'
import Link from 'next/link'
import { BriefcaseBusiness, Home, Layers3, MessageCircle, Workflow } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

import { DIGITAL_CONTACT } from '@/lib/digitalCatalog'

const items = [
  { label: 'Inicio', href: '/', Icon: Home, accent: '#b8d7c5' },
  { label: 'Servicios', href: '/servicios', Icon: Layers3, accent: '#e5bb6b' },
  { label: 'Proyectos', href: '/proyectos', Icon: BriefcaseBusiness, accent: '#79d8cf' },
  { label: 'Método', href: '/nosotros', Icon: Workflow, accent: '#b5a8ff' },
]

type SectionToneEvent = CustomEvent<{ color?: string }>

function touchFeedback() {
  try {
    navigator.vibrate?.(8)
  } catch {
    // La navegación no depende de la respuesta háptica.
  }
}

export function MobileAppNavigation() {
  const pathname = usePathname()
  const [sectionAccent, setSectionAccent] = useState<string | null>(null)

  const activeItem = useMemo(
    () =>
      items.find(({ href }) => (href === '/' ? pathname === '/' : pathname.startsWith(href))) ||
      items[0],
    [pathname],
  )

  useEffect(() => {
    setSectionAccent(null)

    const handleTone = (event: Event) => {
      const toneEvent = event as SectionToneEvent
      if (toneEvent.detail?.color) setSectionAccent(toneEvent.detail.color)
    }

    window.addEventListener('fabrick:section-tone', handleTone)
    return () => window.removeEventListener('fabrick:section-tone', handleTone)
  }, [pathname])

  function handleRouteClick(event: MouseEvent<HTMLAnchorElement>, href: string, active: boolean) {
    touchFeedback()
    if (!active) return

    event.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const style = {
    '--mobile-nav-accent': sectionAccent || activeItem.accent,
  } as CSSProperties

  return (
    <nav className="mobile-app-nav" aria-label="Navegación rápida móvil" style={style}>
      <span className="mobile-app-nav__ambient" aria-hidden="true" />
      <span className="mobile-app-nav__rail-light" aria-hidden="true" />

      {items.map(({ label, href, Icon, accent }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        const itemStyle = { '--item-accent': accent } as CSSProperties

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={active ? `${label}, volver arriba` : label}
            data-active={active ? 'true' : 'false'}
            style={itemStyle}
            onClick={(event) => handleRouteClick(event, href, active)}
          >
            <span className="mobile-app-nav__icon" aria-hidden="true">
              <Icon size={19} strokeWidth={2.15} />
              <i />
            </span>
            <span className="mobile-app-nav__label">{label}</span>
          </Link>
        )
      })}

      <a
        href={DIGITAL_CONTACT.whatsappURL}
        target="_blank"
        rel="noreferrer"
        className="mobile-app-nav__whatsapp"
        aria-label="Abrir WhatsApp"
        data-no-transition
        style={{ '--item-accent': '#54d98c' } as CSSProperties}
        onClick={touchFeedback}
      >
        <span className="mobile-app-nav__icon" aria-hidden="true">
          <MessageCircle size={19} strokeWidth={2.15} />
          <i />
        </span>
        <span className="mobile-app-nav__label">WhatsApp</span>
      </a>
    </nav>
  )
}
