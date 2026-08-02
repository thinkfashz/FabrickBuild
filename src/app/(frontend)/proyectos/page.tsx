import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Blocks, Bot, CalendarClock, Database, MessageCircle, ShoppingBag } from 'lucide-react'

import { DIGITAL_CONTACT, digitalProjects } from '@/lib/digitalCatalog'

export const metadata: Metadata = {
  title: 'Proyectos y sistemas digitales | FabrickBuild',
  description:
    'Ejemplos de arquitectura para e-commerce, agendas, CRM, paneles operativos, bases de datos y asistentes con inteligencia artificial.',
}

const icons = [ShoppingBag, CalendarClock, Bot, Blocks]

export default function ProjectsPage() {
  return (
    <div className="digital-page">
      <section className="digital-hero digital-hero--projects">
        <div className="digital-shell">
          <span className="digital-kicker">PROYECTOS Y SISTEMAS</span>
          <h1>Soluciones digitales pensadas como productos, no como páginas sueltas.</h1>
          <p>
            Estas arquitecturas muestran cómo combinamos experiencia visual, datos, automatización y operación. Cada
            implementación final se adapta al proceso, presupuesto y crecimiento de la marca.
          </p>
          <div className="digital-hero__actions">
            <a href={DIGITAL_CONTACT.whatsappURL} target="_blank" rel="noreferrer" className="digital-button digital-button--primary">
              <MessageCircle size={18} /> Conversar sobre una idea
            </a>
            <Link href="/servicios" className="digital-button digital-button--secondary">
              Explorar servicios <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="digital-section">
        <div className="digital-shell">
          <div className="digital-section__heading">
            <span className="digital-kicker">ARQUITECTURAS DE REFERENCIA</span>
            <h2>Cuatro formas de convertir una necesidad en una plataforma útil y administrable.</h2>
          </div>

          <div className="digital-project-grid">
            {digitalProjects.map((project, index) => {
              const Icon = icons[index % icons.length]
              return (
                <article key={project.slug} className="digital-project-card">
                  <div className="digital-project-card__top">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <Icon size={24} />
                  </div>
                  <small>{project.category}</small>
                  <h3>{project.title}</h3>
                  <p>{project.summary}</p>
                  <div className="digital-project-card__modules">
                    {project.modules.slice(0, 4).map((module) => <span key={module}>{module}</span>)}
                  </div>
                  <Link href={`/proyectos/${project.slug}`}>
                    Revisar arquitectura <ArrowRight size={16} />
                  </Link>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="digital-section digital-section--contrast">
        <div className="digital-shell digital-two-column">
          <div>
            <span className="digital-kicker">UNA BASE QUE PUEDE CRECER</span>
            <h2>La interfaz, la base de datos y las automatizaciones se diseñan como un solo producto.</h2>
          </div>
          <div className="digital-principles">
            <p><Database size={20} /><span><strong>Datos relacionales</strong> Modelos SQL claros, consistentes y preparados para reportes.</span></p>
            <p><Blocks size={20} /><span><strong>Arquitectura modular</strong> Funciones que pueden incorporarse sin rehacer todo el sistema.</span></p>
            <p><Bot size={20} /><span><strong>Automatización con control</strong> Flujos medibles, permisos y trazabilidad de acciones.</span></p>
          </div>
        </div>
      </section>

      <section className="digital-contact-band">
        <div className="digital-shell">
          <div>
            <span className="digital-kicker">TU PROYECTO</span>
            <h2>Podemos comenzar con un módulo útil y construir la plataforma por etapas.</h2>
          </div>
          <div className="digital-contact-band__actions">
            <a href={DIGITAL_CONTACT.whatsappURL} target="_blank" rel="noreferrer">
              WhatsApp directo <ArrowRight size={17} />
            </a>
            <a href={DIGITAL_CONTACT.emailURL}>{DIGITAL_CONTACT.email}</a>
          </div>
        </div>
      </section>
    </div>
  )
}
