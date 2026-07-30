import config from '@payload-config'
import { getPayload } from 'payload'

const components = [
  {
    name: 'Botón glass con brillo',
    slug: 'anime-button-glass',
    kind: 'animatedButton',
    category: 'action',
    description: 'Botón translúcido reutilizable con entrada Anime.js y brillo al pasar el cursor.',
    animatedContent: {
      buttonLabel: 'Solicitar cotización',
      buttonURL: '#contacto',
      surface: 'glass',
      animationPreset: 'fade-up',
      animationDuration: 650,
    },
    tags: [{ value: 'animejs' }, { value: 'boton' }, { value: 'glass' }],
  },
  {
    name: 'Card comercial translúcida',
    slug: 'anime-card-commercial-glass',
    kind: 'animatedCard',
    category: 'section',
    description: 'Card para presentar un servicio, beneficio o promoción sin competir con el fondo.',
    animatedContent: {
      eyebrow: 'SOLUCIÓN DESTACADA',
      heading: 'Una propuesta clara, visual y accionable.',
      body: 'Usa esta card para resumir un servicio con una sola promesa comercial y un acceso directo a la conversión.',
      buttonLabel: 'Conocer el servicio',
      buttonURL: '/servicios',
      surface: 'glass',
      animationPreset: 'scale',
      animationDuration: 760,
    },
    tags: [{ value: 'animejs' }, { value: 'card' }, { value: 'servicio' }],
  },
  {
    name: 'Bloque de texto editorial',
    slug: 'anime-text-editorial',
    kind: 'animatedText',
    category: 'section',
    description: 'Bloque editorial sólido para separar escenas con un mensaje comercial protagonista.',
    animatedContent: {
      eyebrow: 'FABRICKBUILD',
      heading: 'El fondo acompaña. El mensaje vende.',
      body: 'Alterna escenas visuales con superficies limpias para mejorar lectura, jerarquía y recordación de marca.',
      buttonLabel: 'Ver proyectos',
      buttonURL: '/proyectos',
      surface: 'solid',
      animationPreset: 'slide-left',
      animationDuration: 800,
    },
    tags: [{ value: 'animejs' }, { value: 'texto' }, { value: 'editorial' }],
  },
]

async function run() {
  const payload = await getPayload({ config })

  for (const component of components) {
    const existing = await payload.find({
      collection: 'reusable-components',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: component.slug } },
    })

    if (!existing.docs.length) {
      await payload.create({
        collection: 'reusable-components',
        overrideAccess: true,
        data: {
          ...component,
          status: 'active',
          source: 'library',
          version: 1,
        } as any,
      })
      payload.logger.info(`Componente reutilizable creado: ${component.name}`)
    }
  }

  if (typeof payload.db.destroy === 'function') await payload.db.destroy()
  process.exit(0)
}

run().catch((error) => {
  console.error('No fue posible crear la biblioteca de componentes animados.', error)
  process.exit(1)
})
