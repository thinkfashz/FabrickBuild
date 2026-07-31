import { get } from '@vercel/blob'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type Args = {
  params: Promise<{ pathname: string[] }>
}

const IMAGE_EXTENSION = /\.(avif|gif|jpe?g|png|webp)$/i

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function getBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN
    || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN
    || null
}

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

  const token = getBlobToken()
  if (!token) {
    console.error('[blob-frame] Vercel Blob está conectado, pero la Function no recibió una credencial de lectura.', {
      pathname,
      standardToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      legacyToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN),
    })
    return new NextResponse('Almacenamiento multimedia no configurado.', { status: 503 })
  }

  try {
    const result = await get(pathname, {
      access: 'private',
      token,
      ifNoneMatch: request.headers.get('if-none-match') || undefined,
    })

    if (!result) return new NextResponse('Frame no encontrado.', { status: 404 })

    const contentType = result.blob.contentType || result.headers.get('content-type') || 'application/octet-stream'
    if (!contentType.startsWith('image/')) {
      console.error('[blob-frame] El archivo recuperado no es una imagen.', { pathname, contentType })
      return new NextResponse('Formato multimedia no permitido.', { status: 415 })
    }

    const headers = {
      ETag: result.blob.etag,
      'Cache-Control': 'private, max-age=31536000, immutable',
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin',
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
