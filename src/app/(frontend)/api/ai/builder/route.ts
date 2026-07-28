import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'

import {
  sanitizeBuilderLayout,
  sanitizePageStyles,
} from '@/lib/ai/builder'
import { requireAdmin } from '@/lib/integrations/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BODY_BYTES = 1_500_000

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
    const url = new URL(request.url)
    const requestedPageID = url.searchParams.get('pageId')

    const [pagesResult, componentsResult, changesResult] = await Promise.all([
      (payload as any).find({
        collection: 'pages',
        depth: 0,
        limit: 100,
        overrideAccess: true,
        sort: 'title',
      }),
      (payload as any).find({
        collection: 'reusable-components',
        depth: 1,
        limit: 100,
        overrideAccess: true,
        sort: 'name',
      }),
      (payload as any).find({
        collection: 'ai-changes',
        depth: 0,
        limit: 30,
        overrideAccess: true,
        sort: '-updatedAt',
      }),
    ])

    const pages = pagesResult.docs || []
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
      components: componentsResult.docs || [],
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
