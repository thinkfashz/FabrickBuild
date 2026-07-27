import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Check, Clock3 } from 'lucide-react'
import { notFound } from 'next/navigation'
import { LeadForm } from '@/components/LeadForm'
import { RefreshRouteOnSave } from '@/components/RefreshRouteOnSave'
import { RichText } from '@/components/RichText'
import { getMediaAlt, getMediaURL } from '@/lib/media'
import { getServiceBySlug } from '@/lib/queries'

type Args = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const doc = await getServiceBySlug(slug)
  if (!doc) return {}
  const seo = (doc.seo || {}) as { title?: string; description?: string; noIndex?: boolean }
  return {
    title: seo.title || `${doc.title} | FabrickBuild`,
    description: seo.description || doc.summary,
    robots: seo.noIndex ? { index: false, follow: false } : undefined
  }
}

export default async function ServicePage({ params }: Args) {
  const { slug } = await params
  const service = await getServiceBySlug(slug)
  if (!service) notFound()
  const cover = getMediaURL(service.cover, 'hero')

  return (
    <>
      <RefreshRouteOnSave />
      <section className="detail-hero">
        {cover && <Image src={cover} alt={getMediaAlt(service.cover, service.title)} fill priority sizes="100vw" />}
        <div className="detail-overlay" />
        <div className="shell detail-hero-content">
          <Link href="/servicios" className="back-link"><ArrowLeft size={16} /> Servicios</Link>
          <span className="eyebrow">Servicio FabrickBuild</span>
          <h1>{service.title}</h1>
          <p>{service.summary}</p>
          {service.duration && <span className="detail-pill"><Clock3 size={16} /> {service.duration}</span>}
        </div>
      </section>
      <section className="section shell">
        <div className="detail-grid">
          <article>
            <RichText data={service.description} />
            {Array.isArray(service.benefits) && service.benefits.length > 0 && (
              <div className="benefit-list">
                {service.benefits.map((item: any) => (
                  <div key={item.id || item.title}><Check size={20} /><div><h3>{item.title}</h3><p>{item.description}</p></div></div>
                ))}
              </div>
            )}
            {Array.isArray(service.process) && service.process.length > 0 && (
              <div className="process-list">
                <h2>Cómo trabajamos</h2>
                {service.process.map((item: any, index: number) => (
                  <div key={item.id || item.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{item.title}</h3><p>{item.description}</p></div></div>
                ))}
              </div>
            )}
          </article>
          <aside className="sticky-card">
            <span className="eyebrow">Cotización</span>
            <h2>Conversemos sobre este servicio.</h2>
            {service.priceFrom && <p className="price-from">Desde <strong>${Number(service.priceFrom).toLocaleString('es-CL')}</strong> CLP</p>}
            <LeadForm services={[{ id: service.id, title: service.title }]} />
          </aside>
        </div>
      </section>
    </>
  )
}
