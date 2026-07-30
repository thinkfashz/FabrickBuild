'use client'

import { Boxes, ExternalLink, Image, Menu, PanelsTopLeft, Settings2, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

const destinations = [
  { href: '/studio/editor', label: 'Editor visual', detail: 'Canvas, bloques y estilos en vivo', icon: PanelsTopLeft },
  { href: '/studio/multimedia', label: 'Biblioteca multimedia', detail: 'Archivos, carpetas y proveedores', icon: Image },
  { href: '/studio/integraciones', label: 'Conexiones', detail: 'Claves, Blob, Cloudinary y S3', icon: Settings2 },
  { href: '/studio/ia', label: 'Asistente', detail: 'Propuestas y automatizaciones', icon: Sparkles },
]

function routeLabel(pathname: string) {
  return destinations.find((item) => pathname.startsWith(item.href))?.label || 'Fabrick Studio'
}

export default function StudioMobileHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const currentLabel = useMemo(() => routeLabel(pathname), [pathname])

  useEffect(() => setOpen(false), [pathname])

  return (
    <header className="studio-mobile-head">
      <Link href="/studio/editor" className="studio-brand" aria-label="Ir al editor visual">
        <span className="studio-brand-mark"><Boxes size={18} /></span>
        <span><b>FabrickBuild CMS</b><small>{currentLabel}</small></span>
      </Link>
      <div className="studio-mobile-head-actions">
        <span className="studio-mobile-context">{currentLabel}</span>
        <Link href="/" target="_blank" aria-label="Abrir sitio"><ExternalLink size={18} /></Link>
        <button type="button" className="studio-mobile-menu" aria-label="Abrir menú del estudio" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
          {open ? <X size={19} /> : <Menu size={20} />}
        </button>
      </div>
      {open && <div className="studio-mobile-command" role="presentation">
        <button type="button" className="studio-mobile-command__backdrop" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
        <section className="studio-mobile-command__sheet" role="dialog" aria-modal="true" aria-label="Ir a una herramienta">
          <div className="studio-mobile-command__title"><div><span>ESTUDIO FABRICKBUILD</span><strong>¿Qué quieres construir?</strong></div><button type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)}><X size={18} /></button></div>
          <nav className="studio-mobile-command__links" aria-label="Destinos del estudio">
            {destinations.map(({ href, label, detail, icon: Icon }) => {
              const active = pathname.startsWith(href)
              return <Link href={href} key={href} className={active ? 'active' : ''}><span><Icon size={18} /></span><div><strong>{label}</strong><small>{detail}</small></div>{active && <em>Activo</em>}</Link>
            })}
          </nav>
          <Link href="/admin" className="studio-mobile-command__cms"><span>CMS</span><strong>Volver a Payload</strong><small>Colecciones, globals y contenido.</small></Link>
        </section>
      </div>}
    </header>
  )
}
