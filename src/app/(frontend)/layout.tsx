import type { Metadata } from 'next'
import { Manrope, Space_Grotesk } from 'next/font/google'
import React from 'react'

import { AmbientAudioPlayer } from '@/components/AmbientAudioPlayer'
import { ConsentBanner } from '@/components/ConsentBanner'
import { DigitalExperienceRuntime } from '@/components/DigitalExperienceRuntime'
import { HomeServiceNavigator } from '@/components/HomeServiceNavigator'
import { ImmersiveTextRuntime } from '@/components/ImmersiveTextRuntime'
import { MobileAppNavigation } from '@/components/MobileAppNavigation'
import { PageTransition } from '@/components/PageTransition'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteLoader } from '@/components/SiteLoader'
import { SmoothScroll } from '@/components/SmoothScroll'
import { getMediaURL } from '@/lib/media'
import { getGlobals } from '@/lib/queries'
import './globals.css'
import './generated.css'
import './audio-controls.css'
import './experience-enhancements.css'
import './digital-brand.css'
import './motion-system.css'
import './mobile-refinement.css'
import './home-cinematic-continuum.css'
import './experience-polish.css'
import './final-overrides.css'

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
  preload: true,
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
  preload: true,
})

export const revalidate = 300

const DIGITAL_TITLE = 'FabrickBuild | Diseño web, software, automatización e IA'
const DIGITAL_DESCRIPTION =
  'Creamos páginas web, e-commerce, software personalizado, automatizaciones, sistemas RAG e integraciones con datos para marcas y negocios en Chile.'
const DIGITAL_KEYWORDS = [
  'diseño web Chile',
  'desarrollo web',
  'software personalizado',
  'e-commerce',
  'automatización',
  'sistemas de agendamiento',
  'PostgreSQL',
  'SQLite',
  'RAG',
  'inteligencia artificial',
  'SEO técnico',
  'FabrickBuild',
]

const legacyPositioning =
  /construcci[oó]n|construimos casas|dios construye|remodelaci[oó]n|reparaci[oó]n|radier|techumbre|gasfiter[ií]a|vivienda/i

type SEOMedia = Parameters<typeof getMediaURL>[0]

function digitalText(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim()
  if (!normalized || legacyPositioning.test(normalized)) return fallback
  return normalized
}

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getGlobals()
  const seo = (settings?.defaultSEO || {}) as {
    title?: string
    description?: string
    image?: SEOMedia
  }

  const title = digitalText(seo.title, DIGITAL_TITLE)
  const description = digitalText(seo.description, DIGITAL_DESCRIPTION)
  const image = getMediaURL(seo.image, 'hero')

  return {
    applicationName: 'FabrickBuild',
    title,
    description,
    keywords: DIGITAL_KEYWORDS,
    category: 'technology',
    openGraph: {
      type: 'website',
      locale: 'es_CL',
      siteName: 'FabrickBuild',
      title,
      description,
      images: image ? [{ url: image, alt: 'FabrickBuild — diseño y sistemas digitales' }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
    other: {
      'theme-color': '#070b0c',
      'color-scheme': 'dark',
    },
  }
}

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const { header, footer, settings } = await getGlobals()
  const loader = (settings?.loader || {}) as React.ComponentProps<typeof SiteLoader>['settings']
  const consent = (settings?.consent || {}) as React.ComponentProps<typeof ConsentBanner>['settings']

  return (
    <html lang="es" suppressHydrationWarning className={`${manrope.variable} ${spaceGrotesk.variable}`}>
      <body className="digital-site">
        <SmoothScroll />
        <DigitalExperienceRuntime />
        <ImmersiveTextRuntime />
        <PageTransition />
        <SiteLoader settings={loader} fallbackLogo={settings?.logo} />
        <SiteHeader header={header} settings={settings} />
        <main className="site-content">{children}</main>
        <HomeServiceNavigator />
        <SiteFooter footer={footer} settings={settings} />
        <AmbientAudioPlayer />
        <MobileAppNavigation />
        <ConsentBanner settings={consent} />
      </body>
    </html>
  )
}
