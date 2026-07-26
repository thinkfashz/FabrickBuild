import { RefreshRouteOnSave } from '@/components/RefreshRouteOnSave'
import { RenderBlocks } from '@/components/RenderBlocks'
import { getPageBySlug } from '@/lib/queries'

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
      { value: '100%', label: 'trazabilidad' }
    ]
  },
  {
    blockType: 'servicesGrid',
    eyebrow: 'Servicios',
    heading: 'Una solución para cada etapa de tu obra.',
    intro: 'Conecta la base de datos y ejecuta el seed para administrar esta sección.',
    limit: 6
  },
  {
    blockType: 'stats',
    heading: 'Más claridad antes, durante y después de construir.',
    items: [
      { value: '01', label: 'Diagnóstico', description: 'Revisamos el problema y el alcance real.' },
      { value: '02', label: 'Presupuesto', description: 'Detallamos etapas, materiales y condiciones.' },
      { value: '03', label: 'Ejecución', description: 'Registramos avances y decisiones importantes.' },
      { value: '04', label: 'Entrega', description: 'Validamos terminaciones y pendientes.' }
    ]
  },
  {
    blockType: 'contactForm',
    eyebrow: 'Cotización',
    heading: 'Describe tu proyecto.',
    description: 'Completa los datos principales y te contactaremos para revisar el alcance.'
  }
]

export default async function HomePage() {
  const page = await getPageBySlug('home')
  return (
    <>
      <RefreshRouteOnSave />
      <RenderBlocks blocks={(page?.layout as Record<string, unknown>[]) || fallback} />
    </>
  )
}
