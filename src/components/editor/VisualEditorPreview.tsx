'use client'

import { useLivePreview } from '@payloadcms/live-preview-react'
import { ArrowRight, Check, Code2, Layers3 } from 'lucide-react'
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { appearanceProps, normalizeAppearance } from '@/lib/appearance'
import { getMediaAlt, getMediaURL } from '@/lib/media'
import {
  editorBlockLabels,
  fallbackEditorPage,
  normalizeEditorPage,
  richTextToPlain,
  type EditorBlock,
  type EditorPage,
} from '@/lib/visual-editor'

type Doc = Record<string, any>

type EditorMessage = {
  type?: string
  page?: EditorPage
  selectedBlockId?: string | null
}

const isDoc = (value: unknown): value is Doc => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const docs = (value: unknown): Doc[] => Array.isArray(value) ? value.filter(isDoc) : []

function mediaURL(value: unknown) {
  if (typeof value === 'string' && /^(data:image\/|https?:\/\/|\/)/i.test(value)) return value
  return getMediaURL(value as never, 'hero') || getMediaURL(value as never)
}

function PreviewImage({ value, alt, className }: { value: unknown; alt: string; className?: string }) {
  const src = mediaURL(value)
  if (!src) return <div className={`${className || ''} service-placeholder`} aria-label="Imagen pendiente" />
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={src} alt={getMediaAlt(value as never, alt)} />
}

function Editable({
  block,
  index,
  path,
  children,
  className,
}: {
  block: EditorBlock
  index: number
  path: string
  children: ReactNode
  className?: string
}) {
  const sendSelection = () => {
    window.parent.postMessage(
      { type: 'fabrick-editor:select', blockId: block.id, blockIndex: index, fieldPath: path },
      '*',
    )
  }

  const select = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    sendSelection()
  }

  const selectWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.stopPropagation()
    sendSelection()
  }

  return (
    <div
      className={className}
      data-editor-field={path}
      onClick={select}
      onKeyDown={selectWithKeyboard}
      role="button"
      tabIndex={0}
      style={{ display: 'contents' }}
    >
      {children}
    </div>
  )
}

function SectionHeading({ block, index }: { block: EditorBlock; index: number }) {
  return (
    <div className="section-heading">
      <div>
        {block.eyebrow ? <Editable block={block} index={index} path="eyebrow"><span className="eyebrow">{block.eyebrow}</span></Editable> : null}
        <Editable block={block} index={index} path="heading"><h2>{block.heading || 'Título de sección'}</h2></Editable>
      </div>
      {block.intro ? <Editable block={block} index={index} path="intro"><p>{block.intro}</p></Editable> : null}
    </div>
  )
}

function BlockFrame({
  block,
  index,
  selected,
  children,
}: {
  block: EditorBlock
  index: number
  selected: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`visual-editor-block${selected ? ' visual-editor-block--selected' : ''}`}
      data-block-id={block.id}
      data-block-index={index}
      onClick={(event) => {
        event.preventDefault()
        window.parent.postMessage(
          { type: 'fabrick-editor:select', blockId: block.id, blockIndex: index },
          '*',
        )
      }}
    >
      <span className="visual-editor-block__badge">
        {String(index + 1).padStart(2, '0')} · {editorBlockLabels[block.blockType] || block.blockType}
      </span>
      {children}
    </div>
  )
}

