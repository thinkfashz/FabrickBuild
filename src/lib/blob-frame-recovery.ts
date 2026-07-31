import 'server-only'

import { get, list } from '@vercel/blob'

type Doc = Record<string, any>

type BlobEntry = {
  pathname: string
  url: string
  downloadUrl?: string
  size?: number
}

const IMAGE_EXTENSION = /\.(avif|gif|jpe?g|png|webp)$/i
const MOBILE_NAME = /(movil|mobile|vertical|portrait|phone)/i
const DESKTOP_NAME = /(desktop|escritorio|horizontal|landscape|web|pc)/i
const DERIVATIVE_NAME = /(?:^|[/_-])(thumbnail|thumb|card|small|medium|hero)(?:[/_.-]|$)/i

const getBlobToken = () => process.env.BLOB_READ_WRITE_TOKEN
  || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN
  || null

const hasUsableFrames = (background: Doc | null | undefined) => {
  if (!background) return false
  const desktop = Array.isArray(background.desktopFrames) ? background.desktopFrames.length : 0
  const mobile = Array.isArray(background.mobileFrames) ? background.mobileFrames.length : 0
  return desktop >= 2 || mobile >= 2
}

const frameNumber = (pathname: string) => {
  const explicit = Array.from(pathname.matchAll(/frame[^0-9]*([0-9]{1,6})/gi))
  const lastExplicit = explicit[explicit.length - 1]?.[1]
  if (lastExplicit) return Number(lastExplicit)

  const basename = pathname.split('/').pop() || pathname
  const values = basename.match(/\d+/g)
  const fallback = values?.length ? Number(values[values.length - 1]) : Number.MAX_SAFE_INTEGER
  return Number.isFinite(fallback) ? fallback : Number.MAX_SAFE_INTEGER
}

const deviceFor = (pathname: string): 'desktop' | 'mobile' | 'universal' => {
  if (MOBILE_NAME.test(pathname)) return 'mobile'
  if (DESKTOP_NAME.test(pathname)) return 'desktop'
  return 'universal'
}

const publicFrameURL = (pathname: string) =>
  `/api/blob-frame/${pathname.split('/').map((segment) => encodeURIComponent(segment)).join('/')}`

async function listEveryBlob(prefix?: string) {
  const token = getBlobToken()
  if (!token) throw new Error('Vercel Blob no entregó una credencial de lectura al build.')

  const blobs: BlobEntry[] = []
  let cursor: string | undefined

  do {
    const result = await list({
      limit: 1000,
      token,
      ...(prefix ? { prefix } : {}),
      ...(cursor ? { cursor } : {}),
    })
    blobs.push(...(result.blobs as BlobEntry[]))
    cursor = result.hasMore ? result.cursor : undefined
  } while (cursor && blobs.length < 10_000)

  return blobs
}

function selectBestFrames(entries: BlobEntry[]) {
  const candidates = entries.filter((entry) => {
    const pathname = entry.pathname || ''
    return IMAGE_EXTENSION.test(pathname) && /frame/i.test(pathname)
  })

  const originals = candidates.filter((entry) => !DERIVATIVE_NAME.test(entry.pathname))
  const source = originals.length >= 2 ? originals : candidates
  const unique = new Map<string, BlobEntry>()

  for (const entry of source) {
    const key = entry.pathname.trim().toLowerCase()
    if (!key || unique.has(key)) continue
    unique.set(key, entry)
  }

  return Array.from(unique.values()).sort((a, b) => {
    const frameA = frameNumber(a.pathname)
    const frameB = frameNumber(b.pathname)
    if (frameA !== frameB) return frameA - frameB
    return a.pathname.localeCompare(b.pathname, 'es', { numeric: true, sensitivity: 'base' })
  })
}

async function validatePrivateFrame(entry: BlobEntry) {
  const token = getBlobToken()
  if (!token) throw new Error('Vercel Blob no entregó una credencial para validar los frames.')

  const result = await get(entry.pathname, {
    access: 'private',
    token,
  })
  const contentType = result?.blob.contentType || result?.headers.get('content-type') || ''
  if (!result || result.statusCode !== 200 || !result.stream || !contentType.startsWith('image/')) {
    throw new Error(`El Blob ${entry.pathname} no devolvió una imagen válida.`)
  }
  await result.stream.cancel().catch(() => undefined)
  return contentType
}

const asMediaDocument = (entry: BlobEntry) => {
  const url = publicFrameURL(entry.pathname)
  return {
    id: `blob:${entry.pathname}`,
    filename: entry.pathname.split('/').pop() || entry.pathname,
    alt: `Frame ${frameNumber(entry.pathname)}`,
    url,
    externalURL: url,
    blobPathname: entry.pathname,
  }
}

/**
 * Recupera la secuencia directamente desde Vercel Blob cuando PostgreSQL perdió
 * las relaciones o los registros de Media. No duplica ni modifica archivos.
 */
export async function recoverBackgroundFromBlob(background: Doc | null | undefined): Promise<Doc | null> {
  if (!background) return null
  if (hasUsableFrames(background)) return background

  try {
    let blobs = await listEveryBlob('fabrickbuild/')
    if (!blobs.some((item) => /frame/i.test(item.pathname))) blobs = await listEveryBlob()

    const selected = selectBestFrames(blobs)
    if (selected.length < 2) {
      console.warn('[blob-frames] Blob está conectado, pero no se encontraron al menos dos imágenes de frame.', {
        listed: blobs.length,
        selected: selected.length,
        sample: blobs.slice(0, 5).map((item) => item.pathname),
      })
      return background
    }

    const first = selected[0]
    const last = selected[selected.length - 1]
    const [firstType, lastType] = await Promise.all([
      validatePrivateFrame(first),
      validatePrivateFrame(last),
    ])

    const desktop = selected.filter((entry) => deviceFor(entry.pathname) === 'desktop')
    const mobile = selected.filter((entry) => deviceFor(entry.pathname) === 'mobile')
    const universal = selected.filter((entry) => deviceFor(entry.pathname) === 'universal')

    const desktopFrames = (desktop.length >= 2 ? desktop : universal.length >= 2 ? universal : mobile).map(asMediaDocument)
    const mobileFrames = (mobile.length >= 2 ? mobile : universal.length >= 2 ? universal : desktop).map(asMediaDocument)
    const poster = mobileFrames[0] || desktopFrames[0] || null

    console.info('[blob-frames] Secuencia privada validada y conectada a la ruta segura del sitio.', {
      listed: blobs.length,
      selected: selected.length,
      desktop: desktopFrames.length,
      mobile: mobileFrames.length,
      first: first.pathname,
      firstType,
      last: last.pathname,
      lastType,
      delivery: '/api/blob-frame/[...pathname]',
    })

    return {
      ...background,
      desktopFrames,
      mobileFrames,
      poster,
      frameCountDesktop: desktopFrames.length,
      frameCountMobile: mobileFrames.length,
      recoveredFromBlob: true,
      blobDeliveryValidated: true,
    }
  } catch (error) {
    console.error('[blob-frames] No fue posible recuperar la secuencia desde Vercel Blob.', error)
    return background
  }
}
