import type { CSSProperties } from 'react'
import {
  Blocks,
  BrainCircuit,
  CloudCog,
  Code2,
  Database,
  SearchCheck,
  ServerCog,
  Workflow,
} from 'lucide-react'

const technologyGroups = [
  {
    Icon: Code2,
    eyebrow: 'EXPERIENCIA',
    title: 'Frontend y movimiento',
    description: 'Interfaces rápidas, responsivas y diseñadas para guiar la atención.',
    technologies: ['Next.js', 'React', 'TypeScript', 'HTML', 'CSS', 'GSAP', 'Three.js'],
    tone: 'mint',
  },
  {
    Icon: ServerCog,
    eyebrow: 'LÓGICA',
    title: 'Backend y APIs',
    description: 'Servicios, permisos y contratos claros para que cada módulo pueda crecer.',
    technologies: ['NestJS', 'Node.js', 'REST', 'GraphQL', 'WebSockets', 'Payload CMS'],
    tone: 'gold',
  },
  {
    Icon: Database,
    eyebrow: 'DATOS',
    title: 'SQL y arquitectura relacional',
    description: 'Modelos consistentes, índices y migraciones para una fuente de verdad confiable.',
    technologies: ['PostgreSQL', 'SQLite', 'SQL', 'Supabase', 'Drizzle', 'Prisma'],
    tone: 'cyan',
  },
  {
    Icon: Workflow,
    eyebrow: 'OPERACIÓN',
    title: 'Automatización e integración',
    description: 'Flujos conectados a agendas, CRM, pagos, correo y herramientas del negocio.',
    technologies: ['n8n', 'Webhooks', 'Google Calendar', 'WhatsApp', 'Email', 'APIs'],
    tone: 'violet',
  },
  {
    Icon: BrainCircuit,
    eyebrow: 'INTELIGENCIA',
    title: 'IA, RAG y agentes',
    description: 'Sistemas que consultan conocimiento propio, muestran evidencia y ejecutan acciones controladas.',
    technologies: ['OpenAI', 'Ollama', 'RAG', 'Embeddings', 'Vector DB', 'Agents'],
    tone: 'mint',
  },
  {
    Icon: SearchCheck,
    eyebrow: 'VISIBILIDAD',
    title: 'SEO, metadata y medición',
    description: 'Arquitectura semántica, rendimiento y analítica orientados a posicionamiento y conversión.',
    technologies: ['SEO técnico', 'Schema.org', 'Lighthouse', 'Analytics', 'Search Console', 'Meta Pixel'],
    tone: 'gold',
  },
]

export function TechnologyIconGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`technology-icon-grid ${compact ? 'technology-icon-grid--compact' : ''}`.trim()}>
      {technologyGroups.map(({ Icon, eyebrow, title, description, technologies, tone }, index) => (
        <article
          key={title}
          className="technology-icon-card"
          data-runtime-reveal
          data-tech-tone={tone}
          style={{ '--technology-order': index } as CSSProperties}
        >
          <div className="technology-icon-card__top">
            <span className="technology-icon-card__icon" aria-hidden="true">
              <Icon size={24} strokeWidth={1.8} />
              <i />
            </span>
            <small>{String(index + 1).padStart(2, '0')}</small>
          </div>
          <span className="technology-icon-card__eyebrow">{eyebrow}</span>
          <h3>{title}</h3>
          <p>{description}</p>
          <div className="technology-icon-card__stack">
            {technologies.map((technology) => (
              <span key={technology}>{technology}</span>
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}

export function TechnologyArchitectureSignal() {
  return (
    <div className="technology-architecture-signal" aria-label="Arquitectura digital conectada">
      <span><Blocks size={18} /> Experiencia</span>
      <i />
      <span><ServerCog size={18} /> Lógica</span>
      <i />
      <span><Database size={18} /> Datos</span>
      <i />
      <span><CloudCog size={18} /> Escala</span>
    </div>
  )
}
