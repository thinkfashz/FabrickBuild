import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  CalendarClock,
  Code2,
  Database,
  MessageCircle,
  SearchCheck,
  ShoppingBag,
} from 'lucide-react'

import { TechnologyArchitectureSignal, TechnologyIconGrid } from '@/components/TechnologyIconGrid'
import { DIGITAL_CONTACT, digitalServices } from '@/lib/digitalCatalog'

export const metadata: Metadata = {
  title: 'Servicios digitales | FabrickBuild',
  description:
    'Diseño web, e-commerce, software personalizado, bases de datos, automatización, SEO técnico, sistemas RAG e inteligencia artificial.',
}

const icons = [ShoppingBag, Code2, Database, CalendarClock, Bot, SearchCheck]

const architectureSteps = [
  {
    number: '01',
    title: 'Experiencia y conversión',
    description: 'Diseño visual, navegación, contenido y llamadas a la acción alineadas con un objetivo medible.',
  },
  {
    number: '02',
    title: 'Lógica y automatización',
    description: 'Reglas, permisos, agenda, CRM, pagos y flujos que reducen trabajo repetido.',
  },
  {
    number: '03',
    title: 'Datos e inteligencia',
    description: 'SQL relacional, APIs, analítica y sistemas RAG conectados a fuentes autorizadas.',
  },
  {
    number: '04',
    title: 'Visibilidad y crecimiento',
    description: 'SEO técnico, metadata, rendimiento y medición para mejorar con información real.',
  },
]

export default function ServicesPage() {
  return (
    <div className="digital-page">
      <section className="digital-hero digital-hero--services" data-section-tone="gold">
        <div className="digital-shell" data-runtime-reveal>
          <span className="digital-kicker">SERVICIOS DIGITALES</span>
          <h1>Diseño, software, datos e inteligencia conectados en una sola estrategia.</h1>
          <p>
            No construimos una página aislada. Diseñamos una experiencia que puede captar clientes, vender, reservar,
            organizar operaciones, consultar datos y crecer junto al negocio.
          </p>
          <div className="digital-hero__actions">
            <a href={DIGITAL_CONTACT.whatsappURL} target="_blank" rel="noreferrer" data-no-transition className="digital-button digital-button--primary">
              <MessageCircle size={18} /> Conversar por WhatsApp
            </a>
            <Link href="/proyectos" className="digital-button digital-button--secondary">
              Ver tipos de proyectos <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="digital-section" data-section-tone="mint">
        <div className="digital-shell">
          <div className="digital-section__heading">
            <span className="digital-kicker">SEIS ÁREAS, UN MISMO SISTEMA</span>
            <h2>Elige el punto de entrada. La arquitectura se diseña para que todo pueda conectarse.</h2>
          </div>

          <div className="digital-service-grid">
            {digitalServices.map((service, index) => {
              const Icon = icons[index % icons.length]
              return (
                <article key={service.slug} className="digital-service-card" id={service.slug} data-runtime-reveal>
                  <div className="digital-service-card__icon"><Icon size={22} /></div>
                  <span>{service.eyebrow}</span>
                  <h3>{service.title}</h3>
                  <p>{service.summary}</p>
                  <ul>
                    {service.deliverables.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <Link href={`/servicios/${service.slug}`}>
                    Ver servicio completo <ArrowRight size={16} />
                  </Link>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="digital-section digital-section--contrast" data-section-tone="cyan">
        <div className="digital-shell">
          <div className="digital-section__heading">
            <span className="digital-kicker">ARQUITECTURA CONECTADA</span>
            <h2>Cada capa se diseña para colaborar con la siguiente, no para convertirse en otra herramienta aislada.</h2>
          </div>
          <TechnologyArchitectureSignal />
          <div className="digital-architecture-flow">
            {architectureSteps.map((step) => (
              <article key={step.number} data-runtime-reveal>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="digital-section" data-section-tone="violet">
        <div className="digital-shell">
          <div className="digital-section__heading">
            <span className="digital-kicker">TECNOLOGÍA SEGÚN EL PROBLEMA</span>
            <h2>Una matriz visual para entender cómo se conectan experiencia, lógica, datos, automatización, IA y crecimiento.</h2>
          </div>
          <TechnologyIconGrid />
        </div>
      </section>

      <section className="digital-contact-band" data-section-tone="gold">
        <div className="digital-shell">
          <div>
            <span className="digital-kicker">PROYECTO PERSONALIZADO</span>
            <h2>Cuéntame el proceso que quieres mejorar y diseñamos la solución alrededor de él.</h2>
          </div>
          <div className="digital-contact-band__actions">
            <a href={DIGITAL_CONTACT.whatsappURL} target="_blank" rel="noreferrer" data-no-transition>
              WhatsApp +56 9 3012 1625 <ArrowRight size={17} />
            </a>
            <a href={DIGITAL_CONTACT.emailURL} data-no-transition>{DIGITAL_CONTACT.email}</a>
          </div>
        </div>
      </section>
    </div>
  )
}
