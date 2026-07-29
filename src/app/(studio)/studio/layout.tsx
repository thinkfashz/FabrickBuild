import config from '@payload-config'
import { Bot, Boxes, ExternalLink, Gauge, Image, PanelsTopLeft, Settings2 } from 'lucide-react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import type { ReactNode } from 'react'

import StudioMobileNav from '@/components/studio/StudioMobileNav'
import StudioMobileHeader from '@/components/studio/StudioMobileHeader'

import './studio.css'
import './studio-motion.css'
import './chat-enhancements.css'
import './vault.css'
import './builder.css'
import './media.css'

export const metadata: Metadata = {
  title: 'FabrickBuild AI Studio',
  robots: { index: false, follow: false },
}

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: await headers(), canSetHeaders: false })
  if (!auth.user || (auth.user as { role?: string }).role !== 'admin') {
    redirect('/admin/login?redirect=%2Fstudio%2Feditor')
  }

  return (
    <div className="studio-shell">
      <aside className="studio-sidebar">
        <Link href="/studio/editor" className="studio-brand">
          <span className="studio-brand-mark"><Boxes size={19} /></span>
          <span><b>FabrickBuild CMS</b><small>Constructor visual</small></span>
        </Link>
        <nav className="studio-nav" aria-label="Navegación del estudio">
          <Link href="/studio/editor"><PanelsTopLeft size={18} /><span>Editor de páginas</span></Link>
          <Link href="/studio/multimedia"><Image size={18} /><span>Biblioteca multimedia</span></Link>
          <Link href="/studio/integraciones"><Settings2 size={18} /><span>Integraciones</span></Link>
          <Link href="/studio/ia"><Bot size={18} /><span>Asistente de IA</span></Link>
          <Link href="/admin"><Gauge size={18} /><span>CMS principal</span></Link>
          <Link href="/" target="_blank"><ExternalLink size={18} /><span>Ver sitio</span></Link>
        </nav>
        <div className="studio-sidebar-foot">
          <span className="studio-status-dot" />
          <div><strong>Entorno protegido</strong><small>{auth.user.email}</small></div>
        </div>
      </aside>
      <div className="studio-main">
        <StudioMobileHeader />
        {children}
        <StudioMobileNav />
      </div>
    </div>
  )
}
