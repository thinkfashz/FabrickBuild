'use client'
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

import { useLivePreview } from '@payloadcms/live-preview-react'
import { ArrowRight, Check, Code2, Layers3 } from 'lucide-react'
import { useEffect, useMemo, useSyncExternalStore } from 'react'

import { blockAppearanceProps, getBlockFrameSequence, pageAppearanceProps, resolveBlockBackground } from '@/lib/appearance'
import { getMediaAlt, getMediaURL } from '@/lib/media'
import { FrameSequenceBackground } from './FrameSequenceBackground'
import { PortfolioExperience } from './PortfolioExperience'

type Doc = Record<string, any>

const isDoc = (value: unknown): value is Doc => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const onlyDocs = (value: unknown): Doc[] => Array.isArray(value) ? value.filter(isDoc) : []

function presentation(block: Doc, className: string) {
  const props = blockAppearanceProps(block)
  return { className: `${className} ${props.className}`, style: props.style }
}

function PlainRichText({ value }: { value: unknown }) {
  const text = useMemo(() => {
    const output: string[] = []
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') return
      const record = node as Record<string, unknown>
      if (typeof record.text === 'string') output.push(record.text)
      if (Array.isArray(record.children)) record.children.forEach(walk)
      if (record.root && typeof record.root === 'object') walk(record.root)
    }
    walk(value)
    return output.join(' ').replace(/\s+/g, ' ').trim()
  }, [value])
  return text ? <p className="richtext">{text}</p> : null
}

function PreviewImage({ media, alt, className }: { media: unknown; alt: string; className?: string }) {
  const src = getMediaURL(media as any, 'hero') || getMediaURL(media as any)
  if (!src) return <div className={className ? `${className} service-placeholder` : 'service-placeholder'} aria-label="Imagen pendiente" />
  return <img className={className} src={src} alt={getMediaAlt(media as any, alt)} />
}

function SectionHeading({ eyebrow, heading, intro }: Doc) {
  return <div className="section-heading"><div>{eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}<h2>{heading || 'Título de sección'}</h2></div>{intro ? <p>{intro}</p> : null}</div>
}

