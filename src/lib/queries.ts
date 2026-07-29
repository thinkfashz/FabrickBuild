import { draftMode } from 'next/headers'
import { getCMS } from './cms'
import { portfolioHomeLayout, portfolioPageAppearance, PORTFOLIO_HOME_TEMPLATE_VERSION } from './home-template'

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
  const page = await getPageBySlug('home')
  if (!page || (page as { homeTemplateVersion?: string }).homeTemplateVersion === PORTFOLIO_HOME_TEMPLATE_VERSION) return page

  try {
    const payload = await getCMS()
    return await payload.update({
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
