import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, MessageCircle } from 'lucide-react'
import { notFound } from 'next/navigation'

import { DIGITAL_CONTACT, digitalProjects, getDigitalProject } from '@/lib/digitalCatalog'

type Args = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return digitalProjects.map((project) => ({ slug: project.slug }))
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const project = getDigitalProject(slug)
  if (!project) return {}

  return {
    title: `${project.title} | FabrickBuild`,
    description: project.summary,
    keywords: [...project.technologies, project.category, 'software personalizado'],
  }
}

export default async function ProjectDetailPage({ params }: Args) {
  const { slug } = await params
  const project = getDigitalProject(slug)
  if (!project) notFound()

  const related = digitalProjects.filter((item) => item.slug !== project.slug).slice(0, 3)
  const whatsappURL = `${DIGITAL_CONTACT.whatsappURL}%20Quiero%20conversar%20sobre%20una%20solución%20similar%20a%20${encodeURIComponent(project.title)}.`

  return (
    <div className="digital-page digital-detail-page">
      <section className="digital-detail-hero digital-detail-hero--project">
        <div className="digital-shell">
          <Link href="/proyectos" className="digital-back-link"><ArrowLeft size={16} /> Proyectos</Link>
          <span className="digital-kicker">{project.category}</span>
          <h1>{project.title}</h1>
          <p>{project.summary}</p>
          <div className="digital-hero__actions">
            <a href={whatsappURL} target="_blank" rel="noreferrer" className="digital-button digital-button--primary">
              <MessageCircle size={18} /> Diseñar una solución similar
            </a>
            <Link href="/servicios" className="digital-button digital-button--secondary">
              Ver servicios <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="digital-section">
        <div className="digital-shell digital-project-story">
          <article>
            <span className="digital-kicker">EL DESAFÍO</span>
            <h2>{project.challenge}</h2>
          </article>
          <article>
            <span className="digital-kicker">LA ARQUITECTURA</span>
            <h2>{project.solution}</h2>
          </article>
        </div>
      </section>

      <section className="digital-section digital-section--contrast">
        <div className="digital-shell digital-detail-layout">
          <div>
            <span className="digital-kicker">MÓDULOS PRINCIPALES</span>
            <div className="digital-feature-grid">
              {project.modules.map((module, index) => (
                <div key={module}><span>{String(index + 1).padStart(2, '0')}</span><p>{module}</p></div>
              ))}
            </div>
          </div>
          <aside className="digital-detail-aside">
            <span className="digital-kicker">STACK POSIBLE</span>
            <div className="digital-tech-cloud">
              {project.technologies.map((technology) => <span key={technology}>{technology}</span>)}
            </div>
            <div className="digital-detail-outcomes">
              <h3>Resultado buscado</h3>
              <p><Check size={18} /> {project.outcome}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="digital-section">
        <div className="digital-shell">
          <div className="digital-section__heading">
            <span className="digital-kicker">OTRAS ARQUITECTURAS</span>
            <h2>La solución puede combinar módulos de distintos tipos de proyecto.</h2>
          </div>
          <div className="digital-related-grid">
            {related.map((item) => (
              <Link key={item.slug} href={`/proyectos/${item.slug}`}>
                <span>{item.category}</span>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <strong>Revisar proyecto <ArrowRight size={16} /></strong>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
