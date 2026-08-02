import type { Payload } from 'payload'

const serviceSeed = [
  {
    title: 'Diseño y desarrollo web',
    slug: 'diseno-y-desarrollo-web',
    summary: 'Sitios rápidos, responsivos y administrables, creados alrededor de tus objetivos comerciales.',
    duration: '2 a 8 semanas',
    featured: true,
  },
  {
    title: 'E-commerce y conversión',
    slug: 'ecommerce-y-conversion',
    summary: 'Tiendas digitales, catálogos, checkout e integraciones preparadas para vender y crecer.',
    duration: '3 a 10 semanas',
    featured: true,
  },
  {
    title: 'Automatización e integraciones',
    slug: 'automatizacion-e-integraciones',
    summary: 'Conectamos formularios, CRM, pagos, mensajería, datos y operaciones repetitivas.',
    duration: '1 a 6 semanas',
    featured: true,
  },
  {
    title: 'Experiencias 3D y motion',
    slug: 'experiencias-3d-y-motion',
    summary: 'Scroll cinematográfico, secuencias de frames, animación y visualización interactiva.',
    duration: '2 a 8 semanas',
    featured: true,
  },
  {
    title: 'Inteligencia artificial y RAG',
    slug: 'inteligencia-artificial-y-rag',
    summary: 'Asistentes, búsqueda semántica y flujos de IA conectados a información real de tu negocio.',
    duration: '2 a 10 semanas',
    featured: true,
  },
  {
    title: 'Optimización y mantenimiento',
    slug: 'optimizacion-y-mantenimiento',
    summary: 'Rendimiento, accesibilidad, SEO técnico, monitoreo y evolución continua del producto.',
    duration: 'Continuo',
    featured: true,
  },
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
        role: 'admin',
      },
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
          _status: 'published',
        },
      })
      serviceDocs.push(doc)
    }
    created.services = serviceDocs.length
  } else {
    const existing = await payload.find({
      collection: 'services',
      limit: 12,
      where: { _status: { equals: 'published' } },
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
            eyebrow: 'ESTUDIO DIGITAL INDEPENDIENTE',
            heading: 'Diseñamos experiencias que se sienten vivas.',
            highlight: 'Diseño · código · movimiento',
            description:
              'Creamos páginas web, e-commerce y sistemas digitales que combinan claridad, velocidad, automatización e inteligencia artificial.',
            primaryCTA: { label: 'Ver proyectos', url: '#proyectos' },
            secondaryCTA: { label: 'Iniciar proyecto', url: '#contacto' },
            stats: [
              { value: '360°', label: 'experiencia digital' },
              { value: 'Mobile', label: 'diseño primero' },
              { value: 'CMS', label: 'control administrable' },
            ],
          },
          {
            blockType: 'servicesGrid',
            eyebrow: 'Servicios digitales',
            heading: 'Una solución conectada para cada etapa de tu producto.',
            intro:
              'Desde una landing rápida hasta un e-commerce, una automatización o una experiencia inmersiva completa.',
            services: serviceDocs.map((item) => item.id),
            limit: 6,
          },
          {
            blockType: 'stats',
            heading: 'Estrategia, diseño y tecnología trabajando como un solo sistema.',
            items: [
              {
                value: '01',
                label: 'Descubrimiento',
                description: 'Entendemos el negocio, el público y la acción que debe provocar la experiencia.',
              },
              {
                value: '02',
                label: 'Diseño',
                description: 'Ordenamos contenido, identidad, interacción y recorrido antes de desarrollar.',
              },
              {
                value: '03',
                label: 'Desarrollo',
                description: 'Creamos una solución rápida, accesible, administrable y preparada para crecer.',
              },
              {
                value: '04',
                label: 'Evolución',
                description: 'Medimos, optimizamos y conectamos nuevas capacidades cuando el proyecto lo necesita.',
              },
            ],
          },
          {
            blockType: 'cta',
            eyebrow: 'Tu próximo producto digital',
            heading: 'Convierte una buena idea en una experiencia clara, rápida y memorable.',
            description: 'Cuéntanos qué necesitas y organizaremos el siguiente paso.',
            button: { label: 'Iniciar conversación', url: '#contacto' },
          },
          {
            blockType: 'contactForm',
            eyebrow: 'Nuevo proyecto',
            heading: 'Cuéntanos qué quieres crear.',
            description:
              'Comparte el objetivo, el estado actual y las funciones principales. Te responderemos con una ruta clara.',
            services: serviceDocs.map((item) => item.id),
            successMessage: 'Recibimos tu mensaje. Te contactaremos pronto.',
          },
        ],
        seo: {
          title: 'FabrickBuild | Diseño web, e-commerce, automatización e IA',
          description:
            'Páginas web rápidas, e-commerce, automatizaciones, experiencias inmersivas e integraciones con inteligencia artificial.',
        },
      },
    })
    created.pages = 1
  }

  return { ok: true, created }
}
