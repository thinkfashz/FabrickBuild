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
    ? {
        trigger: background.playback.trigger,
        fit: background.playback.fit,
        scrub: background.playback.scrub,
        pin: background.playback.pin,
        scrollLength: background.playback.scrollLength,
        overlayOpacity: background.playback.overlayOpacity,
      }
    : undefined,
})

type NativePool = {
  query: <T = { id: string | number }>(statement: string, values?: unknown[]) => Promise<{ rows: T[] }>
}

const nativePool = (payload: unknown) => (payload as { db?: { pool?: NativePool } })?.db?.pool

/**
 * Last-resort migration for the one Home document created before the
 * Portfolio block existed. It writes the exact native Payload block tables,
 * but deliberately does not touch versions or any other page. Payload's
 * normal update remains the primary path; this only runs when legacy version
 * history blocks that one automatic migration.
 */
async function persistLegacyHomePortfolio(payload: unknown, page: Doc) {
  const pool = nativePool(payload)
  if (!pool || page.id === undefined || page.id === null) throw new Error('No hay conexión nativa para reparar Inicio.')

  const [portfolio] = portfolioHomeLayout() as Doc[]
  const oldPortfolio = await pool.query<{ id: number }>(
    'SELECT "id" FROM "pages_blocks_portfolio_showcase" WHERE "_parent_id" = $1',
    [page.id],
  )
  const oldIDs = oldPortfolio.rows.map((row) => row.id)
  if (oldIDs.length) {
    await pool.query('DELETE FROM "pages_blocks_portfolio_showcase_tech_stack" WHERE "_parent_id" = ANY($1::int[])', [oldIDs])
    await pool.query('DELETE FROM "pages_blocks_portfolio_showcase_projects" WHERE "_parent_id" = ANY($1::int[])', [oldIDs])
  }

  // Home is the requested full portfolio replacement. Removing only its
  // parent rows keeps every other Page and all media records intact.
  for (const table of [
    'pages_blocks_hero', 'pages_blocks_services_grid', 'pages_blocks_projects_grid',
    'pages_blocks_content', 'pages_blocks_stats', 'pages_blocks_testimonials',
    'pages_blocks_before_after', 'pages_blocks_cta', 'pages_blocks_contact_form',
    'pages_blocks_reusable_component', 'pages_blocks_portfolio_showcase',
  ]) {
    await pool.query(`DELETE FROM "${table}" WHERE "_parent_id" = $1`, [page.id])
  }

  const inserted = await pool.query<{ id: number }>(
    `INSERT INTO "pages_blocks_portfolio_showcase"
      ("_order", "_parent_id", "_path", "eyebrow", "heading", "highlight", "description",
       "primary_c_t_a_label", "primary_c_t_a_url", "secondary_c_t_a_label", "secondary_c_t_a_url", "appearance")
     VALUES (1, $1, 'layout', $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     RETURNING "id"`,
    [
      page.id, portfolio.eyebrow, portfolio.heading, portfolio.highlight, portfolio.description,
      portfolio.primaryCTA?.label, portfolio.primaryCTA?.url, portfolio.secondaryCTA?.label,
      portfolio.secondaryCTA?.url, JSON.stringify(portfolio.appearance || {}),
    ],
  )
  const blockID = inserted.rows[0]?.id
  if (!blockID) throw new Error('No se pudo crear el bloque Portfolio de Inicio.')

  for (const [index, item] of (portfolio.techStack || []).entries()) {
    await pool.query(
      'INSERT INTO "pages_blocks_portfolio_showcase_tech_stack" ("_order", "_parent_id", "label") VALUES ($1, $2, $3)',
      [index + 1, blockID, item.label],
    )
  }
  for (const [index, item] of (portfolio.projects || []).entries()) {
    await pool.query(
      `INSERT INTO "pages_blocks_portfolio_showcase_projects"
        ("_order", "_parent_id", "title", "type", "description", "image_u_r_l", "url")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [index + 1, blockID, item.title, item.type, item.description, item.imageURL, item.url],
    )
  }
  await pool.query(
    'UPDATE "pages" SET "page_appearance" = $1::jsonb, "home_template_version" = $2, "updated_at" = NOW() WHERE "id" = $3',
    [JSON.stringify(portfolioPageAppearance), PORTFOLIO_HOME_TEMPLATE_VERSION, page.id],
  )
}

async function persistHomeBackgroundNative(payload: unknown, page: Doc, pageAppearance: Doc, layout: Doc[]) {
  const pool = nativePool(payload)
  if (!pool || page.id === undefined || page.id === null) return false
  const showcase = layout.find((block) => block.blockType === 'portfolioShowcase')
  if (!showcase) return false
  await pool.query('UPDATE "pages" SET "page_appearance" = $1::jsonb, "updated_at" = NOW() WHERE "id" = $2', [JSON.stringify(pageAppearance), page.id])
  await pool.query(
    'UPDATE "pages_blocks_portfolio_showcase" SET "appearance" = $1::jsonb WHERE "_parent_id" = $2',
    [JSON.stringify(showcase.appearance || {}), page.id],
  )
  return true
}

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
  const nextPageAppearance = {
    ...portfolioPageAppearance,
    ...existingAppearance,
    backgroundMode: 'image',
    savedBackground,
    backgroundFit: fit,
    surfaceColor: '#10110f',
    surfaceOpacity: 100,
    overlayColor: '#10110f',
    overlayOpacity,
  }
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
        pageAppearance: nextPageAppearance,
        layout: nextLayout,
      } as never,
    })
  } catch (error) {
    // Rendering must not go blank just because a legacy version row rejects
    // the first persistence attempt. Keep the resolved background visible;
    // the next successful native Payload save persists the same data.
    console.error('[home-background] Could not persist saved background', error)
    await persistHomeBackgroundNative(payload, page, nextPageAppearance, nextLayout).catch((nativeError) => {
      console.error('[home-background] Native persistence also failed', nativeError)
    })
    return {
      ...page,
      pageAppearance: nextPageAppearance,
      layout: nextLayout,
    }
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
  const hasPortfolioShowcase = Array.isArray((page as Doc).layout)
    && (page as Doc).layout.some((block: unknown) => isDoc(block) && block.blockType === 'portfolioShowcase')
  // Some existing installs already have the marker from a partial deployment
  // but retain the former plain Hero. Treat the real block as the source of
  // truth so Home becomes the requested portfolio exactly once.
  if ((page as { homeTemplateVersion?: string }).homeTemplateVersion !== PORTFOLIO_HOME_TEMPLATE_VERSION || !hasPortfolioShowcase) {
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
    } catch (error) {
      // A legacy row can have an incomplete version relation. The public page
      // remains a real portfolio immediately, while the exact server error is
      // retained in Vercel logs for the schema doctor.
      console.error('[home-template] Could not persist portfolio template', error)
      await persistLegacyHomePortfolio(payload, page as Doc).catch((nativeError) => {
        console.error('[home-template] Native migration also failed', nativeError)
      })
      page = {
        ...page,
        layout: portfolioHomeLayout(),
        pageAppearance: portfolioPageAppearance,
        homeTemplateVersion: PORTFOLIO_HOME_TEMPLATE_VERSION,
      }
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
