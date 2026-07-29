'use client'

import { Gauge, Image, PanelsTopLeft, Settings2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/admin', label: 'CMS', icon: Gauge },
  { href: '/studio/editor', label: 'Editor', icon: PanelsTopLeft },
  { href: '/studio/multimedia', label: 'Media', icon: Image },
  { href: '/studio/integraciones', label: 'Conexiones', icon: Settings2 },
  { href: '/studio/ia', label: 'Asistente', icon: Sparkles },
]

export default function StudioMobileNav() {
  const pathname = usePathname()
  return (
    <nav className="studio-mobile-nav" aria-label="Herramientas principales">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === '/admin' ? pathname.startsWith('/admin') : pathname.startsWith(href)
        return (
          <Link href={href} key={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
            <Icon size={19} strokeWidth={active ? 2.4 : 1.9} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
