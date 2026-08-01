import { getCloudinaryCredentials } from '@/lib/cloudinary'

export const runtime = 'nodejs'
export const maxDuration = 30

const cacheHeaders = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'CDN-Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path = [] } = await context.params
    if (!path.length) return Response.json({ ok: false, message: 'Falta la ruta del frame.' }, { status: 400 })

    const credentials = await getCloudinaryCredentials()
    const assetPath = path.map((segment) => encodeURIComponent(decodeURIComponent(segment))).join('/')
    const sourceURL = `https://res.cloudinary.com/${encodeURIComponent(credentials.cloudName)}/image/upload/f_auto,q_auto/${assetPath}`
    const upstream = await fetch(sourceURL, { cache: 'force-cache' })

    if (!upstream.ok || !upstream.body) {
      return Response.json(
        { ok: false, message: `Cloudinary respondió HTTP ${upstream.status}.`, source: assetPath },
        { status: upstream.status || 502 },
      )
    }

    const headers = new Headers(cacheHeaders)
    headers.set('Content-Type', upstream.headers.get('content-type') || 'image/webp')
    const length = upstream.headers.get('content-length')
    if (length) headers.set('Content-Length', length)
    headers.set('X-Fabrick-Storage', 'cloudinary')

    return new Response(upstream.body, { status: 200, headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible recuperar el frame de Cloudinary.'
    console.error('[cloudinary-frame]', message)
    return Response.json({ ok: false, message }, { status: 500 })
  }
}
