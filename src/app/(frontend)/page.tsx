import { AIPageStyle } from '@/components/AIPageStyle'
import { PageSurface } from '@/components/PageSurface'
import { RenderBlocks } from '@/components/RenderBlocks'
import { portfolioLayoutFromPage } from '@/lib/home-template'
import { getGlobals, getHeroBackground, getPageBySlug } from '@/lib/queries'

const fallback = [
  {
    blockType: 'hero',
    theme: 'dark',
    eyebrow: 'Construcción inteligente en Chile',
    heading: 'Construimos casas.',
    highlight: 'Dios construye hogares.',
    description:
      'Planificamos, construimos y remodelamos con información clara, seguimiento real y terminaciones responsables.',
    primaryCTA: { label: 'Solicitar cotización', url: '#contacto' },
    secondaryCTA: { label: 'Ver proyectos', url: '/proyectos' },
    stats: [
      { value: '8+', label: 'años de experiencia' },
      { value: '360°', label: 'servicio integral' },
      { value: '100%', label: 'trazabilidad' },
    ],
  },
  {
    blockType: 'servicesGrid',
    eyebrow: 'Servicios',
    heading: 'Una solución para cada etapa de tu obra.',
    intro: 'Desde una reparación puntual hasta una casa completamente nueva.',
    limit: 6,
  },
  {
    blockType: 'stats',
    heading: 'Más claridad antes, durante y después de construir.',
    items: [
      { value: '01', label: 'Diagnóstico', description: 'Revisamos el problema y el alcance real.' },
      { value: '02', label: 'Presupuesto', description: 'Detallamos etapas, materiales y condiciones.' },
      { value: '03', label: 'Ejecución', description: 'Registramos avances y decisiones importantes.' },
      { value: '04', label: 'Entrega', description: 'Validamos terminaciones y pendientes.' },
    ],
  },
  {
    blockType: 'contactForm',
    eyebrow: 'Cotización',
    heading: 'Describe tu proyecto.',
    description: 'Completa los datos principales y te contactaremos para revisar el alcance.',
  },
]

export const revalidate = 300

export default async function HomePage() {
  const [page, globals, defaultBackground] = await Promise.all([
    getPageBySlug('home'),
    getGlobals(),
    getHeroBackground(),
  ])
  const settings = globals.settings as Record<string, any> | null
  const experience = String(settings?.homepageExperience || 'luxury')
  const usePortfolioFactory = experience === 'luxury' || experience === 'portfolio'
  const selectedBackground =
    page?.backgroundSource === 'saved' && page.savedBackground && typeof page.savedBackground === 'object'
      ? page.savedBackground
      : defaultBackground

  if (usePortfolioFactory) {
    const portfolioBlocks = portfolioLayoutFromPage(
      (page?.layout as Record<string, any>[] | null | undefined),
      selectedBackground as Record<string, any> | null,
    )
    return (
      <>
        <AIPageStyle css={page?.aiStyle as string | undefined} />
        <main className="ai-page portfolio-factory-page">
          <RenderBlocks blocks={portfolioBlocks} />
        </main>
      </>
    )
  }

  const blocks = ((page?.layout as Record<string, unknown>[]) || fallback)
  return (
    <PageSurface page={page as Record<string, unknown> | null}>
      <AIPageStyle css={page?.aiStyle as string | undefined} />
      <div className="ai-page">
        <RenderBlocks blocks={blocks} />
      </div>
    </PageSurface>
  )
}
