import config from '@payload-config'
import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { getPayload } from 'payload'
import { ArrowRight, Check, MapPin, Ruler, Timer } from 'lucide-react'

import { sanitizeComponentStyles } from '@/lib/ai/builder'
import { appearanceProps, normalizeAppearance } from '@/lib/appearance'
import { getMediaAlt, getMediaURL } from '@/lib/media'
import { getProjects, getServices, getTestimonials } from '@/lib/queries'
import { AnimatedPreset } from './animation/AnimatedPreset'
import { AnimeSurface } from './animation/AnimeSurface'
import { ComponentFrame } from './generated/ComponentFrame'
import { LeadForm } from './LeadForm'
import { RichText } from './RichText'

type Doc = Record<string, any>

const isDoc = (item: unknown): item is Doc => Boolean(item) && typeof item === 'object'
const onlyDocs = (items: unknown[]): Doc[] => items.filter(isDoc)
const asDoc = (value: unknown): Doc | null => (isDoc(value) ? value : null)

const SectionHeading = ({ eyebrow, heading, intro }: Doc) => (
  <div className="section-heading">
    <div>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      {heading && <h2>{heading}</h2>}
    </div>
    {intro && <p>{intro}</p>}
  </div>
)

function BlockSurface({
  block,
  children,
  className = '',
  background,
  backgroundAlt = '',
  priority = false,
}: {
  block: Doc
  children: ReactNode
  className?: string
  background?: unknown
  backgroundAlt?: string
  priority?: boolean
}) {
  const props = appearanceProps(block.appearance, className)
  const mediaURL = getMediaURL(background as never, 'hero')
  const appearance = normalizeAppearance(block.appearance)

  return (
    <section className={props.className} style={props.style as CSSProperties}>
      {mediaURL && (
        <Image
          className="cms-surface__background"
          src={mediaURL}
          alt={getMediaAlt(background as never, backgroundAlt)}
          fill
          priority={priority}
          sizes="100vw"
        />
      )}
      <div className="cms-surface__overlay" aria-hidden="true" />
      <AnimeSurface
        className="cms-surface__content"
        preset={appearance.animationPreset}
        duration={appearance.animationDuration}
        delay={appearance.animationDelay}
      >
        {children}
      </AnimeSurface>
    </section>
  )
}

const ServiceCards = ({ services }: { services: Doc[] }) => (
  <div className="service-grid">
    {services.map((service, index) => {
      const image = getMediaURL(service.cover, 'card')
      return (
        <Link href={`/servicios/${service.slug}`} className="service-card" key={service.id || index}>
          <div className="card-media">
            {image ? (
              <Image src={image} alt={getMediaAlt(service.cover, service.title)} fill sizes="(max-width: 800px) 92vw, 33vw" />
            ) : (
              <div className="service-placeholder"><span>{String(index + 1).padStart(2, '0')}</span></div>
            )}
          </div>
          <div className="card-body">
            <span className="card-index">{String(index + 1).padStart(2, '0')}</span>
            <h3>{service.title}</h3>
            <p>{service.summary}</p>
            <span className="text-link">Ver servicio <ArrowRight size={16} /></span>
          </div>
        </Link>
      )
    })}
  </div>
)

const ProjectCards = ({ projects }: { projects: Doc[] }) => (
  <div className="project-grid">
    {projects.map((project, index) => {
      const image = getMediaURL(project.cover, 'card')
      return (
        <Link href={`/proyectos/${project.slug}`} className="project-card" key={project.id || index}>
          <div className="project-media">
            {image ? (
              <Image src={image} alt={getMediaAlt(project.cover, project.title)} fill sizes="(max-width: 800px) 92vw, 50vw" />
            ) : (
              <div className="project-placeholder">FABRICK / {String(index + 1).padStart(2, '0')}</div>
            )}
            <span>{project.projectStatus === 'building' ? 'En construcción' : 'Proyecto'}</span>
          </div>
          <div className="project-info">
            <div><h3>{project.title}</h3><p>{project.summary}</p></div>
            <ArrowRight />
          </div>
          <div className="project-meta">
            {project.details?.location && <span><MapPin size={14} />{project.details.location}</span>}
            {project.details?.area && <span><Ruler size={14} />{project.details.area} m²</span>}
            {project.details?.duration && <span><Timer size={14} />{project.details.duration}</span>}
          </div>
        </Link>
      )
    })}
  </div>
)

async function ServicesBlock({ block }: { block: Doc }) {
  const selected = Array.isArray(block.services) ? onlyDocs(block.services) : []
  const services = selected.length ? selected : onlyDocs(await getServices(true, block.limit || 6))
  return (
    <BlockSurface block={block} className="section">
      <div className="shell">
        <SectionHeading eyebrow={block.eyebrow} heading={block.heading} intro={block.intro} />
        <ServiceCards services={services} />
        <div className="section-action"><Link className="button button-outline" href="/servicios">Ver todos los servicios</Link></div>
      </div>
    </BlockSurface>
  )
}

