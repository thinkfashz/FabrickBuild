import { getCMS } from './cms'

type Doc = Record<string, any>

type LegacyMedia = {
  id?: string | number
  filename?: string | null
  category?: string | null
  device?: string | null
  frameOrder?: number | null
  collectionKey?: string | null
  width?: number | null
  height?: number | null
}

const relationID = (value: unknown): string | number | null => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' || typeof id === 'number' ? id : null
  }
  return null
}

const frameNumber = (value?: string | null) => {
  const values = value?.match(/\d+/g)
  const number = values?.length ? Number(values[values.length - 1]) : Number.MAX_SAFE_INTEGER
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER
}

const hasFrames = (background: Doc | null) => {
  if (!background) return false
  const desktop = Array.isArray(background.desktopFrames) ? background.desktopFrames.length : 0
  const mobile = Array.isArray(background.mobileFrames) ? background.mobileFrames.length : 0
  return desktop >= 2 || mobile >= 2
}

const isLegacyFrame = (media: LegacyMedia) => {
  if (media.category === 'frame') return true
  const filename = String(media.filename || '')
  return /frame/i.test(filename) && /\d+/.test(filename)
}

const isMobileFrame = (media: LegacyMedia) => {
  if (media.device === 'mobile') return true
  if (media.device === 'desktop') return false
  const filename = String(media.filename || '')
  if (/(movil|mobile|vertical|portrait)/i.test(filename)) return true
  return Number(media.height || 0) > Number(media.width || 0)
}

const sortFrames = (frames: LegacyMedia[]) => [...frames].sort((a, b) => {
  const explicitA = typeof a.frameOrder === 'number' ? a.frameOrder : Number.MAX_SAFE_INTEGER
  const explicitB = typeof b.frameOrder === 'number' ? b.frameOrder : Number.MAX_SAFE_INTEGER
  if (explicitA !== explicitB) return explicitA - explicitB
  const fileA = frameNumber(a.filename)
  const fileB = frameNumber(b.filename)
  if (fileA !== fileB) return fileA - fileB
  return String(a.filename || '').localeCompare(String(b.filename || ''), 'es', {
    numeric: true,
    sensitivity: 'base',
  })
})

async function findLegacyFrames() {
  const payload = await getCMS()
  const docs: LegacyMedia[] = []
  let page = 1

  while (page <= 100) {
    const result = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 100,
      page,
      sort: 'id',
      overrideAccess: true,
    })
    docs.push(...((result.docs || []) as LegacyMedia[]))
    if (!result.hasNextPage || !result.nextPage) break
    page = Number(result.nextPage)
  }

  return docs.filter(isLegacyFrame)
}

/**
 * Compatibilidad para secuencias subidas antes de que Multimedia incorporara
 * category, device, frameOrder y collectionKey. Recupera los registros por el
 * nombre histórico del archivo y vuelve a guardar las relaciones en Backgrounds.
 */
export async function repairLegacyBackgroundFrames(background: Doc | null): Promise<Doc | null> {
  if (!background || hasFrames(background)) return background

  try {
    const payload = await getCMS()
    const legacyFrames = await findLegacyFrames()
    if (legacyFrames.length < 2) {
      console.warn('[cinematic-background] No se encontraron suficientes frames heredados.', {
        background: background.slug || background.name,
        candidates: legacyFrames.length,
      })
      return background
    }

    const desktopFrames = sortFrames(legacyFrames.filter((item) => !isMobileFrame(item)))
    const mobileFrames = sortFrames(legacyFrames.filter(isMobileFrame))
    const desktopIDs = desktopFrames.map(relationID).filter((id): id is string | number => id !== null)
    const mobileIDs = mobileFrames.map(relationID).filter((id): id is string | number => id !== null)
    const posterID = mobileIDs[0] || desktopIDs[0] || null

    if (desktopIDs.length < 2 && mobileIDs.length < 2) return background

    const repaired: Doc = {
      ...background,
      desktopFrames: desktopFrames.length ? desktopFrames : background.desktopFrames || [],
      mobileFrames: mobileFrames.length ? mobileFrames : background.mobileFrames || [],
      poster: posterID ? (mobileFrames[0] || desktopFrames[0]) : background.poster || null,
      frameCountDesktop: desktopIDs.length,
      frameCountMobile: mobileIDs.length,
    }

    const backgroundID = relationID(background)
    if (!backgroundID) return repaired

    try {
      const updated = await payload.update({
        collection: 'backgrounds',
        id: backgroundID,
        depth: 2,
        overrideAccess: true,
        data: {
          kind: 'frames',
          status: 'ready',
          desktopFrames: desktopIDs,
          mobileFrames: mobileIDs,
          poster: posterID,
        },
      })
      console.info('[cinematic-background] Relaciones heredadas reparadas y persistidas.', {
        background: background.slug || background.name,
        desktop: desktopIDs.length,
        mobile: mobileIDs.length,
      })
      return updated as Doc
    } catch (error) {
      console.error('[cinematic-background] Se recuperaron los frames, pero no fue posible persistirlos.', error)
      return repaired
    }
  } catch (error) {
    console.error('[cinematic-background] Falló la recuperación compatible de frames.', error)
    return background
  }
}
