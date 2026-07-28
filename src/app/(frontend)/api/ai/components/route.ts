import config from '@payload-config'
import { getPayload } from 'payload'

import {
  sanitizeBuilderLayout,
  sanitizeComponentPreview,
  sanitizeComponentStyles,
  slugifyComponentName,
} from '@/lib/ai/builder'
import { requireAdmin } from '@/lib/integrations/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BODY_BYTES = 1_000_000

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
  const site = request.headers.get('sec-fetch-site')
  if (site && !['same-origin', 'same-site', 'none'].includes(site)) {
    throw Object.assign(new Error('Solicitud bloqueada por política de origen.'), { status: 403 })
  }
  const origin = request.headers.get('origin')
  if (!origin) return
  const current = new URL(request.url)
  const supplied = new URL(origin)
  if (current.host !== supplied.host || current.protocol !== supplied.protocol) {
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
    throw Object.assign(new Error('El componente excede el tamaño permitido.'), { status: 413 })
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    throw Object.assign(new Error('JSON inválido.'), { status: 400 })
  }
}

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    const result = await (payload as any).find({
      collection: 'reusable-components',
      depth: 1,
      limit: 100,
      overrideAccess: true,
      sort: 'name',
    })
    return response({ ok: true, components: result.docs || [] })
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 500)
    return response({ ok: false, error: error instanceof Error ? error.message : 'No se pudo abrir la biblioteca.' }, status)
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    const user = await requireAdmin(payload, request)
    const body = await readBody<{
      id?: string | number
      name?: string
      description?: string
      category?: string
      status?: string
      source?: string
      layout?: unknown
      styles?: unknown
      previewHTML?: unknown
      tags?: string[]
    }>(request)

    const name = String(body.name || '').trim()
    if (!name) return response({ ok: false, error: 'El componente necesita un nombre.' }, 400)
    const existing = body.id
      ? await (payload as any).findByID({
          collection: 'reusable-components',
          id: body.id,
          depth: 0,
          overrideAccess: true,
        })
      : null
    const baseSlug = existing?.slug || slugifyComponentName(name)
    const slug = existing?.slug || `${baseSlug}-${Date.now().toString(36)}`
    const layout = sanitizeBuilderLayout(body.layout)
    const rawStyles = String(body.styles || '').replace(
      /\.ai-page/g,
      `.generated-component[data-component="${slug}"]`,
    )
    const styles = sanitizeComponentStyles(rawStyles, slug)
    const data = {
      name,
      slug,
      category: ['section', 'pattern', 'page'].includes(String(body.category)) ? body.category : 'section',
      status: ['active', 'draft', 'archived'].includes(String(body.status)) ? body.status : 'active',
      description: String(body.description || '').slice(0, 2000),
      layout,
      styles,
      previewHTML: sanitizeComponentPreview(body.previewHTML),
      source: ['manual', 'ai', 'imported'].includes(String(body.source)) ? body.source : 'manual',
      tags: (Array.isArray(body.tags) ? body.tags : []).slice(0, 12).map((value) => ({ value: String(value).slice(0, 80) })),
      version: Number(existing?.version || 0) + 1,
      createdBy: existing?.createdBy || user.id,
    }

    const component = existing
      ? await (payload as any).update({
          collection: 'reusable-components',
          id: existing.id,
          data,
          depth: 1,
          overrideAccess: true,
        })
      : await (payload as any).create({
          collection: 'reusable-components',
          data,
          depth: 1,
          overrideAccess: true,
        })

    return response({ ok: true, component })
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 500)
    return response({ ok: false, error: error instanceof Error ? error.message : 'No se pudo guardar el componente.' }, status)
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    trustedOrigin(request)
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return response({ ok: false, error: 'Falta el ID.' }, 400)
    await (payload as any).delete({
      collection: 'reusable-components',
      id,
      overrideAccess: true,
    })
    return response({ ok: true })
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 500)
    return response({ ok: false, error: error instanceof Error ? error.message : 'No se pudo eliminar el componente.' }, status)
  }
}
