import { unstable_cache } from 'next/cache'

import { getCMS } from './cms'

type FrameMedia = {
  id?: string | number
  url?: string | null
  filename?: string | null
  category?: string | null
  device?: string | null
  frameOrder?: number | null
  collectionKey?: string | null
}

type BackgroundDoc = Record<string, any> & {
  name?: string | null
  slug?: string | null
  desktopFrames?: unknown[] | null
  mobileFrames?: unknown[] | null
}

const frameNumber = (filename?: string | null) => {
  const values = filename?.match(/\d+/g)
  const number = values?.length ? Number(values[values.length - 1]) : Number.MAX_SAFE_INTEGER
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER
}

const normalizedKey = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

async function findEveryFrame(payload: Awaited<ReturnType<typeof getCMS>>) {
  const docs: FrameMedia[] = []
  let page = 1

  while (page <= 100) {
    const result = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 100,
      page,
      sort: 'frameOrder',
      overrideAccess: false,
      where: {
        or: [
          { category: { equals: 'frame' } },
          { filename: { contains: 'frame_' } },
          { filename: { contains: 'frame-' } },
        ],
      } as any,
    })
    docs.push(...((result.docs || []) as FrameMedia[]))
    if (!result.hasNextPage || !result.nextPage) break
    page = Number(result.nextPage)
  }

  return docs
}

async function recoverCinematicFrames(payload: Awaited<ReturnType<typeof getCMS>>, background: BackgroundDoc | null) {
  if (!background) return null
  const currentDesktop = Array.isArray(background.desktopFrames) ? background.desktopFrames : []
  const currentMobile = Array.isArray(background.mobileFrames) ? background.mobileFrames : []
  if (currentDesktop.length >= 2 || currentMobile.length >= 2) {
    console.info('[cinematic-background] Relaciones existentes.', {
      background: background.slug || background.name,
      desktop: currentDesktop.length,
      mobile: currentMobile.length,
    })
    return background
  }

  const docs = await findEveryFrame(payload)
  if (!docs.length) {
    console.warn('[cinematic-background] No existen archivos de frame en la biblioteca multimedia.', {
      background: background.slug || background.name,
    })
    return background
  }

  const groups = new Map<string, FrameMedia[]>()
  for (const doc of docs) {
    const key = normalizedKey(doc.collectionKey) || 'sin-grupo'
    const group = groups.get(key) || []
    group.push(doc)
    groups.set(key, group)
  }

  const preferredKeys = [normalizedKey(background.slug), normalizedKey(background.name)].filter(Boolean)
  let selected: FrameMedia[] | undefined
  for (const key of preferredKeys) {
    const exact = groups.get(key)
    if (exact?.length) {
      selected = exact
      break
    }
    const partial = Array.from(groups.entries()).find(([groupKey]) => groupKey.includes(key) || key.includes(groupKey))
    if (partial?.[1]?.length) {
      selected = partial[1]
      break
    }
  }
  if (!selected) selected = Array.from(groups.values()).sort((a, b) => b.length - a.length)[0] || docs

  const ordered = [...selected].sort((a, b) => {
    const orderA = typeof a.frameOrder === 'number' ? a.frameOrder : Number.MAX_SAFE_INTEGER
    const orderB = typeof b.frameOrder === 'number' ? b.frameOrder : Number.MAX_SAFE_INTEGER
    if (orderA !== orderB) return orderA - orderB
    const fileA = frameNumber(a.filename)
    const fileB = frameNumber(b.filename)
    if (fileA !== fileB) return fileA - fileB
    return String(a.filename || '').localeCompare(String(b.filename || ''), 'es', { numeric: true })
  })

  const desktopFrames = ordered.filter((doc) => doc.device !== 'mobile')
  const mobileFrames = ordered.filter((doc) => doc.device === 'mobile')
  const recovered = {
    ...background,
    desktopFrames: desktopFrames.length ? desktopFrames : currentDesktop,
    mobileFrames: mobileFrames.length ? mobileFrames : currentMobile,
    frameCountDesktop: desktopFrames.length || currentDesktop.length,
    frameCountMobile: mobileFrames.length || currentMobile.length,
  }

  console.info('[cinematic-background] Secuencia completa recuperada desde Multimedia.', {
    background: background.slug || background.name,
    candidates: docs.length,
    selected: ordered.length,
    desktop: recovered.desktopFrames.length,
    mobile: recovered.mobileFrames.length,
  })
  return recovered
}

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
    return recoverCinematicFrames(payload, (result.docs[0] || null) as BackgroundDoc | null)
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
