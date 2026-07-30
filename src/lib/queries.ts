import { draftMode } from 'next/headers'
import { getCMS } from './cms'
import { portfolioHomeLayout, portfolioPageAppearance, PORTFOLIO_HOME_TEMPLATE_VERSION } from './home-template'

type Doc = Record<string, any>

const isDoc = (value: unknown): value is Doc => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

// Page appearance is JSON rather than a relationship, so retain only the
// fields the renderer needs. This keeps the saved background editable without
// copying private upload bytes into a Page document.
const compactMedia = (media: unknown) => {
  if (!isDoc(media)) return media
  return {
    id: media.id,
    alt: media.alt,
    filename: media.filename,
    url: media.url,
    externalURL: media.externalURL,
    sizes: media.sizes,
  }
}

const compactBackground = (background: Doc) => ({
  id: background.id,
  name: background.name,
  kind: background.kind,
  externalURL: background.externalURL,
  image: compactMedia(background.image),
  poster: compactMedia(background.poster),
  desktopFrames: Array.isArray(background.desktopFrames) ? background.desktopFrames.map(compactMedia) : [],
  mobileFrames: Array.isArray(background.mobileFrames) ? background.mobileFrames.map(compactMedia) : [],
  playback: isDoc(background.playback)
    ? { trigger: background.playback.trigger, fit: background.playback.fit, overlayOpacity: background.playback.overlayOpacity }
    : undefined,
})

async function applySavedBackgroundToHome(payload: any, page: Doc) {
  const existingAppearance = isDoc(page.pageAppearance) ? page.pageAppearance : {}
  const hasBackground = existingAppearance.backgroundMode === 'image' && isDoc(existingAppearance.savedBackground)
  const layout = Array.isArray(page.layout) ? page.layout : []
  const showcaseIndex = layout.findIndex((block) => isDoc(block) && block.blockType === 'portfolioShowcase')
  const showcase = showcaseIndex >= 0 && isDoc(layout[showcaseIndex]) ? layout[showcaseIndex] : null
  const showcaseAppearance = isDoc(showcase?.appearance) ? showcase.appearance : {}
  const showcaseHasBackground = showcaseAppearance.backgroundMode === 'image' && isDoc(showcaseAppearance.savedBackground)

  // Do not replace an editor's later manual selection.
  if (hasBackground && (showcaseIndex < 0 || showcaseHasBackground)) return page

  let background: Doc | null = null
  try {
    // The saved background the user is editing lives at /backgrounds/1.
    background = await payload.findByID({ collection: 'backgrounds', id: 1, depth: 2, overrideAccess: true })
  } catch {
    try {
      const fallback = await payload.find({
        collection: 'backgrounds',
        depth: 2,
        limit: 1,
        sort: 'id',
        overrideAccess: true,
        where: { status: { equals: 'ready' } },
      })
      background = fallback.docs[0] || null
    } catch {
      return page
    }
  }
  if (!background) return page

  const savedBackground = compactBackground(background)
  const fit = savedBackground.playback?.fit === 'contain' ? 'contain' : 'cover'
  const overlayOpacity = Number(savedBackground.playback?.overlayOpacity ?? 46)
  const nextLayout = showcase
    ? layout.map((block, index) => index === showcaseIndex
      ? {
          ...block,
          appearance: {
            ...showcaseAppearance,
            backgroundMode: 'image',
            savedBackground,
            backgroundFit: fit,
            surfaceColor: '#10110f',
            surfaceOpacity: 100,
            overlayColor: '#10110f',
            overlayOpacity,
          },
        }
      : block)
    : layout

  try {
    return await payload.update({
      collection: 'pages',
      id: page.id,
      draft: false,
      overrideAccess: true,
      data: {
        pageAppearance: {
          ...portfolioPageAppearance,
          ...existingAppearance,
          backgroundMode: 'image',
          savedBackground,
          backgroundFit: fit,
          surfaceColor: '#10110f',
          surfaceOpacity: 100,
          overlayColor: '#10110f',
          overlayOpacity,
        },
        layout: nextLayout,
      } as never,
    })
  } catch {
    return page
  }
}