function LiveBlock({ block, index, selected }: { block: EditorBlock; index: number; selected: boolean }) {
  const presentation = appearanceProps(block.appearance)
  const appearance = normalizeAppearance(block.appearance)
  const imageOverride = appearance.imageURL || undefined
  const secondaryImageOverride = appearance.secondaryImageURL || undefined

  switch (block.blockType) {
    case 'portfolioShowcase': {
      const projects: Doc[] = docs(block.projects).length
        ? docs(block.projects)
        : [{ title: 'Proyecto', description: 'Añade proyectos desde el inspector.' }]
      return (
        <BlockFrame block={block} index={index} selected={selected}>
          <section className="portfolio-experience-shell" style={presentation.style as CSSProperties}>
            <div className="portfolio-hero">
              <Editable block={block} index={index} path="eyebrow"><span className="eyebrow">{block.eyebrow || 'ESTUDIO DIGITAL'}</span></Editable>
              <Editable block={block} index={index} path="heading"><h1>{block.heading || 'Diseñamos experiencias vivas.'}</h1></Editable>
              {block.highlight ? <Editable block={block} index={index} path="highlight"><h1><em>{block.highlight}</em></h1></Editable> : null}
              <Editable block={block} index={index} path="description"><p>{block.description}</p></Editable>
              <div className="hero-actions">
                <Editable block={block} index={index} path="primaryCTA.label"><a className="button button-yellow" href="#">{block.primaryCTA?.label || 'Ver proyectos'}</a></Editable>
                <Editable block={block} index={index} path="secondaryCTA.label"><a className="button button-ghost" href="#">{block.secondaryCTA?.label || 'Hablemos'} <ArrowRight size={16} /></a></Editable>
              </div>
            </div>
            <div className="portfolio-project-list">
              {projects.map((project, projectIndex) => (
                <article className="project-card" key={project.id || projectIndex}>
                  <div className="project-media">
                    <PreviewImage value={project.imageURL || project.image} alt={project.title || 'Proyecto'} />
                    <span>{project.type || 'Proyecto digital'}</span>
                  </div>
                  <div className="project-info"><div><h3>{project.title}</h3><p>{project.description}</p></div><ArrowRight /></div>
                </article>
              ))}
            </div>
          </section>
        </BlockFrame>
      )
    }

    case 'hero': {
      const background = appearance.backgroundURL || block.backgroundURL || mediaURL(block.media)
      return (
        <BlockFrame block={block} index={index} selected={selected}>
          <section className={`${presentation.className} hero hero-${block.theme || 'dark'}`} style={presentation.style as CSSProperties}>
            {background ? <div className="hero-background" style={{ backgroundImage: `url(${JSON.stringify(background)})` }} /> : null}
            <div className="hero-overlay" />
            <div className="shell hero-inner">
              <div className="hero-copy">
                {block.eyebrow ? <Editable block={block} index={index} path="eyebrow"><span className="eyebrow">{block.eyebrow}</span></Editable> : null}
                <Editable block={block} index={index} path="heading"><h1>{block.heading || 'Título principal'}</h1></Editable>
                {block.highlight ? <Editable block={block} index={index} path="highlight"><h1><em>{block.highlight}</em></h1></Editable> : null}
                <Editable block={block} index={index} path="description"><p>{block.description}</p></Editable>
                <div className="hero-actions">
                  <Editable block={block} index={index} path="primaryCTA.label"><a className="button button-yellow" href="#">{block.primaryCTA?.label || 'Acción principal'}</a></Editable>
                  <Editable block={block} index={index} path="secondaryCTA.label"><a className="button button-ghost" href="#">{block.secondaryCTA?.label || 'Conocer más'} <ArrowRight size={16} /></a></Editable>
                </div>
                {docs(block.stats).length ? (
                  <div className="hero-stats">
                    {docs(block.stats).map((item, itemIndex) => (
                      <div key={item.id || itemIndex}>
                        <Editable block={block} index={index} path={`stats.${itemIndex}.value`}><strong>{item.value}</strong></Editable>
                        <Editable block={block} index={index} path={`stats.${itemIndex}.label`}><span>{item.label}</span></Editable>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </BlockFrame>
      )
    }

    case 'servicesGrid': {
      const items = docs(block.services)
      const placeholders: Doc[] = Array.from({ length: Math.min(Number(block.limit) || 3, 6) }, (_, itemIndex) => ({
        id: itemIndex,
        title: `Servicio ${itemIndex + 1}`,
        summary: 'El contenido publicado aparecerá aquí.',
      }))
      const cards: Doc[] = items.length ? items : placeholders
      return (
        <BlockFrame block={block} index={index} selected={selected}>
          <section className={`${presentation.className} section`} style={presentation.style as CSSProperties}>
            <div className="shell"><SectionHeading block={block} index={index} />
              <div className="service-grid">
                {cards.map((item, itemIndex) => (
                  <article className="service-card" key={item.id || itemIndex}>
                    <div className="card-media"><PreviewImage value={item.cover} alt={item.title || 'Servicio'} /></div>
                    <div className="card-body"><span className="card-index">{String(itemIndex + 1).padStart(2, '0')}</span><h3>{item.title}</h3><p>{item.summary}</p></div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </BlockFrame>
      )
    }

    case 'projectsGrid': {
      const items = docs(block.projects)
      const placeholders: Doc[] = Array.from({ length: Math.min(Number(block.limit) || 2, 4) }, (_, itemIndex) => ({
        id: itemIndex,
        title: `Proyecto ${itemIndex + 1}`,
        summary: 'Proyecto relacionado desde Payload.',
      }))
      const cards: Doc[] = items.length ? items : placeholders
      return (
        <BlockFrame block={block} index={index} selected={selected}>
          <section className={`${presentation.className} section section-dark`} style={presentation.style as CSSProperties}>
            <div className="shell"><SectionHeading block={block} index={index} />
              <div className="project-grid">
                {cards.map((item, itemIndex) => (
                  <article className="project-card" key={item.id || itemIndex}>
                    <div className="project-media"><PreviewImage value={item.cover} alt={item.title || 'Proyecto'} /><span>Proyecto</span></div>
                    <div className="project-info"><div><h3>{item.title}</h3><p>{item.summary}</p></div><ArrowRight /></div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </BlockFrame>
      )
    }

    case 'content': {
      const image = imageOverride || mediaURL(block.media)
      return (
        <BlockFrame block={block} index={index} selected={selected}>
          <section className={`${presentation.className} section`} style={presentation.style as CSSProperties}>
            <div className="shell"><div className={`content-split media-${block.mediaPosition || 'right'}`}>
              <div>
                {block.eyebrow ? <Editable block={block} index={index} path="eyebrow"><span className="eyebrow">{block.eyebrow}</span></Editable> : null}
                <Editable block={block} index={index} path="heading"><h2>{block.heading || 'Contenido'}</h2></Editable>
                <Editable block={block} index={index} path="content"><p>{richTextToPlain(block.content) || 'Escribe el contenido desde el inspector.'}</p></Editable>
              </div>
              {image ? <div className="content-media"><PreviewImage value={image} alt={block.heading || 'Contenido'} /></div> : null}
            </div></div>
          </section>
        </BlockFrame>
      )
    }

    case 'stats':
      return (
        <BlockFrame block={block} index={index} selected={selected}>
          <section className={`${presentation.className} stats-section`} style={presentation.style as CSSProperties}>
            <div className="shell">
              <Editable block={block} index={index} path="heading"><h2>{block.heading || 'Indicadores'}</h2></Editable>
              <div className="stats-grid">
                {docs(block.items).map((item, itemIndex) => (
                  <article key={item.id || itemIndex}>
                    <Editable block={block} index={index} path={`items.${itemIndex}.value`}><strong>{item.value}</strong></Editable>
                    <Editable block={block} index={index} path={`items.${itemIndex}.label`}><h3>{item.label}</h3></Editable>
                    <Editable block={block} index={index} path={`items.${itemIndex}.description`}><p>{item.description}</p></Editable>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </BlockFrame>
      )

    case 'testimonials': {
      const items: Doc[] = docs(block.items).length
        ? docs(block.items)
        : [{ name: 'Cliente', quote: 'El testimonio se verá aquí.', rating: 5 }]
      return (
        <BlockFrame block={block} index={index} selected={selected}>
          <section className={`${presentation.className} section testimonials-section`} style={presentation.style as CSSProperties}>
            <div className="shell"><SectionHeading block={block} index={index} />
              <div className="testimonial-grid">
                {items.map((item, itemIndex) => (
                  <article key={item.id || itemIndex}><div className="stars">{'★★★★★'.slice(0, Number(item.rating) || 5)}</div><blockquote>“{item.quote}”</blockquote><strong>{item.name}</strong><span>{item.role}</span></article>
                ))}
              </div>
            </div>
          </section>
        </BlockFrame>
      )
    }

    case 'beforeAfter':
      return (
        <BlockFrame block={block} index={index} selected={selected}>
          <section className={`${presentation.className} section`} style={presentation.style as CSSProperties}>
            <div className="shell"><SectionHeading block={block} index={index} />
              <Editable block={block} index={index} path="description"><p>{block.description}</p></Editable>
              <div className="before-after">
                <figure><PreviewImage value={imageOverride || block.before} alt="Antes" /><figcaption>Antes</figcaption></figure>
                <figure><PreviewImage value={secondaryImageOverride || block.after} alt="Después" /><figcaption>Después</figcaption></figure>
              </div>
            </div>
          </section>
        </BlockFrame>
      )

    case 'cta':
      return (
        <BlockFrame block={block} index={index} selected={selected}>
          <section className={`${presentation.className} cta-section`} style={presentation.style as CSSProperties}>
            <div className="shell cta-inner"><div>
              {block.eyebrow ? <Editable block={block} index={index} path="eyebrow"><span className="eyebrow">{block.eyebrow}</span></Editable> : null}
              <Editable block={block} index={index} path="heading"><h2>{block.heading || 'Llamado a la acción'}</h2></Editable>
              <Editable block={block} index={index} path="description"><p>{block.description}</p></Editable>
            </div>
              <Editable block={block} index={index} path="button.label"><a className="round-link" href="#" aria-label={block.button?.label || 'Acción'}><ArrowRight /></a></Editable>
            </div>
          </section>
        </BlockFrame>
      )

    case 'contactForm':
      return (
        <BlockFrame block={block} index={index} selected={selected}>
          <section className={`${presentation.className} contact-section`} style={presentation.style as CSSProperties}>
            <div className="shell contact-grid"><div>
              <Editable block={block} index={index} path="eyebrow"><span className="eyebrow">{block.eyebrow || 'Contacto'}</span></Editable>
              <Editable block={block} index={index} path="heading"><h2>{block.heading || 'Describe tu proyecto.'}</h2></Editable>
              <Editable block={block} index={index} path="description"><p>{block.description}</p></Editable>
              <ul className="contact-benefits"><li><Check size={17} /> Respuesta organizada por etapas</li><li><Check size={17} /> Seguimiento desde el panel</li></ul>
            </div><div className="lead-form"><label>Nombre<input placeholder="Tu nombre" readOnly /></label><label>Correo<input placeholder="tu@correo.cl" readOnly /></label><button type="button" className="button button-yellow">Enviar solicitud</button></div></div>
          </section>
        </BlockFrame>
      )

    case 'reusableComponent':
      return (
        <BlockFrame block={block} index={index} selected={selected}>
          <section className={`${presentation.className} section`} style={presentation.style as CSSProperties}>
            <div className="shell"><div className="live-component-card"><Layers3 size={22} /><div><span className="eyebrow">COMPONENTE REUTILIZABLE</span><h2>{isDoc(block.component) ? block.component.title || block.component.name : 'Selecciona un componente'}</h2><p>Se renderizará completo al publicar.</p></div></div></div>
          </section>
        </BlockFrame>
      )

    default:
      return (
        <BlockFrame block={block} index={index} selected={selected}>
          <section className={`${presentation.className} section`} style={presentation.style as CSSProperties}>
            <div className="shell"><div className="live-component-card"><Code2 size={22} /><div><span className="eyebrow">BLOQUE</span><h2>{block.blockType}</h2><p>Edita este bloque desde la pestaña Código.</p></div></div></div>
          </section>
        </BlockFrame>
      )
  }
}

export default function VisualEditorPreview() {
  const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || (typeof window === 'undefined' ? '' : window.location.origin)
  const { data } = useLivePreview<EditorPage>({ initialData: fallbackEditorPage, serverURL, depth: 3 })
  const [customPage, setCustomPage] = useState<EditorPage | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  useEffect(() => {
    const onMessage = (event: MessageEvent<EditorMessage>) => {
      if (!event.data || event.data.type !== 'fabrick-editor:update') return
      if (event.data.page) setCustomPage(normalizeEditorPage(event.data.page))
      setSelectedBlockId(event.data.selectedBlockId || null)
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'fabrick-editor:ready' }, '*')
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const page = useMemo(() => normalizeEditorPage(customPage || data), [customPage, data])

  return (
    <main className="visual-editor-page">
      <div className="visual-editor-page__content">
        {page.layout.map((block, index) => (
          <LiveBlock key={block.id || `${block.blockType}-${index}`} block={block} index={index} selected={selectedBlockId === block.id} />
        ))}
      </div>
    </main>
  )
}
