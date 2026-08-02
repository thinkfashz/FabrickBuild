'use client'

import Link from 'next/link'
import { ArrowRight, Bot, CalendarClock, Code2, Database, MessageCircle, SearchCheck, ShoppingBag } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { DIGITAL_CONTACT, digitalServices } from '@/lib/digitalCatalog'

const icons = [ShoppingBag, Code2, Database, CalendarClock, Bot, SearchCheck]

export function HomeServiceNavigator() {
  const pathname = usePathname()
  if (pathname !== '/') return null

  return (
    <section
      className="home-service-navigator"
      id="servicios-digitales"
      aria-labelledby="home-services-title"
      data-section-tone="gold"
    >
      <div className="digital-shell">
        <div className="home-service-navigator__intro" data-runtime-reveal>
          <span className="digital-kicker">SERVICIOS Y SISTEMAS DIGITALES</span>
          <h2 id="home-services-title">De una presencia memorable a un sistema que realmente trabaja.</h2>
          <p>
            Diseño, software, datos, automatización, IA y posicionamiento conectados dentro de una misma estrategia.
          </p>
        </div>

        <div className="home-service-navigator__grid">
          {digitalServices.map((service, index) => {
            const Icon = icons[index % icons.length]
            return (
              <Link
                key={service.slug}
                href={`/servicios/${service.slug}`}
                className="home-service-card"
                data-runtime-reveal
              >
                <span className="home-service-card__top">
                  <i>{String(index + 1).padStart(2, '0')}</i>
                  <b aria-hidden="true"><Icon size={20} strokeWidth={1.8} /></b>
                </span>
                <small>{service.eyebrow}</small>
                <h3>{service.shortTitle}</h3>
                <p>{service.summary}</p>
                <strong>
                  Ver detalles <ArrowRight size={16} />
                </strong>
              </Link>
            )
          })}
        </div>

        <div className="home-service-navigator__cta" data-runtime-reveal>
          <div>
            <span className="digital-kicker">CONVERSEMOS</span>
            <h3>Cuéntame qué necesitas crear, automatizar o mejorar.</h3>
          </div>
          <a href={DIGITAL_CONTACT.whatsappURL} target="_blank" rel="noreferrer" data-no-transition>
            <MessageCircle size={18} /> WhatsApp directo
          </a>
        </div>
      </div>
    </section>
  )
}
