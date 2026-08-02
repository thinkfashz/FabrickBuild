import Link from 'next/link'
import { ArrowUpRight, Github, Mail, MessageCircle, Music2 } from 'lucide-react'

import { DIGITAL_CONTACT } from '@/lib/digitalCatalog'
import { LICENSED_TRACK } from '@/lib/licensedMusic'
import { PrivacySettingsButton } from './PrivacySettingsButton'

type FooterProps = {
  footer?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
}

const navigation = [
  { label: 'Servicios', href: '/servicios' },
  { label: 'Proyectos', href: '/proyectos' },
  { label: 'Método', href: '/nosotros' },
  { label: 'IA y RAG', href: '/servicios/ia-rag-agentes' },
]

export function SiteFooter({ settings }: FooterProps) {
  const brandName = String(settings?.brandName || 'FabrickBuild')

  return (
    <footer className="site-footer footer-reimagined digital-site-footer footer-minimal-shell">
      <div className="digital-shell footer-minimal">
        <div className="footer-minimal__lead" data-footer-reveal>
          <span className="footer-minimal__eyebrow">ESTUDIO DIGITAL · SANTIAGO</span>
          <Link href="/" className="footer-wordmark" aria-label={`${brandName}, inicio`}>
            <strong>FABRICK</strong>
            <em>BUILD</em>
          </Link>
          <p>
            Diseño, software, automatización e inteligencia artificial para convertir ideas en sistemas reales.
          </p>
          <a
            className="footer-main-cta"
            href={DIGITAL_CONTACT.whatsappURL}
            target="_blank"
            rel="noreferrer"
            data-no-transition
          >
            Hablemos de tu proyecto <ArrowUpRight size={17} />
          </a>
        </div>

        <nav className="footer-minimal__nav" aria-label="Navegación del pie" data-footer-reveal>
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
              <ArrowUpRight size={13} />
            </Link>
          ))}
        </nav>

        <div className="footer-minimal__contact" data-footer-reveal>
          <a href={DIGITAL_CONTACT.whatsappURL} target="_blank" rel="noreferrer" data-no-transition>
            <MessageCircle size={16} />
            <span>WhatsApp</span>
          </a>
          <a href={DIGITAL_CONTACT.emailURL} data-no-transition>
            <Mail size={16} />
            <span>Correo</span>
          </a>
          <a href="https://github.com/thinkfashz" target="_blank" rel="noreferrer" data-no-transition>
            <Github size={16} />
            <span>GitHub</span>
          </a>
        </div>
      </div>

      <div className="digital-shell footer-minimal__base">
        <div className="footer-minimal__legal">
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/terminos">Términos</Link>
          <PrivacySettingsButton />
        </div>
        <span>© {new Date().getFullYear()} {brandName}</span>
        <span className="footer-music-credit">
          <Music2 size={12} aria-hidden="true" />
          <a href={LICENSED_TRACK.trackPage} target="_blank" rel="noreferrer" data-no-transition>
            {LICENSED_TRACK.displayTitle}
          </a>
          <span>·</span>
          <a href={LICENSED_TRACK.licensePage} target="_blank" rel="noreferrer" data-no-transition>
            {LICENSED_TRACK.licenseLabel}
          </a>
        </span>
      </div>
    </footer>
  )
}