function LiveBlock({ block, depth = 0 }: { block: Doc; depth?: number }) {
  if (depth > 3) return null
  switch (block.blockType) {
    case 'hero': {
      const image = resolveBlockBackground(block)
      const sequence = getBlockFrameSequence(block)
      return <section {...presentation(block, `hero hero-${block.theme || 'dark'}`)}>
        {sequence ? <FrameSequenceBackground sequence={sequence} /> : image ? <div className="hero-background" aria-hidden="true" style={{ backgroundImage: `url(${JSON.stringify(image)})` }} /> : null}
        <div className="hero-overlay" />
        <div className="shell hero-inner"><div className="hero-copy"><span className="eyebrow">{block.eyebrow}</span><h1>{block.heading}<br />{block.highlight ? <em>{block.highlight}</em> : null}</h1><p>{block.description}</p><div className="hero-actions"><a className="button button-yellow" href={block.primaryCTA?.url || '#contacto'}>{block.primaryCTA?.label || 'Acción principal'}</a><a className="button button-ghost" href={block.secondaryCTA?.url || '#'}>{block.secondaryCTA?.label || 'Conocer más'} <ArrowRight size={17} /></a></div>{onlyDocs(block.stats).length ? <div className="hero-stats">{onlyDocs(block.stats).map((item, index) => <div key={item.id || index}><strong>{item.value}</strong><span>{item.label}</span></div>)}</div> : null}</div></div>
      </section>
    }
    case 'servicesGrid': {
      const items = onlyDocs(block.services)
      return <section {...presentation(block, 'section')}><div className="shell"><SectionHeading eyebrow={block.eyebrow} heading={block.heading} intro={block.intro} /><div className="service-grid">{(items.length ? items : Array.from({ length: Math.min(Number(block.limit) || 3, 3) }, (_, index) => ({ id: index, title: `Servicio ${index + 1}`, summary: 'Aparecerá el contenido publicado de esta colección.' })) as Doc[]).map((item, index) => <article className="service-card" key={item.id || index}><div className="card-media"><PreviewImage media={item.cover} alt={item.title || 'Servicio'} /></div><div className="card-body"><span className="card-index">{String(index + 1).padStart(2, '0')}</span><h3>{item.title}</h3><p>{item.summary}</p></div></article>)}</div></div></section>
    }
    case 'projectsGrid': {
      const items = onlyDocs(block.projects)
      return <section {...presentation(block, 'section section-dark')}><div className="shell"><SectionHeading eyebrow={block.eyebrow} heading={block.heading} intro={block.intro} /><div className="project-grid">{(items.length ? items : Array.from({ length: Math.min(Number(block.limit) || 2, 2) }, (_, index) => ({ id: index, title: `Proyecto ${index + 1}`, summary: 'Proyecto visible en la colección.' })) as Doc[]).map((item, index) => <article className="project-card" key={item.id || index}><div className="project-media"><PreviewImage media={item.cover} alt={item.title || 'Proyecto'} /><span>Proyecto</span></div><div className="project-info"><div><h3>{item.title}</h3><p>{item.summary}</p></div><ArrowRight /></div></article>)}</div></div></section>
    }
    case 'content': {
      const image = getMediaURL(block.media, 'hero') || getMediaURL(block.media)
      return <section {...presentation(block, 'section')}><div className="shell"><div className={`content-split media-${block.mediaPosition || 'right'}`}><div>{block.eyebrow ? <span className="eyebrow">{block.eyebrow}</span> : null}{block.heading ? <h2>{block.heading}</h2> : null}<PlainRichText value={block.content} /></div>{image ? <div className="content-media"><img src={image} alt={getMediaAlt(block.media, block.heading || '')} /></div> : null}</div></div></section>
    }
    case 'stats':
      return <section {...presentation(block, 'stats-section')}><div className="shell">{block.heading ? <h2>{block.heading}</h2> : null}<div className="stats-grid">{onlyDocs(block.items).map((item, index) => <article key={item.id || index}><strong>{item.value}</strong><h3>{item.label}</h3><p>{item.description}</p></article>)}</div></div></section>
    case 'testimonials': {
      const items = onlyDocs(block.items)
      return <section {...presentation(block, 'section testimonials-section')}><div className="shell"><SectionHeading eyebrow={block.eyebrow} heading={block.heading} /><div className="testimonial-grid">{(items.length ? items : [{ name: 'Cliente', quote: 'El testimonio se verá aquí.', rating: 5 }]).map((item, index) => <article key={item.id || index}><div className="stars">{'★★★★★'.slice(0, Number(item.rating) || 5)}</div><blockquote>“{item.quote}”</blockquote><strong>{item.name}</strong><span>{item.role}</span></article>)}</div></div></section>
    }
    case 'beforeAfter':
      return <section {...presentation(block, 'section')}><div className="shell"><SectionHeading eyebrow={block.eyebrow} heading={block.heading} intro={block.description} /><div className="before-after"><figure><PreviewImage media={block.before} alt="Antes" /><figcaption>Antes</figcaption></figure><figure><PreviewImage media={block.after} alt="Después" /><figcaption>Después</figcaption></figure></div></div></section>
    case 'cta':
      return <section {...presentation(block, 'cta-section')}><div className="shell cta-inner"><div><span className="eyebrow">{block.eyebrow}</span><h2>{block.heading}</h2><p>{block.description}</p></div><a className="round-link" href={block.button?.url || '#'} aria-label={block.button?.label || 'Acción'}><ArrowRight /></a></div></section>
    case 'contactForm':
      return <section {...presentation(block, 'contact-section')}><div className="shell contact-grid"><div><span className="eyebrow">{block.eyebrow || 'Contacto'}</span><h2>{block.heading}</h2><p>{block.description}</p><ul className="contact-benefits"><li><Check size={17} /> Respuesta organizada por etapas</li><li><Check size={17} /> Seguimiento desde el panel</li></ul></div><div className="lead-form"><label>Nombre<input placeholder="Tu nombre" readOnly /></label><label>Correo<input placeholder="tu@correo.cl" readOnly /></label><button type="button" className="button button-yellow">{block.successMessage || 'Enviar solicitud'}</button></div></div></section>
    case 'reusableComponent': {
      const component = isDoc(block.component) ? block.component : null
      if (component?.layout) return <section {...presentation(block, '')}>{onlyDocs(component.layout).map((nested, index) => <LiveBlock key={nested.id || index} block={nested} depth={depth + 1} />)}</section>
      return <section {...presentation(block, 'section')}><div className="shell"><div className="live-component-card"><Layers3 size={20} /><div><span className="eyebrow">COMPONENTE REUTILIZABLE</span><h2>{component?.title || component?.name || 'Selecciona un componente'}</h2><p>Su contenido se mostrará al guardar o cuando la relación esté disponible.</p></div></div></div></section>
    }
    case 'portfolioShowcase': {
      const sequence = getBlockFrameSequence(block)
      return (
        <section {...presentation(block, sequence ? 'portfolio-showcase portfolio-showcase--cinematic' : 'portfolio-showcase')}>
          {sequence && <FrameSequenceBackground sequence={sequence} />}
          <PortfolioExperience block={block} />
        </section>
      )
    }
    default:
      return <section {...presentation(block, 'section')}><div className="shell"><div className="live-component-card"><Code2 size={20} /><div><span className="eyebrow">BLOQUE</span><h2>{block.blockType}</h2><p>Este bloque aparecerá actualizado al guardar.</p></div></div></div></section>
  }
}

export default function LivePagePreview({ initialPage }: { initialPage: Doc }) {
  const embedded = useSyncExternalStore(
    () => () => undefined,
    () => window.self !== window.top,
    () => false,
  )
  const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || (typeof window === 'undefined' ? '' : window.location.origin)
  const { data } = useLivePreview<Doc>({ initialData: initialPage, serverURL, depth: 3 })

  useEffect(() => {
    const active = window.self !== window.top
    if (active) {
      document.documentElement.classList.add('payload-live-preview')
    }
    return () => document.documentElement.classList.remove('payload-live-preview')
  }, [])

  if (!embedded) return null
  const page = isDoc(data) ? data : initialPage
  const pageProps = pageAppearanceProps(page)
  return <main className={`ai-page page-live-render ${pageProps.className}`} style={pageProps.style}><div className="fabrick-page-content">{onlyDocs(page.layout).map((block, index) => <LiveBlock key={block.id || index} block={block} />)}</div></main>
}
