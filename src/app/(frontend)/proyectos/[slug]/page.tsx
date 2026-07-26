import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, MapPin, Ruler, Timer } from 'lucide-react'
import { notFound } from 'next/navigation'
import { RefreshRouteOnSave } from '@/components/RefreshRouteOnSave'
import { RichText } from '@/components/RichText'
import { getMediaAlt, getMediaURL } from '@/lib/media'
import { getProjectBySlug } from '@/lib/queries'

type Args = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const doc = await getProjectBySlug(slug)
  if (!doc) return {}
  const seo = (doc.seo || {}) as { title?: string; description?: string; noIndex?: boolean }
  return {
    title: seo.title || `${doc.title} | FabrickBuild`,
    description: seo.description || doc.summary,
    robots: seo.noIndex ? { index: false, follow: false } : undefined
  }
}

export default async function ProjectPage({ params }: Args) {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) notFound()
  const cover = getMediaURL(project.cover, 'hero')
  const before = getMediaURL(project.beforeAfter?.before, 'hero')
  const after = getMediaURL(project.beforeAfter?.after, 'hero')

  return (
    <>
      <RefreshRouteOnSave />
      <section className="detail-hero project-detail-hero">
        {cover && <Image src={cover} alt={getMediaAlt(project.cover, project.title)} fill priority sizes="100vw" />}
        <div className="detail-overlay" />
        <div className="shell detail-hero-content">
          <Link href="/proyectos" className="back-link"><ArrowLeft size={16} /> Proyectos</Link>
          <span className="eyebrow">Proyecto FabrickBuild</span>
          <h1>{project.title}</h1>
          <p>{project.summary}</p>
          <div className="detail-meta">
            {project.details?.location && <span><MapPin size={16} />{project.details.location}</span>}
            {project.details?.area && <span><Ruler size={16} />{project.details.area} m²</span>}
            {project.details?.duration && <span><Timer size={16} />{project.details.duration}</span>}
          </div>
        </div>
      </section>
      <section className="section shell">
        <div className="project-story">
          <RichText data={project.content} />
        </div>
        {before && after && (
          <div className="before-after project-before-after">
            <figure><Image src={before} alt="Estado anterior" fill sizes="50vw" /><figcaption>Antes</figcaption></figure>
            <figure><Image src={after} alt="Resultado final" fill sizes="50vw" /><figcaption>Después</figcaption></figure>
          </div>
        )}
        {Array.isArray(project.gallery) && project.gallery.length > 0 && (
          <div className="gallery-grid">
            {project.gallery.map((item: any, index: number) => {
              const url = getMediaURL(item.image, 'card')
              if (!url) return null
              return <figure key={item.id || index}><Image src={url} alt={getMediaAlt(item.image, item.caption || project.title)} fill sizes="(max-width: 700px) 100vw, 33vw" />{item.caption && <figcaption>{item.caption}</figcaption>}</figure>
            })}
          </div>
        )}
      </section>
    </>
  )
}
