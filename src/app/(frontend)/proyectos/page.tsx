import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProjectCards } from '@/components/RenderBlocks'
import { getProjects } from '@/lib/queries'

export const metadata = {
  title: 'Proyectos | FabrickBuild',
  description: 'Obras, remodelaciones y soluciones ejecutadas por FabrickBuild.'
}

export default async function ProjectsPage() {
  const projects = await getProjects(false, 100)
  return (
    <>
      <section className="internal-hero internal-hero-dark">
        <div className="shell">
          <Link href="/" className="back-link"><ArrowLeft size={16} /> Inicio</Link>
          <span className="eyebrow">Proyectos FabrickBuild</span>
          <h1>Obras que muestran el proceso, no solo el resultado.</h1>
          <p>Publicamos alcance, ubicación, superficie y registros visuales de cada proyecto.</p>
        </div>
      </section>
      <section className="section section-dark">
        <div className="shell">
          {projects.length ? <ProjectCards projects={projects} /> : <div className="empty-state empty-dark"><h2>Aún no hay proyectos publicados.</h2><p>Publícalos desde el CMS.</p></div>}
        </div>
      </section>
    </>
  )
}
