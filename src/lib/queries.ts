import { unstable_cache } from 'next/cache'

import { getCMS } from './cms'

const publicPageBySlug = unstable_cache(
  async (slug: string) => {
    const payload = await getCMS()
    const result = await payload.find({
      collection: 'pages',
      draft: false,
      depth: 3,
      limit: 1,
      overrideAccess: false,
      where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
    })
    return result.docs[0] || null
  },
  ['fabrick-page-by-slug'],
  { revalidate: 300, tags: ['fabrick-pages'] },
)

export async function getPageBySlug(slug: string) {
  try {
    return await publicPageBySlug(slug)
  } catch (error) {
    console.error(`[queries] No fue posible cargar la página pública ${slug}.`, error)
    return null
  }
}

export async function getDraftPageBySlug(slug: string) {
  try {
    const payload = await getCMS()
    const result = await payload.find({
      collection: 'pages',
      draft: true,
      depth: 3,
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: slug } },
    })
    return result.docs[0] || null
  } catch (error) {
    console.error(`[queries] No fue posible cargar el borrador ${slug}.`, error)
    return null
  }
}

const publicHeroBackground = unstable_cache(
  async () => {
    const payload = await getCMS()
    const result = await payload.find({
      collection: 'backgrounds',
      depth: 2,
      limit: 1,
      sort: '-updatedAt',
      overrideAccess: false,
      where: {
        and: [
          { status: { equals: 'ready' } },
          { kind: { equals: 'frames' } },
          { category: { equals: 'hero' } },
        ],
      },
    })
    return result.docs[0] || null
  },
  ['fabrick-hero-background'],
  { revalidate: 300, tags: ['fabrick-backgrounds'] },
)

export async function getHeroBackground() {
  try {
    return await publicHeroBackground()
  } catch (error) {
    console.error('[queries] No fue posible cargar el background cinematográfico.', error)
    return null
  }
}

const publicServices = unstable_cache(
  async (featuredOnly: boolean, limit: number) => {
    const payload = await getCMS()
    const result = await payload.find({
      collection: 'services',
      depth: 2,
      limit,
      sort: 'title',
      where: featuredOnly
        ? { and: [{ featured: { equals: true } }, { _status: { equals: 'published' } }] }
        : { _status: { equals: 'published' } },
    })
    return result.docs
  },
  ['fabrick-services'],
  { revalidate: 300, tags: ['fabrick-services'] },
)

export async function getServices(featuredOnly = false, limit = 20) {
  try {
    return await publicServices(featuredOnly, Math.min(50, Math.max(1, limit)))
  } catch (error) {
    console.error('[queries] No fue posible cargar servicios.', error)
    return []
  }
}

export async function getServiceBySlug(slug: string) {
  try {
    return await unstable_cache(
      async () => {
        const payload = await getCMS()
        const result = await payload.find({
          collection: 'services',
          draft: false,
          depth: 3,
          limit: 1,
          where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
        })
        return result.docs[0] || null
      },
      ['fabrick-service', slug],
      { revalidate: 300, tags: ['fabrick-services', `fabrick-service-${slug}`] },
    )()
  } catch (error) {
    console.error(`[queries] No fue posible cargar el servicio ${slug}.`, error)
    return null
  }
}

const publicProjects = unstable_cache(
  async (featuredOnly: boolean, limit: number) => {
    const payload = await getCMS()
    const result = await payload.find({
      collection: 'projects',
      depth: 3,
      limit,
      sort: '-createdAt',
      where: featuredOnly
        ? { and: [{ featured: { equals: true } }, { _status: { equals: 'published' } }] }
        : { _status: { equals: 'published' } },
    })
    return result.docs
  },
  ['fabrick-projects'],
  { revalidate: 300, tags: ['fabrick-projects'] },
)

export async function getProjects(featuredOnly = false, limit = 20) {
  try {
    return await publicProjects(featuredOnly, Math.min(50, Math.max(1, limit)))
  } catch (error) {
    console.error('[queries] No fue posible cargar proyectos.', error)
    return []
  }
}

export async function getProjectBySlug(slug: string) {
  try {
    return await unstable_cache(
      async () => {
        const payload = await getCMS()
        const result = await payload.find({
          collection: 'projects',
          draft: false,
          depth: 3,
          limit: 1,
          where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
        })
        return result.docs[0] || null
      },
      ['fabrick-project', slug],
      { revalidate: 300, tags: ['fabrick-projects', `fabrick-project-${slug}`] },
    )()
  } catch (error) {
    console.error(`[queries] No fue posible cargar el proyecto ${slug}.`, error)
    return null
  }
}

const publicTestimonials = unstable_cache(
  async (limit: number) => {
    const payload = await getCMS()
    const result = await payload.find({
      collection: 'testimonials',
      depth: 2,
      limit,
      sort: '-createdAt',
      where: { _status: { equals: 'published' } },
    })
    return result.docs
  },
  ['fabrick-testimonials'],
  { revalidate: 600, tags: ['fabrick-testimonials'] },
)

export async function getTestimonials(limit = 12) {
  try {
    return await publicTestimonials(Math.min(30, Math.max(1, limit)))
  } catch (error) {
    console.error('[queries] No fue posible cargar testimonios.', error)
    return []
  }
}

const publicGlobals = unstable_cache(
  async () => {
    const payload = await getCMS()
    const [header, footer, settings] = await Promise.all([
      payload.findGlobal({ slug: 'header', depth: 2 }),
      payload.findGlobal({ slug: 'footer', depth: 2 }),
      payload.findGlobal({ slug: 'site-settings', depth: 2 }),
    ])
    return { header, footer, settings }
  },
  ['fabrick-globals'],
  { revalidate: 300, tags: ['fabrick-globals'] },
)

export async function getGlobals() {
  try {
    return await publicGlobals()
  } catch (error) {
    console.error('[queries] No fue posible cargar la configuración global.', error)
    return { header: null, footer: null, settings: null }
  }
}

export async function getDraftGlobals() {
  try {
    const payload = await getCMS()
    const [header, footer, settings] = await Promise.all([
      payload.findGlobal({ slug: 'header', depth: 2 }),
      payload.findGlobal({ slug: 'footer', depth: 2 }),
      payload.findGlobal({ slug: 'site-settings', depth: 2 }),
    ])
    return { header, footer, settings }
  } catch (error) {
    console.error('[queries] No fue posible cargar la configuración para preview.', error)
    return { header: null, footer: null, settings: null }
  }
}
