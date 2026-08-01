import { list } from '@vercel/blob'
import { NextResponse } from 'next/server'

const IMAGE_EXTENSION = /\.(avif|gif|jpe?g|png|webp)$/i
const MOBILE_NAME = /(movil|mobile|vertical|portrait|phone)/i
const DESKTOP_NAME = /(desktop|escritorio|horizontal|landscape|web|pc)/i
const DERIVATIVE_NAME = /(?:^|[/_-])(thumbnail|thumb|card|small|medium|hero)(?:[/_.-]|$)/i

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const frameNumber = (pathname: string) => {
  const explicit = Array.from(pathname.matchAll(/frame[^0-9]*([0-9]{1,6})/gi))
  const matched = explicit[explicit.length - 1]?.[1]
  if (matched) return Number(matched)
  const values = (pathname.split('/').pop() || pathname).match(/\d+/g)
  return values?.length ? Number(values[values.length - 1]) : Number.MAX_SAFE_INTEGER
}

const publicURL = (pathname: string) =>
  `/api/blob-frame/${pathname.split('/').map((segment) => encodeURIComponent(segment)).join('/')}`

async function listEveryFrame() {
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN
  const oidcToken = process.env.VERCEL_OIDC_TOKEN
  const storeId = process.env.BLOB_STORE_ID
  const auth = token ? { token } : oidcToken && storeId ? { oidcToken, storeId } : {}
  const entries: Array<{ pathname: string }> = []
  let cursor: string | undefined

  do {
    const result = await list({ limit: 1000, ...(cursor ? { cursor } : {}), ...auth })
    entries.push(...result.blobs)
    cursor = result.hasMore ? result.cursor : undefined
  } while (cursor && entries.length < 10_000)

  const candidates = entries.filter(({ pathname }) =>
    IMAGE_EXTENSION.test(pathname) && /frame/i.test(pathname),
  )
  const originals = candidates.filter(({ pathname }) => !DERIVATIVE_NAME.test(pathname))
  const source = originals.length >= 2 ? originals : candidates
  const unique = new Map<string, string>()

  for (const { pathname } of source) {
    const key = pathname.trim().toLowerCase()
    if (key && !unique.has(key)) unique.set(key, pathname)
  }

  return Array.from(unique.values()).sort((a, b) => {
    const difference = frameNumber(a) - frameNumber(b)
    return difference || a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })
  })
}

export async function GET() {
  try {
    const frames = await listEveryFrame()
    if (frames.length < 2) {
      return NextResponse.json(
        { error: 'No se encontraron suficientes frames.', desktopFrames: [], mobileFrames: [] },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const desktop = frames.filter((pathname) => DESKTOP_NAME.test(pathname))
    const mobile = frames.filter((pathname) => MOBILE_NAME.test(pathname))
    const universal = frames.filter((pathname) => !DESKTOP_NAME.test(pathname) && !MOBILE_NAME.test(pathname))
    const desktopSource = desktop.length >= 2 ? desktop : universal.length >= 2 ? universal : mobile
    const mobileSource = mobile.length >= 2 ? mobile : universal.length >= 2 ? universal : desktop
    const desktopFrames = desktopSource.map(publicURL)
    const mobileFrames = mobileSource.map(publicURL)

    return NextResponse.json(
      {
        desktopFrames,
        mobileFrames,
        poster: mobileFrames[0] || desktopFrames[0] || null,
        count: Math.max(desktopFrames.length, mobileFrames.length),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    )
  } catch (error) {
    console.error('[blob-frame-manifest] No fue posible listar los frames privados.', {
      error: error instanceof Error ? error.message : 'Error desconocido',
    })
    return NextResponse.json(
      { error: 'No fue posible cargar el manifiesto de frames.', desktopFrames: [], mobileFrames: [] },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
