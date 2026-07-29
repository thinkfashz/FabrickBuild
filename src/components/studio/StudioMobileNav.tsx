'use client'

import { Blocks, Gauge, Image, Palette, PanelsTopLeft, Plus, Save, Settings2, SlidersHorizontal, Sparkles } from 'lucide-react'
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
  const editorActive = pathname.startsWith('/studio/editor')

  if (editorActive) {
    const editorItems = [
      { action: 'blocks', label: 'Bloques', icon: Blocks },
      { action: 'add', label: 'Añadir', icon: Plus },
      { action: 'design', label: 'Diseño', icon: Palette },
      { action: 'edit', label: 'Editar', icon: SlidersHorizontal },
      { action: 'save', label: 'Guardar', icon: Save },
    ]
    return (
      <nav className="studio-mobile-nav studio-mobile-nav--editor" aria-label="Herramientas del editor">
        {editorItems.map(({ action, label, icon: Icon }) => (
          <button key={action} type="button" className={action === 'save' ? 'studio-mobile-nav__save' : ''} onClick={() => window.dispatchEvent(new CustomEvent('fabrick:editor-action', { detail: action }))}>
            <Icon size={19} strokeWidth={1.9} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    )
  }

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
