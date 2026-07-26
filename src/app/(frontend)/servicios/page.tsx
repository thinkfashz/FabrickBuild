import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ServiceCards } from '@/components/RenderBlocks'
import { getServices } from '@/lib/queries'

export const metadata = {
  title: 'Servicios | FabrickBuild',
  description: 'Construcción, remodelación, reparación y soluciones técnicas.'
}

export default async function ServicesPage() {
  const services = await getServices(false, 100)
  return (
    <>
      <section className="internal-hero">
        <div className="shell">
          <Link href="/" className="back-link"><ArrowLeft size={16} /> Inicio</Link>
          <span className="eyebrow">Servicios FabrickBuild</span>
          <h1>Soluciones claras para construir, reparar y transformar.</h1>
          <p>Explora cada especialidad y solicita una evaluación según tu proyecto.</p>
        </div>
      </section>
      <section className="section shell">
        {services.length ? <ServiceCards services={services} /> : <div className="empty-state"><h2>Aún no hay servicios publicados.</h2><p>Créelos desde el panel de administración.</p></div>}
      </section>
    </>
  )
}
