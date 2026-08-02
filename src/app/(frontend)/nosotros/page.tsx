import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BrainCircuit, Database, Gauge, MessageCircle, SearchCheck, ShieldCheck, Workflow } from 'lucide-react'

import { TechnologyArchitectureSignal, TechnologyIconGrid } from '@/components/TechnologyIconGrid'
import { DIGITAL_CONTACT } from '@/lib/digitalCatalog'

export const metadata: Metadata = {
  title: 'Método y tecnologías | FabrickBuild',
  description:
    'Conoce cómo FabrickBuild diseña experiencias web, software personalizado, bases de datos, automatizaciones, SEO técnico y sistemas con inteligencia artificial.',
}

const steps = [
  {
    title: 'Entender el objetivo',
    description: 'Definimos qué debe lograr el producto, quién lo utilizará y qué problema debe resolver primero.',
  },
  {
    title: 'Diseñar la arquitectura',
    description: 'Organizamos experiencia, módulos, datos, permisos, integraciones y recorrido de conversión.',
  },
  {
    title: 'Construir por etapas',
    description: 'Desarrollamos entregas verificables para validar antes de sumar complejidad innecesaria.',
  },
  {
    title: 'Medir y mejorar',
    description: 'Revisamos rendimiento, SEO, errores, uso real y oportunidades de automatización.',
  },
]

const principles = [
  { Icon: Gauge, title: 'Rendimiento primero', text: 'Carga rápida, imágenes optimizadas y experiencia estable en cualquier dispositivo.' },
  { Icon: SearchCheck, title: 'SEO desde la arquitectura', text: 'Metadata, semántica, schema, contenido y medición definidos desde el inicio.' },
  { Icon: Database, title: 'Datos bien relacionados', text: 'SQL, SQLite o PostgreSQL según la necesidad real del sistema.' },
  { Icon: Workflow, title: 'Automatización útil', text: 'Flujos que reducen trabajo repetido sin perder control ni trazabilidad.' },
  { Icon: BrainCircuit, title: 'IA con contexto', text: 'RAG, agentes y herramientas conectadas a fuentes autorizadas.' },
  { Icon: ShieldCheck, title: 'Seguridad y permisos', text: 'Accesos por rol, validaciones, sesiones y límites claros para cada acción.' },
]

export default function AboutPage() {
  return (
    <div className="digital-page">
      <section className="digital-hero digital-hero--about" data-section-tone="violet">
        <div className="digital-shell" data-runtime-reveal>
          <span className="digital-kicker">MÉTODO FABRICKBUILD</span>
          <h1>Diseño visual, ingeniería y estrategia trabajando como un solo sistema.</h1>
          <p>
            Cada proyecto comienza por entender la operación y la decisión que queremos facilitar. Después elegimos la
            tecnología, el contenido y el nivel de automatización que realmente aportan valor.
          </p>
          <div className="digital-hero__actions">
            <a href={DIGITAL_CONTACT.whatsappURL} target="_blank" rel="noreferrer" data-no-transition className="digital-button digital-button--primary">
              <MessageCircle size={18} /> Contar mi idea
            </a>
            <Link href="/servicios" className="digital-button digital-button--secondary">
              Ver capacidades <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="digital-section" data-section-tone="mint">
        <div className="digital-shell">
          <div className="digital-section__heading">
            <span className="digital-kicker">PROCESO</span>
            <h2>Claridad antes de código. Validación antes de escalar.</h2>
          </div>
          <TechnologyArchitectureSignal />
          <div className="digital-process-grid digital-process-grid--connected">
            {steps.map((step, index) => (
              <article key={step.title} data-runtime-reveal>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="digital-section digital-section--contrast" data-section-tone="gold">
        <div className="digital-shell">
          <div className="digital-section__heading">
            <span className="digital-kicker">PRINCIPIOS DE IMPLEMENTACIÓN</span>
            <h2>Una experiencia sorprendente también debe ser mantenible, segura y medible.</h2>
          </div>
          <div className="digital-principle-grid">
            {principles.map(({ Icon, title, text }) => (
              <article key={title} data-runtime-reveal>
                <Icon size={22} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="digital-section" data-section-tone="cyan">
        <div className="digital-shell">
          <div className="digital-section__heading">
            <span className="digital-kicker">STACK MODULAR</span>
            <h2>La tecnología se elige según el producto, no por moda.</h2>
            <p className="digital-lead">
              Una interfaz moderna puede convivir con un CMS administrable, una API especializada, datos relacionales,
              automatizaciones y modelos de inteligencia artificial locales o en la nube.
            </p>
          </div>
          <TechnologyIconGrid compact />
        </div>
      </section>

      <section className="digital-contact-band" data-section-tone="violet">
        <div className="digital-shell">
          <div>
            <span className="digital-kicker">TRABAJO PERSONALIZADO</span>
            <h2>La primera conversación sirve para ordenar la idea y definir el mejor punto de partida.</h2>
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
