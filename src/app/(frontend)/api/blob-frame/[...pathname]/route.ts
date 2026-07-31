import { get } from '@vercel/blob'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type Args = {
  params: Promise<{ pathname: string[] }>
}

const IMAGE_EXTENSION = /\.(avif|gif|jpe?g|png|webp)$/i

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Expone únicamente los frames visuales del sitio guardados en el Blob privado.
 * No permite navegar ni descargar otros archivos del almacén.
 */
export async function GET(request: NextRequest, { params }: Args) {
  const { pathname: segments } = await params
  const pathname = segments.map((segment) => decodeURIComponent(segment)).join('/')

  if (!pathname.startsWith('frames/') || pathname.includes('..') || !IMAGE_EXTENSION.test(pathname)) {
    return new NextResponse('Archivo no permitido.', { status: 403 })
  }

  try {
    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') || undefined,
    })

    if (!result) return new NextResponse('Frame no encontrado.', { status: 404 })

    const headers = {
      ETag: result.blob.etag,
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Type': result.blob.contentType || 'application/octet-stream',
    }

    if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers })
    if (result.statusCode !== 200 || !result.stream) {
      return new NextResponse('Frame no encontrado.', { status: 404 })
    }

    return new NextResponse(result.stream, { status: 200, headers })
  } catch (error) {
    console.error('[blob-frame] No fue posible entregar el frame privado.', {
      pathname,
      error: error instanceof Error ? error.message : 'Error desconocido',
    })
    return new NextResponse('No fue posible cargar el frame.', { status: 502 })
  }
}
