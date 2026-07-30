import Link from 'next/link'
import type { ReactNode } from 'react'

type Section = {
  id: string
  title: string
  content: ReactNode
}

export function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string
  title: string
  intro: ReactNode
  sections: Section[]
}) {
  return (
    <article className="legal-page">
      <header className="legal-hero">
        <div className="shell legal-hero__inner">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <div className="legal-intro">{intro}</div>
          <div className="legal-meta">
            <span>Actualizado: 30 de julio de 2026</span>
            <span>Ámbito principal: Chile</span>
          </div>
        </div>
      </header>
      <div className="shell legal-layout">
        <aside className="legal-index" aria-label="Índice de la página">
          <strong>Contenido</strong>
          {sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
          <Link href="/cookies">Política de cookies</Link>
          <Link href="/terminos">Términos de navegación</Link>
        </aside>
        <div className="legal-content">
          {sections.map((section) => (
            <section id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              {section.content}
            </section>
          ))}
          <div className="legal-note">
            <strong>Nota de alcance</strong>
            <p>Este texto describe la operación digital prevista del sitio y no sustituye asesoría jurídica para contratos, relaciones laborales, obligaciones tributarias o tratamientos especiales de datos.</p>
          </div>
        </div>
      </div>
    </article>
  )
}