async function ProjectsBlock({ block }: { block: Doc }) {
  const selected = Array.isArray(block.projects) ? onlyDocs(block.projects) : []
  const projects = selected.length ? selected : onlyDocs(await getProjects(true, block.limit || 6))
  if (!projects.length) return null
  return (
    <BlockSurface block={block} className="section section-dark">
      <div className="shell">
        <SectionHeading eyebrow={block.eyebrow} heading={block.heading} intro={block.intro} />
        <ProjectCards projects={projects} />
        <div className="section-action"><Link className="button button-light" href="/proyectos">Explorar proyectos</Link></div>
      </div>
    </BlockSurface>
  )
}

async function TestimonialsBlock({ block }: { block: Doc }) {
  const selected = Array.isArray(block.items) ? onlyDocs(block.items) : []
  const items = selected.length ? selected : onlyDocs(await getTestimonials())
  if (!items.length) return null
  return (
    <BlockSurface block={block} className="section testimonials-section">
      <div className="shell">
        <SectionHeading eyebrow={block.eyebrow} heading={block.heading} />
        <div className="testimonial-grid">
          {items.map((item) => (
            <article key={item.id}>
              <div className="stars">{'★★★★★'.slice(0, item.rating || 5)}</div>
              <blockquote>“{item.quote}”</blockquote>
              <strong>{item.name}</strong><span>{item.role}</span>
            </article>
          ))}
        </div>
      </div>
    </BlockSurface>
  )
}

async function ContactFormBlock({ block }: { block: Doc }) {
  const selected = Array.isArray(block.services) ? onlyDocs(block.services) : []
  const services = selected.length ? selected : onlyDocs(await getServices(false, 30))
  return (
    <BlockSurface block={block} className="contact-section">
      <div className="shell contact-grid" id="contacto">
        <div>
          <span className="eyebrow">{block.eyebrow || 'Cotización'}</span>
          <h2>{block.heading}</h2>
          <p>{block.description}</p>
          <ul className="contact-benefits">
            <li><Check size={17} /> Evaluación inicial del alcance</li>
            <li><Check size={17} /> Respuesta organizada por etapas</li>
            <li><Check size={17} /> Seguimiento desde el panel</li>
          </ul>
        </div>
        <LeadForm services={services} successMessage={block.successMessage} />
      </div>
    </BlockSurface>
  )
}

async function ReusableComponentBlock({ block, depth }: { block: Doc; depth: number }) {
  if (depth >= 4) return null
  let component = asDoc(block.component)
  if (!component && (typeof block.component === 'string' || typeof block.component === 'number')) {
    try {
      const payload = await getPayload({ config })
      component = await (payload as any).findByID({
        collection: 'reusable-components', id: block.component, depth: 2, overrideAccess: true,
      })
    } catch {
      return null
    }
  }
  if (!component || component.status !== 'active') return null

  if (component.kind && component.kind !== 'layout') {
    return (
      <BlockSurface block={block} className="section reusable-animated-section">
        <div className="shell">
          <AnimatedPreset component={{ ...component, ...(component.animatedContent || {}) }} />
        </div>
      </BlockSurface>
    )
  }

  if (!Array.isArray(component.layout)) return null
  let styles = ''
  try {
    styles = sanitizeComponentStyles(component.styles || '', String(component.slug || 'component'))
  } catch {
    styles = ''
  }
  return (
    <BlockSurface block={block} className="reusable-layout-section">
      <ComponentFrame anchor={block.anchor} background={block.background} componentSlug={String(component.slug || 'component')} spacing={block.spacing} styles={styles}>
        <RenderBlocks blocks={component.layout} componentDepth={depth + 1} />
      </ComponentFrame>
    </BlockSurface>
  )
}

function heroBackground(block: Doc) {
  if (block.backgroundSource === 'url' && typeof block.backgroundURL === 'string') return null
  if (block.backgroundSource === 'saved') {
    const saved = asDoc(block.savedBackground)
    return saved?.image || saved?.poster || saved?.mobileFrames?.[0] || saved?.desktopFrames?.[0]
  }
  return block.media
}

