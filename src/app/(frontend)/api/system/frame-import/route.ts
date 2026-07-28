import { put } from '@vercel/blob'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const IMPORT_TOKEN = '7s_LMu8m8FZnHtucnKBPWOYyBYf-5d0ylGyG3PcPau8'
const MAX_BYTES = 200_000
const ALLOWED_PATH = /^luxury-frames\/(desktop|mobile)\/frame_\d{3}\.webp$/

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  })
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const token = request.headers.get('x-frame-import-token') || url.searchParams.get('token')
    if (token !== IMPORT_TOKEN) return json({ ok: false, error: 'No autorizado.' }, 401)

    const pathname = String(url.searchParams.get('pathname') || '')
    if (!ALLOWED_PATH.test(pathname)) return json({ ok: false, error: 'Ruta inválida.' }, 400)

    const type = request.headers.get('content-type') || ''
    if (!type.includes('image/webp')) return json({ ok: false, error: 'Solo se acepta WebP.' }, 415)

    const bytes = new Uint8Array(await request.arrayBuffer())
    if (!bytes.length || bytes.length > MAX_BYTES) {
      return json({ ok: false, error: `El archivo debe pesar entre 1 y ${MAX_BYTES} bytes.` }, 413)
    }

    const tokenValue =
      process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN
    if (!tokenValue) return json({ ok: false, error: 'Vercel Blob no está configurado.' }, 503)

    const blob = await put(pathname, bytes, {
      access: 'public',
      addRandomSuffix: false,
      overwrite: true,
      contentType: 'image/webp',
      cacheControlMaxAge: 31_536_000,
      token: tokenValue,
    })

    return json({
      ok: true,
      pathname: blob.pathname,
      url: blob.url,
      size: bytes.length,
    })
  } catch (error) {
    console.error('FabrickBuild frame import error:', error)
    return json(
      { ok: false, error: error instanceof Error ? error.message : 'No se pudo importar el frame.' },
      500,
    )
  }
}
