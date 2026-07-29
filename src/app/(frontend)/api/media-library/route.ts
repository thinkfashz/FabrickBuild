import config from '@payload-config'
import { getPayload } from 'payload'

import {
  assertMediaSource,
  listDatabaseMedia,
  listRemoteAssets,
  moveDatabaseMedia,
  moveManagedAsset,
  removeDatabaseMedia,
  removeManagedAsset,
  uploadSystemMedia,
  uploadManagedAsset,
} from '@/lib/media-storage'
import { readLimitedJSON, requireAdmin } from '@/lib/integrations/service'
import { ensureRuntimeSchema } from '@/system/runtimeSchema'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' },
  })
}

function failure(error: unknown) {
  const status = Number((error as { status?: number })?.status || 500)
  return response({ ok: false, error: error instanceof Error ? error.message : 'No se pudo completar la operación multimedia.' }, status)
}

function trustedFormOrigin(request: Request) {
  const site = request.headers.get('sec-fetch-site')
  if (site && !['same-origin', 'same-site', 'none'].includes(site)) {
    throw Object.assign(new Error('Solicitud bloqueada por política de origen.'), { status: 403 })
  }
  const origin = request.headers.get('origin')
  if (origin) {
    const actual = new URL(request.url)
    const source = new URL(origin)
    if (actual.host !== source.host || actual.protocol !== source.protocol) {
      throw Object.assign(new Error('Origen no autorizado.'), { status: 403 })
    }
  }
}

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    await ensureRuntimeSchema(payload)
    const url = new URL(request.url)
    const source = assertMediaSource(url.searchParams.get('source') || 'database')
    const folder = url.searchParams.get('folder') || undefined
    const integrationID = url.searchParams.get('integrationId') || undefined
    if (source === 'database') {
      return response({ ok: true, source, assets: await listDatabaseMedia(payload, folder) })
    }
    const result = await listRemoteAssets(payload, source, { folder, integrationID })
    return response({ ok: true, source, ...result })
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    await ensureRuntimeSchema(payload)
    trustedFormOrigin(request)
    const form = await request.formData()
    const source = assertMediaSource(form.get('source'))
    const file = form.get('file')
    if (!(file instanceof File)) return response({ ok: false, error: 'Selecciona un archivo.' }, 400)
    if (source === 'database') {
      const result = await uploadSystemMedia(payload, {
        folder: typeof form.get('folder') === 'string' ? String(form.get('folder')) : undefined,
        alt: typeof form.get('alt') === 'string' ? String(form.get('alt')) : undefined,
        category: typeof form.get('category') === 'string' ? String(form.get('category')) : undefined,
        file,
      })
      return response({ ok: true, ...result }, 201)
    }
    const result = await uploadManagedAsset(payload, {
      source,
      integrationID: typeof form.get('integrationId') === 'string' ? String(form.get('integrationId')) : undefined,
      folder: typeof form.get('folder') === 'string' ? String(form.get('folder')) : undefined,
      alt: typeof form.get('alt') === 'string' ? String(form.get('alt')) : undefined,
      category: typeof form.get('category') === 'string' ? String(form.get('category')) : undefined,
      file,
    })
    return response({ ok: true, ...result }, 201)
  } catch (error) {
    return failure(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    await ensureRuntimeSchema(payload)
    const body = await readLimitedJSON<{
      source?: string
      integrationID?: string | number
      key?: string
      mediaID?: string | number
      folder?: string
    }>(request)
    const source = assertMediaSource(body.source)
    if (!body.folder) return response({ ok: false, error: 'Indica la carpeta de destino.' }, 400)
    if (source === 'database') {
      if (!body.mediaID) return response({ ok: false, error: 'Falta el archivo de biblioteca.' }, 400)
      return response({ ok: true, media: await moveDatabaseMedia(payload, body.mediaID, body.folder) })
    }
    if (!body.key) return response({ ok: false, error: 'Falta la clave del archivo remoto.' }, 400)
    return response({ ok: true, asset: await moveManagedAsset(payload, { source, integrationID: body.integrationID, key: body.key, folder: body.folder, mediaID: body.mediaID }) })
  } catch (error) {
    return failure(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    await ensureRuntimeSchema(payload)
    const body = await readLimitedJSON<{
      source?: string
      integrationID?: string | number
      key?: string
      mediaID?: string | number
    }>(request)
    const source = assertMediaSource(body.source)
    if (source === 'database') {
      if (!body.mediaID) return response({ ok: false, error: 'Falta el archivo de biblioteca.' }, 400)
      await removeDatabaseMedia(payload, body.mediaID)
      return response({ ok: true })
    }
    if (!body.key) return response({ ok: false, error: 'Falta la clave del archivo remoto.' }, 400)
    await removeManagedAsset(payload, { source, integrationID: body.integrationID, key: body.key, mediaID: body.mediaID })
    return response({ ok: true })
  } catch (error) {
    return failure(error)
  }
}