async function renderBlock(block: Doc, index: number, componentDepth: number) {
  const key = block.id || `${block.blockType}-${index}`
  switch (block.blockType) {
    case 'hero': {
      const background = heroBackground(block)
      const appearance = { ...(block.appearance || {}) }
      if (block.backgroundSource === 'url' && typeof block.backgroundURL === 'string') appearance.backgroundURL = block.backgroundURL
      const hero = { ...block, appearance }
      return (
        <BlockSurface key={key} block={hero} className={`hero hero-${block.theme || 'dark'}`} background={background} backgroundAlt={block.heading} priority={index === 0}>
          <div className="shell hero-inner">
            <div className="hero-copy">
              {block.eyebrow && <span className="eyebrow">{block.eyebrow}</span>}
              <h1>{block.heading}{block.highlight && <><br /><em>{block.highlight}</em></>}</h1>
              <p>{block.description}</p>
              <div className="hero-actions">
                <Link className="button button-yellow" href={block.primaryCTA?.url || '#contacto'}>{block.primaryCTA?.label || 'Solicitar cotización'}</Link>
                <Link className="button button-ghost" href={block.secondaryCTA?.url || '/proyectos'}>{block.secondaryCTA?.label || 'Ver proyectos'} <ArrowRight size={17} /></Link>
              </div>
              {Array.isArray(block.stats) && <div className="hero-stats">{onlyDocs(block.stats).map((item) => <div key={item.id || item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}</div>}
            </div>
            <div className="hero-console" aria-hidden="true">
              <div className="console-head"><span>FABRICK / OBRA</span><b>EN LÍNEA</b></div>
              <div className="blueprint"><i className="line-a" /><i className="line-b" /><i className="line-c" /><div className="model"><span /><span /><span /><b /></div><small className="measure-x">12,40 m</small><small className="measure-y">8,75 m</small></div>
              <div className="console-foot"><span>● MODELO SINCRONIZADO</span><b>98.4%</b></div>
            </div>
          </div>
        </BlockSurface>
      )
    }
    case 'servicesGrid': return <ServicesBlock block={block} key={key} />
    case 'projectsGrid': return <ProjectsBlock block={block} key={key} />
    case 'testimonials': return <TestimonialsBlock block={block} key={key} />
    case 'contactForm': return <ContactFormBlock block={block} key={key} />
    case 'reusableComponent': return <ReusableComponentBlock block={block} depth={componentDepth} key={key} />
    case 'content': {
      const media = getMediaURL(block.media, 'hero')
      return (
        <BlockSurface key={key} block={block} className="section">
          <div className="shell"><div className={`content-split media-${block.mediaPosition || 'right'}`}><div>{block.eyebrow && <span className="eyebrow">{block.eyebrow}</span>}{block.heading && <h2>{block.heading}</h2>}<RichText data={block.content} /></div>{media && <div className="content-media"><Image src={media} alt={getMediaAlt(block.media, block.heading)} fill sizes="(max-width: 900px) 92vw, 50vw" /></div>}</div></div>
        </BlockSurface>
      )
    }
    case 'stats': return (
      <BlockSurface key={key} block={block} className="stats-section"><div className="shell">{block.heading && <h2>{block.heading}</h2>}<div className="stats-grid">{onlyDocs(Array.isArray(block.items) ? block.items : []).map((item) => <article key={item.id || item.label}><strong>{item.value}</strong><h3>{item.label}</h3><p>{item.description}</p></article>)}</div></div></BlockSurface>
    )
    case 'beforeAfter': {
      const before = getMediaURL(block.before, 'hero'); const after = getMediaURL(block.after, 'hero')
      if (!before || !after) return null
      return <BlockSurface key={key} block={block} className="section"><div className="shell"><SectionHeading eyebrow={block.eyebrow} heading={block.heading} intro={block.description} /><div className="before-after"><figure><Image src={before} alt={getMediaAlt(block.before, 'Antes')} fill sizes="(max-width: 760px) 92vw, 50vw" /><figcaption>Antes</figcaption></figure><figure><Image src={after} alt={getMediaAlt(block.after, 'Después')} fill sizes="(max-width: 760px) 92vw, 50vw" /><figcaption>Después</figcaption></figure></div></div></BlockSurface>
    }
    case 'cta': return <BlockSurface key={key} block={block} className="cta-section"><div className="shell cta-inner"><div>{block.eyebrow && <span className="eyebrow">{block.eyebrow}</span>}<h2>{block.heading}</h2><p>{block.description}</p></div><Link className="round-link" href={block.button?.url || '#contacto'} aria-label={block.button?.label || 'Cotizar'}><ArrowRight /></Link></div></BlockSurface>
    default: return null
  }
}

export async function RenderBlocks({ blocks = [], componentDepth = 0 }: { blocks?: Doc[]; componentDepth?: number }) {
  const rendered = await Promise.all(blocks.map((block, index) => renderBlock(block, index, componentDepth)))
  return <>{rendered}</>
}

export { ProjectCards, ServiceCards }
