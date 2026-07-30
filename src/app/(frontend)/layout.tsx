import type { Metadata } from 'next'
import React from 'react'

import { ConsentBanner } from '@/components/ConsentBanner'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteLoader } from '@/components/SiteLoader'
import { getGlobals } from '@/lib/queries'
import './globals.css'
import './generated.css'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getGlobals()
  const seo = (settings?.defaultSEO || {}) as { title?: string; description?: string }
  return {
    title: seo.title || 'FabrickBuild | Construcción inteligente',
    description:
      seo.description ||
      'Construcción, remodelación y reparación con planificación y transparencia.',
  }
}

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const { header, footer, settings } = await getGlobals()
  const contact = (settings?.contact || {}) as { whatsapp?: string }
  const loader = (settings?.loader || {}) as React.ComponentProps<typeof SiteLoader>['settings']
  const consent = (settings?.consent || {}) as React.ComponentProps<typeof ConsentBanner>['settings']

  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <SiteLoader settings={loader} fallbackLogo={settings?.logo} />
        <SiteHeader header={header} settings={settings} />
        <main>{children}</main>
        <SiteFooter footer={footer} settings={settings} />
        <ConsentBanner settings={consent} />
        {typeof contact.whatsapp === 'string' && contact.whatsapp && (
          <a
            className="whatsapp-float"
            href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
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
