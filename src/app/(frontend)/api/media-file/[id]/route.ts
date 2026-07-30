import config from '@payload-config'
import { getPayload } from 'payload'

import { readStoredMedia } from '@/lib/media-storage'
import { ensureRuntimeSchema } from '@/system/runtimeSchema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const payload = await getPayload({ config })
    await ensureRuntimeSchema(payload)
    const stored = await readStoredMedia(payload, id)
    const headers = new Headers()
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800')
    headers.set('X-Content-Type-Options', 'nosniff')
    if ('data' in stored) {
      headers.set('Content-Type', stored.contentType || stored.media.mimeType || 'application/octet-stream')
      return new Response(stored.data, { headers })
    }
    headers.set('Content-Type', stored.result.blob.contentType || stored.media.mimeType || 'application/octet-stream')
    if (stored.result.blob.contentDisposition) headers.set('Content-Disposition', stored.result.blob.contentDisposition)
    return new Response(stored.result.stream, { headers })
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 500)
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'No se pudo leer el archivo.' }, { status })
  }
}
