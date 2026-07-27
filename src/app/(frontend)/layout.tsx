import type { Metadata } from 'next'
import React from 'react'
import { getGlobals } from '@/lib/queries'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import './globals.css'
import './generated.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getGlobals()
  const seo = (settings?.defaultSEO || {}) as { title?: string; description?: string }
  return {
    title: seo.title || 'FabrickBuild | Construcción inteligente',
    description:
      seo.description ||
      'Construcción, remodelación y reparación con planificación y transparencia.'
  }
}

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const { header, footer, settings } = await getGlobals()
  return (
    <html lang="es">
      <body>
        <SiteHeader header={header} settings={settings} />
        <main>{children}</main>
        <SiteFooter footer={footer} settings={settings} />
        {typeof (settings?.contact as { whatsapp?: string } | undefined)?.whatsapp === 'string' && (settings?.contact as { whatsapp?: string }).whatsapp && (
          <a
            className="whatsapp-float"
            href={`https://wa.me/${(settings?.contact as { whatsapp: string }).whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Contactar por WhatsApp"
          >
            WhatsApp
          </a>
        )}
      </body>
    </html>
  )
}
