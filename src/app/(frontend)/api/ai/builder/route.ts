import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'

import {
  sanitizeBuilderLayout,
  sanitizePageStyles,
} from '@/lib/ai/builder'
import { requireAdmin } from '@/lib/integrations/service'
import { ensureRuntimeSchema } from '@/system/runtimeSchema'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BODY_BYTES = 1_500_000

const CORE_COMPONENTS = [
  ['core-hero', 'Portada principal', 'hero'],
  ['core-services', 'Grilla de servicios', 'servicesGrid'],
  ['core-projects', 'Grilla de proyectos', 'projectsGrid'],
  ['core-content', 'Bloque de contenido', 'content'],
  ['core-stats', 'Indicadores', 'stats'],
  ['core-testimonials', 'Testimonios', 'testimonials'],
  ['core-before-after', 'Antes y después', 'beforeAfter'],
  ['core-cta', 'Llamado a la acción', 'cta'],
  ['core-contact', 'Formulario de cotización', 'contactForm'],
  ['core-signature-experience', 'Recorrido Signature Home', 'signatureExperience'],
] as const

function coreLayout(type: (typeof CORE_COMPONENTS)[number][2]) {
  const common = { id: `core-${type}`, blockType: type }
  if (type === 'hero') return [{ ...common, heading: 'Título principal', description: 'Descripción de la portada.', primaryCTA: { label: 'Cotizar', url: '#contacto' }, secondaryCTA: { label: 'Ver proyectos', url: '/proyectos' } }]
  if (type === 'servicesGrid' || type === 'projectsGrid') return [{ ...common, heading: type === 'servicesGrid' ? 'Nuestros servicios' : 'Proyectos', limit: 6 }]
  if (type === 'content') return [{ ...common, heading: 'Contenido', content: { root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 } } }]
  if (type === 'stats') return [{ ...common, heading: 'Indicadores', items: [{ value: '01', label: 'Indicador' }, { value: '02', label: 'Indicador' }] }]
  if (type === 'beforeAfter') return [{ ...common, heading: 'Antes y después' }]
  if (type === 'cta') return [{ ...common, heading: 'Hablemos de tu proyecto', button: { label: 'Cotizar ahora', url: '#contacto' } }]
  if (type === 'contactForm') return [{ ...common, heading: 'Describe tu proyecto' }]
  if (type === 'signatureExperience') return []
  return [{ ...common, heading: 'Lo que dicen nuestros clientes' }]
}

async function ensureCoreComponents(payload: any) {
  const result = await payload.find({
    collection: 'reusable-components',
    depth: 1,
    limit: 100,
    overrideAccess: true,
    sort: 'name',
  })
  const existing = new Set((result.docs || []).map((item: any) => String(item.slug)))
  const missing = CORE_COMPONENTS.filter(([slug]) => !existing.has(slug))
  if (!missing.length) return result.docs || []

  await Promise.all(
    missing.map(([slug, name, type]) =>
      payload.create({
        collection: 'reusable-components',
        overrideAccess: true,
        data: {
          name,
          slug,
          category: 'section',
          status: 'active',
          description: `Plantilla base editable: ${name}.`,
          layout: coreLayout(type),
          source: 'imported',
          tags: [{ value: 'core' }, { value: type }],
          version: 1,
        },
      }),
    ),
  )

  const refreshed = await payload.find({
    collection: 'reusable-components',
    depth: 1,
    limit: 100,
    overrideAccess: true,
    sort: 'name',
  })
  return refreshed.docs || []
}

/** Put the legacy Signature experience into the same movable block list as the rest of home. */
async function ensureHomeSignatureBlock(payload: any, pages: any[], components: any[]) {
  const home = pages.find((page) => page.slug === 'home')
  const signature = components.find((component) => component.slug === 'core-signature-experience')
  if (!home || !signature) return

  const page = await payload.findByID({
    collection: 'pages',
    id: home.id,
    depth: 1,
    draft: true,
    overrideAccess: true,
  })
  const layout = Array.isArray(page.layout) ? page.layout : []
  const alreadyIncluded = layout.some((block: any) => {
    if (block?.blockType !== 'reusableComponent') return false
    const component = block.component
    return String(typeof component === 'object' ? component?.id : component) === String(signature.id)
      || (typeof component === 'object' && component?.slug === signature.slug)
  })
  if (alreadyIncluded) return

  await payload.update({
    collection: 'pages',
    id: page.id,
    draft: page._status !== 'published',
    overrideAccess: true,
    data: {
      layout: [
        { blockType: 'reusableComponent', component: signature.id, background: 'inherit', spacing: 'normal' },
        ...layout,
      ],
    },
  })
  revalidatePath('/')
}

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function trustedOrigin(request: Request) {
  const secFetchSite = request.headers.get('sec-fetch-site')
  if (secFetchSite && !['same-origin', 'same-site', 'none'].includes(secFetchSite)) {
    throw Object.assign(new Error('Solicitud bloqueada por política de origen.'), { status: 403 })
  }
  const origin = request.headers.get('origin')
  if (!origin) return
  const requestURL = new URL(request.url)
  const originURL = new URL(origin)
  if (requestURL.host !== originURL.host || requestURL.protocol !== originURL.protocol) {
    throw Object.assign(new Error('Origen no autorizado.'), { status: 403 })
  }
}

