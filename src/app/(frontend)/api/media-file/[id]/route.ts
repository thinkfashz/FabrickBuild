import config from '@payload-config'
import { getPayload } from 'payload'

import { readPrivateBlob } from '@/lib/media-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const payload = await getPayload({ config })
    const { media, result } = await readPrivateBlob(payload, id)
    const headers = new Headers()
    headers.set('Content-Type', result.blob.contentType || media.mimeType || 'application/octet-stream')
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800')
    headers.set('X-Content-Type-Options', 'nosniff')
    if (result.blob.contentDisposition) headers.set('Content-Disposition', result.blob.contentDisposition)
    return new Response(result.stream, { headers })
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 500)
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'No se pudo leer el archivo.' }, { status })
  }
}
