import type { Payload } from 'payload'

const serviceSeed = [
  {
    title: 'Construcción de casas',
    slug: 'construccion-de-casas',
    summary: 'Diseño y construcción llave en mano, desde el plano hasta la entrega.',
    duration: '90 a 180 días',
    featured: true
  },
  {
    title: 'Remodelaciones',
    slug: 'remodelaciones',
    summary: 'Renovamos cocinas, baños, ampliaciones y espacios completos.',
    duration: 'Según alcance',
    featured: true
  },
  {
    title: 'Techumbres y filtraciones',
    slug: 'techumbres-y-filtraciones',
    summary: 'Reparación de goteras, cubiertas, aislación y evacuación de aguas.',
    duration: '1 a 10 días',
    featured: true
  },
  {
    title: 'Radieres y hormigón',
    slug: 'radieres-y-hormigon',
    summary: 'Preparación, estabilizado, moldaje, malla y terminación de radieres.',
    duration: '2 a 7 días',
    featured: true
  },
  {
    title: 'Electricidad y gasfitería',
    slug: 'electricidad-y-gasfiteria',
    summary: 'Instalaciones, reparaciones y normalización para viviendas y comercios.',
    duration: '1 a 15 días',
    featured: true
  },
  {
    title: 'Quinchos y mueblería',
    slug: 'quinchos-y-muebleria',
    summary: 'Diseño y fabricación de espacios exteriores y mobiliario a medida.',
    duration: '15 a 45 días',
    featured: true
  }
]

export async function seedDatabase(payload: Payload) {
  const created: Record<string, number> = {}

  const users = await payload.count({ collection: 'users' })
  if (users.totalDocs === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    await payload.create({
      collection: 'users',
      data: {
        name: 'Administrador FabrickBuild',
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        role: 'admin'
      }
    })
    created.users = 1
  }

  const services = await payload.count({ collection: 'services' })
  const serviceDocs: Array<{ id: string | number }> = []
  if (services.totalDocs === 0) {
    for (const item of serviceSeed) {
      const doc = await payload.create({
        collection: 'services',
        draft: false,
        data: {
          ...item,
          _status: 'published'
        }
      })
      serviceDocs.push(doc)
    }
    created.services = serviceDocs.length
  } else {
    const existing = await payload.find({
      collection: 'services',
      limit: 12,
      where: { _status: { equals: 'published' } }
    })
    serviceDocs.push(...existing.docs)
  }

  const pages = await payload.count({ collection: 'pages' })
  if (pages.totalDocs === 0) {
    await payload.create({
      collection: 'pages',
      draft: false,
      data: {
        title: 'Inicio',
        slug: 'home',
        _status: 'published',
        layout: [
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
              { value: '100%', label: 'trazabilidad del proyecto' }
            ]
          },
          {
            blockType: 'servicesGrid',
            eyebrow: 'Servicios',
            heading: 'Una solución para cada etapa de tu obra.',
            intro: 'Desde una reparación puntual hasta una casa completamente nueva.',
            services: serviceDocs.map((item) => item.id),
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
            blockType: 'cta',
            eyebrow: 'Tu próximo proyecto',
            heading: 'Conversemos antes de que una mala decisión se vuelva más costosa.',
            description: 'Cuéntanos qué necesitas y organizaremos el siguiente paso.',
            button: { label: 'Cotizar ahora', url: '#contacto' }
          },
          {
            blockType: 'contactForm',
            eyebrow: 'Cotización',
            heading: 'Describe tu proyecto.',
            description: 'Completa los datos principales y te contactaremos para revisar el alcance.',
            services: serviceDocs.map((item) => item.id),
            successMessage: 'Recibimos tu solicitud. Te contactaremos pronto.'
          }
        ],
        seo: {
          title: 'FabrickBuild | Construcción, remodelación y reparación',
          description:
            'Construcción de casas, remodelaciones, radieres, techumbres, electricidad, gasfitería y soluciones integrales.'
        }
      }
    })
    created.pages = 1
  }

  return { ok: true, created }
}