async function readBody<T>(request: Request): Promise<T> {
  trustedOrigin(request)
  if (!(request.headers.get('content-type') || '').includes('application/json')) {
    throw Object.assign(new Error('Solo se acepta JSON.'), { status: 415 })
  }
  const raw = await request.text()
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    throw Object.assign(new Error('El documento excede el tamaño permitido.'), { status: 413 })
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    throw Object.assign(new Error('JSON inválido.'), { status: 400 })
  }
}

function relationshipID(value: unknown): string | number | undefined {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return undefined
}

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    await ensureRuntimeSchema(payload)
    const url = new URL(request.url)
    const requestedPageID = url.searchParams.get('pageId')

    const [pagesResult, components, changesResult, mediaResult, backgroundsResult] = await Promise.all([
      (payload as any).find({
        collection: 'pages',
        depth: 0,
        limit: 100,
        overrideAccess: true,
        sort: 'title',
      }),
      ensureCoreComponents(payload),
      (payload as any).find({
        collection: 'ai-changes',
        depth: 0,
        limit: 30,
        overrideAccess: true,
        sort: '-updatedAt',
      }),
      (payload as any).find({
        collection: 'media',
        depth: 0,
        limit: 120,
        overrideAccess: true,
        sort: '-updatedAt',
      }),
      (payload as any).find({
        collection: 'backgrounds',
        depth: 2,
        limit: 80,
        overrideAccess: true,
        sort: '-updatedAt',
      }),
    ])

    const pages = pagesResult.docs || []
    await ensureHomeSignatureBlock(payload, pages, components)
    const selectedPageSummary =
      pages.find((page: any) => String(page.id) === String(requestedPageID || '')) ||
      pages.find((page: any) => page.slug === 'home') ||
      pages[0]
    const page = selectedPageSummary
      ? await (payload as any).findByID({
          collection: 'pages',
          id: selectedPageSummary.id,
          depth: 2,
          overrideAccess: true,
          draft: true,
        })
      : null

    const changes = (changesResult.docs || []).map((change: any) => ({
      id: change.id,
      title: change.title,
      status: change.status,
      targetPage: relationshipID(change.targetPage),
      provider: change.provider,
      model: change.model,
      proposals: Array.isArray(change.proposals) ? change.proposals : [],
      updatedAt: change.updatedAt,
    }))

    return response({
      ok: true,
      pages,
      page,
      components,
      media: mediaResult.docs || [],
      backgrounds: backgroundsResult.docs || [],
      changes,
    })
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 500)
    const message = error instanceof Error ? error.message : 'No se pudo abrir el editor visual.'
    return response({ ok: false, error: message }, status)
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await getPayload({ config })
    const user = await requireAdmin(payload, request)
    await ensureRuntimeSchema(payload)
    const body = await readBody<{
      pageId?: string | number
      layout?: unknown
      aiStyle?: unknown
      publish?: boolean
      title?: string
    }>(request)

    if (!body.pageId) return response({ ok: false, error: 'Falta la página.' }, 400)
    const layout = sanitizeBuilderLayout(body.layout)
    const aiStyle = sanitizePageStyles(body.aiStyle)
    const page = await (payload as any).findByID({
      collection: 'pages',
      id: body.pageId,
      depth: 0,
      overrideAccess: true,
      draft: true,
    })
    const previousSnapshot = {
      layout: page.layout || [],
      aiStyle: page.aiStyle || '',
      aiDesignVersion: page.aiDesignVersion || null,
      status: page._status || 'draft',
    }

    const change = await (payload as any).create({
      collection: 'ai-changes',
      overrideAccess: true,
      depth: 0,
      data: {
        title: body.title || `Edición visual: ${page.title}`,
        targetPage: page.id,
        prompt: 'Modificación realizada desde el editor visual de FabrickBuild.',
        provider: 'visual-builder',
        model: 'manual',
        status: 'applied',
        proposals: [
          {
            id: 'visual',
            title: 'Edición visual',
            summary: 'Estado guardado desde el constructor visual.',
            html: '',
            css: aiStyle,
            layout,
          },
        ],
        selectedProposal: 0,
        previousSnapshot,
        appliedSnapshot: {
          layout,
          aiStyle,
          status: body.publish ? 'published' : 'draft',
        },
        createdBy: user.id,
        appliedAt: new Date().toISOString(),
      },
    })

    const updated = await (payload as any).update({
      collection: 'pages',
      id: page.id,
      overrideAccess: true,
      draft: !body.publish,
      data: {
        layout,
        aiStyle,
        aiDesignVersion: String(change.id),
        _status: body.publish ? 'published' : 'draft',
        ...(body.publish ? { publishedAt: new Date().toISOString() } : {}),
      },
    })

    const path = page.slug === 'home' ? '/' : `/${page.slug}`
    revalidatePath(path)
    return response({
      ok: true,
      page: { id: updated.id, title: updated.title, slug: updated.slug },
      changeId: change.id,
      path,
    })
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 500)
    const message = error instanceof Error ? error.message : 'No se pudo guardar la página.'
    return response({ ok: false, error: message }, status)
  }
}
