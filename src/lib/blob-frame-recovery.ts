import 'server-only'

import { list } from '@vercel/blob'

type Doc = Record<string, any>

type BlobEntry = {
  pathname: string
  url: string
  downloadUrl?: string
  size?: number
}

const IMAGE_EXTENSION = /\.(avif|gif|jpe?g|png|webp)$/i
const FRAME_NAME = /frame[^0-9]*([0-9]{1,6})/i
const MOBILE_NAME = /(movil|mobile|vertical|portrait|phone)/i
const DESKTOP_NAME = /(desktop|escritorio|horizontal|landscape|web|pc)/i
const DERIVATIVE_NAME = /(thumbnail|thumb|card|small|medium|hero)[-_]/i

const hasUsableFrames = (background: Doc | null | undefined) => {
  if (!background) return false
  const desktop = Array.isArray(background.desktopFrames) ? background.desktopFrames.length : 0
  const mobile = Array.isArray(background.mobileFrames) ? background.mobileFrames.length : 0
  return desktop >= 2 || mobile >= 2
}

const frameNumber = (pathname: string) => {
  const explicit = pathname.match(FRAME_NAME)
  if (explicit?.[1]) return Number(explicit[1])
  const values = pathname.match(/\d+/g)
  const fallback = values?.length ? Number(values[values.length - 1]) : Number.MAX_SAFE_INTEGER
  return Number.isFinite(fallback) ? fallback : Number.MAX_SAFE_INTEGER
}

const deviceFor = (pathname: string): 'desktop' | 'mobile' | 'universal' => {
  if (MOBILE_NAME.test(pathname)) return 'mobile'
  if (DESKTOP_NAME.test(pathname)) return 'desktop'
  return 'universal'
}

async function listEveryBlob(prefix?: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN
  const blobs: BlobEntry[] = []
  let cursor: string | undefined

  do {
    const result = await list({
      limit: 1000,
      ...(prefix ? { prefix } : {}),
      ...(cursor ? { cursor } : {}),
      ...(token ? { token } : {}),
    })
    blobs.push(...(result.blobs as BlobEntry[]))
    cursor = result.hasMore ? result.cursor : undefined
  } while (cursor && blobs.length < 10_000)

  return blobs
}

function selectBestFrames(entries: BlobEntry[]) {
  const selected = new Map<string, BlobEntry>()

  for (const entry of entries) {
    const pathname = entry.pathname || ''
    if (!IMAGE_EXTENSION.test(pathname) || !/frame/i.test(pathname)) continue

    const device = deviceFor(pathname)
    const order = frameNumber(pathname)
    const key = `${device}:${order}`
    const previous = selected.get(key)

    if (!previous) {
      selected.set(key, entry)
      continue
    }

    const previousDerivative = DERIVATIVE_NAME.test(previous.pathname)
    const currentDerivative = DERIVATIVE_NAME.test(pathname)
    const previousSize = Number(previous.size || 0)
    const currentSize = Number(entry.size || 0)

    if ((previousDerivative && !currentDerivative) || (previousDerivative === currentDerivative && currentSize > previousSize)) {
      selected.set(key, entry)
    }
  }

  return Array.from(selected.values()).sort((a, b) => {
    const frameA = frameNumber(a.pathname)
    const frameB = frameNumber(b.pathname)
    if (frameA !== frameB) return frameA - frameB
    return a.pathname.localeCompare(b.pathname, 'es', { numeric: true, sensitivity: 'base' })
  })
}

const asMediaDocument = (entry: BlobEntry) => ({
  id: `blob:${entry.pathname}`,
  filename: entry.pathname.split('/').pop() || entry.pathname,
  alt: `Frame ${frameNumber(entry.pathname)}`,
  url: entry.url || entry.downloadUrl,
  externalURL: entry.url || entry.downloadUrl,
})

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
      })
      return background
    }

    const desktop = selected.filter((entry) => deviceFor(entry.pathname) === 'desktop')
    const mobile = selected.filter((entry) => deviceFor(entry.pathname) === 'mobile')
    const universal = selected.filter((entry) => deviceFor(entry.pathname) === 'universal')

    const desktopFrames = (desktop.length >= 2 ? desktop : universal.length >= 2 ? universal : mobile).map(asMediaDocument)
    const mobileFrames = (mobile.length >= 2 ? mobile : universal.length >= 2 ? universal : desktop).map(asMediaDocument)
    const poster = mobileFrames[0] || desktopFrames[0] || null

    console.info('[blob-frames] Secuencia recuperada directamente desde Vercel Blob.', {
      listed: blobs.length,
      selected: selected.length,
      desktop: desktopFrames.length,
      mobile: mobileFrames.length,
      store: (() => {
        try {
          return new URL(String(poster?.url || '')).hostname
        } catch {
          return 'desconocido'
        }
      })(),
    })

    return {
      ...background,
      desktopFrames,
      mobileFrames,
      poster,
      frameCountDesktop: desktopFrames.length,
      frameCountMobile: mobileFrames.length,
      recoveredFromBlob: true,
    }
  } catch (error) {
    console.error('[blob-frames] No fue posible recuperar la secuencia desde Vercel Blob.', error)
    return background
  }
}
