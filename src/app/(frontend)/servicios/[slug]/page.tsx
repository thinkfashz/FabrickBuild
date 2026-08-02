import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Mail, MessageCircle } from 'lucide-react'
import { notFound } from 'next/navigation'

import { DIGITAL_CONTACT, digitalServices, getDigitalService } from '@/lib/digitalCatalog'

type Args = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return digitalServices.map((service) => ({ slug: service.slug }))
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const service = getDigitalService(slug)
  if (!service) return {}

  return {
    title: `${service.title} | FabrickBuild`,
    description: service.summary,
    keywords: [...service.technologies, service.shortTitle, 'FabrickBuild'],
  }
}

export default async function ServiceDetailPage({ params }: Args) {
  const { slug } = await params
  const service = getDigitalService(slug)
  if (!service) notFound()

  const related = digitalServices.filter((item) => item.slug !== service.slug).slice(0, 3)
  const whatsappURL = `${DIGITAL_CONTACT.whatsappURL}%20Me%20interesa%20el%20servicio%20${encodeURIComponent(service.title)}.`

  return (
    <div className="digital-page digital-detail-page">
      <section className="digital-detail-hero">
        <div className="digital-shell">
          <Link href="/servicios" className="digital-back-link"><ArrowLeft size={16} /> Servicios</Link>
          <span className="digital-kicker">{service.eyebrow}</span>
          <h1>{service.title}</h1>
          <p>{service.summary}</p>
          <div className="digital-hero__actions">
            <a href={whatsappURL} target="_blank" rel="noreferrer" className="digital-button digital-button--primary">
              <MessageCircle size={18} /> Consultar por WhatsApp
            </a>
            <a href={DIGITAL_CONTACT.emailURL} className="digital-button digital-button--secondary">
              <Mail size={18} /> Enviar correo
            </a>
          </div>
        </div>
      </section>

      <section className="digital-section">
        <div className="digital-shell digital-detail-layout">
          <article className="digital-detail-copy">
            <span className="digital-kicker">EN QUÉ CONSISTE</span>
            <h2>Una solución diseñada desde el objetivo y la operación real.</h2>
            <p>{service.description}</p>

            <div className="digital-detail-block">
              <h3>Ideal para</h3>
              <div className="digital-check-list">
                {service.idealFor.map((item) => <p key={item}><Check size={18} /> {item}</p>)}
              </div>
            </div>

            <div className="digital-detail-block">
              <h3>Qué incluye</h3>
              <div className="digital-feature-grid">
                {service.deliverables.map((item, index) => (
                  <div key={item}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></div>
                ))}
              </div>
            </div>
          </article>

          <aside className="digital-detail-aside">
            <span className="digital-kicker">TECNOLOGÍAS POSIBLES</span>
            <div className="digital-tech-cloud">
              {service.technologies.map((technology) => <span key={technology}>{technology}</span>)}
            </div>
            <div className="digital-detail-outcomes">
              <h3>Resultados buscados</h3>
              {service.outcomes.map((outcome) => <p key={outcome}>{outcome}</p>)}
            </div>
            <a href={whatsappURL} target="_blank" rel="noreferrer">
              Hablar del proyecto <ArrowRight size={17} />
            </a>
          </aside>
        </div>
      </section>

      <section className="digital-section digital-section--contrast">
        <div className="digital-shell">
          <div className="digital-section__heading">
            <span className="digital-kicker">PROCESO</span>
            <h2>Etapas claras para convertir una necesidad en un sistema verificable.</h2>
          </div>
          <div className="digital-process-grid">
            {service.process.map((step, index) => (
              <article key={step.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="digital-section">
        <div className="digital-shell">
          <div className="digital-section__heading">
            <span className="digital-kicker">SERVICIOS RELACIONADOS</span>
            <h2>La solución puede crecer por módulos sin perder coherencia.</h2>
          </div>
          <div className="digital-related-grid">
            {related.map((item) => (
              <Link key={item.slug} href={`/servicios/${item.slug}`}>
                <span>{item.eyebrow}</span>
                <h3>{item.shortTitle}</h3>
                <p>{item.summary}</p>
                <strong>Ver detalles <ArrowRight size={16} /></strong>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