export async function getPageBySlug(slug: string) {
  try {
    const draft = (await draftMode()).isEnabled
    const payload = await getCMS()
    const result = await payload.find({
      collection: 'pages',
      draft,
      depth: 3,
      limit: 1,
      overrideAccess: draft,
      where: {
        slug: { equals: slug }
      }
    })
    return result.docs[0] || null
  } catch {
    return null
  }
}

/**
 * One-time, explicit migration requested for the existing Home page. The
 * marker prevents any later manual edits from being overwritten.
 */
export async function getPortfolioHomePage() {
  let page = await getPageBySlug('home')
  if (!page) return null

  const payload = await getCMS()
  if ((page as { homeTemplateVersion?: string }).homeTemplateVersion !== PORTFOLIO_HOME_TEMPLATE_VERSION) {
    try {
      page = await payload.update({
        collection: 'pages',
        id: page.id,
        draft: false,
        overrideAccess: true,
        data: {
          layout: portfolioHomeLayout(),
          pageAppearance: portfolioPageAppearance,
          homeTemplateVersion: PORTFOLIO_HOME_TEMPLATE_VERSION,
        } as never,
      })
    } catch {
      return page
    }
  }
  return applySavedBackgroundToHome(payload, page as Doc)
}

export async function getServices(featuredOnly = false, limit = 20) {
  try {
    const payload = await getCMS()
    const result = await payload.find({
      collection: 'services',
      depth: 2,
      limit,
      sort: 'title',
      where: featuredOnly
        ? {
            and: [
              { featured: { equals: true } },
              { _status: { equals: 'published' } }
            ]
          }
        : { _status: { equals: 'published' } }
    })
    return result.docs
  } catch {
    return []
  }
}

export async function getServiceBySlug(slug: string) {
  try {
    const draft = (await draftMode()).isEnabled
    const payload = await getCMS()
    const result = await payload.find({
      collection: 'services',
      draft,
      depth: 3,
      limit: 1,
      overrideAccess: draft,
      where: draft
        ? { slug: { equals: slug } }
        : { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] }
    })
    return result.docs[0] || null
  } catch {
    return null
  }
}

export async function getProjects(featuredOnly = false, limit = 20) {
  try {
    const payload = await getCMS()
    const result = await payload.find({
      collection: 'projects',
      depth: 3,
      limit,
      sort: '-createdAt',
      where: featuredOnly
        ? {
            and: [
              { featured: { equals: true } },
              { _status: { equals: 'published' } }
            ]
          }
        : { _status: { equals: 'published' } }
    })
    return result.docs
  } catch {
    return []
  }
}

export async function getProjectBySlug(slug: string) {
  try {
    const draft = (await draftMode()).isEnabled
    const payload = await getCMS()
    const result = await payload.find({
      collection: 'projects',
      draft,
      depth: 3,
      limit: 1,
      overrideAccess: draft,
      where: draft
        ? { slug: { equals: slug } }
        : { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] }
    })
    return result.docs[0] || null
  } catch {
    return null
  }
}

export async function getTestimonials(limit = 12) {
  try {
    const payload = await getCMS()
    const result = await payload.find({
      collection: 'testimonials',
      depth: 2,
      limit,
      sort: '-createdAt',
      where: { _status: { equals: 'published' } }
    })
    return result.docs
  } catch {
    return []
  }
}

export async function getGlobals() {
  try {
    const payload = await getCMS()
    const [header, footer, settings] = await Promise.all([
      payload.findGlobal({ slug: 'header', depth: 2 }),
      payload.findGlobal({ slug: 'footer', depth: 2 }),
      payload.findGlobal({ slug: 'site-settings', depth: 2 })
    ])
    return { header, footer, settings }
  } catch {
    return { header: null, footer: null, settings: null }
  }
}
