import config from '@payload-config'
import { getPayload } from 'payload'

import { requireAdmin } from '@/lib/integrations/service'

type RecordLike = Record<string, unknown>

const isRecord = (value: unknown): value is RecordLike => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

function sourceFor(value: unknown) {
  if (typeof value === 'string' && /^(https?:\/\/|\/)/i.test(value)) return value
  if (typeof value === 'number') return `/api/media-file/${value}`
  if (!isRecord(value)) return null
  const sizes = isRecord(value.sizes) ? value.sizes : null
  const hero = sizes && isRecord(sizes.hero) ? sizes.hero.url : null
  const direct = hero || value.externalURL || value.url
  if (typeof direct === 'string' && direct) return direct
  const id = value.id
  return typeof id === 'string' || typeof id === 'number' ? `/api/media-file/${id}` : null
}

function relationID(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (isRecord(value) && (typeof value.id === 'string' || typeof value.id === 'number')) return String(value.id)
  return null
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const rawID = new URL(request.url).searchParams.get('background')?.trim()
    if (!rawID) return Response.json({ ok: false, error: 'Background inválido.' }, { status: 400 })

    const payload = await getPayload({ config })
    await requireAdmin(payload, request)

    const background = await payload.findByID({
      collection: 'backgrounds',
      id: /^\d+$/.test(rawID) ? Number(rawID) : rawID,
      depth: 2,
      overrideAccess: true,
    }) as RecordLike

    const desktop = Array.isArray(background.desktopFrames) ? background.desktopFrames : []
    const mobile = Array.isArray(background.mobileFrames) ? background.mobileFrames : []
    const frames = [...desktop, ...mobile]
    const usable = frames.filter((item) => Boolean(sourceFor(item))).length
    const missing = frames.length - usable
    const issues: string[] = []

    if (background.status !== 'ready') issues.push('El Background no está marcado como “Listo para usar”.')
    if (background.kind === 'frames' && frames.length < 2) issues.push('Una secuencia cinematográfica necesita al menos 2 frames.')
    if (background.kind === 'frames' && !desktop.length && !mobile.length) issues.push('No hay frames relacionados todavía.')
    if (background.kind === 'frames' && !desktop.length && mobile.length) issues.push('No hay secuencia de escritorio; se reutilizará la secuencia móvil.')
    if (background.kind === 'frames' && missing) issues.push(`${missing} frame(s) no tienen URL o archivo reproducible.`)
    if (background.kind === 'image' && !sourceFor(background.image)) issues.push('La imagen principal no tiene un archivo reproducible.')
    if (background.kind === 'url' && typeof background.externalURL !== 'string') issues.push('Falta la URL externa del Background.')

    const home = await payload.find({
      collection: 'pages',
      depth: 1,
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: 'home' } },
    })
    const page = home.docs[0] as RecordLike | undefined
    const configuredDirectly = page?.backgroundSource === 'saved' && relationID(page.savedBackground) === String(background.id)

    let configuredAsDefault = false
    if (!configuredDirectly && page?.backgroundSource !== 'saved') {
      const latest = await payload.find({
        collection: 'backgrounds',
        depth: 0,
        limit: 1,
        sort: '-updatedAt',
        overrideAccess: true,
        where: {
          and: [
            { status: { equals: 'ready' } },
            { kind: { equals: 'frames' } },
            { category: { equals: 'hero' } },
          ],
        },
      })
      configuredAsDefault = String(latest.docs[0]?.id || '') === String(background.id)
    }

    return Response.json({
      ok: true,
      background: { id: background.id, name: background.name, kind: background.kind, status: background.status },
      frames: { desktop: desktop.length, mobile: mobile.length, total: frames.length, usable, missing },
      configuredOnHome: configuredDirectly || configuredAsDefault,
      issues,
      previewURL: '/',
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    const status = Number((error as { status?: number }).status || 500)
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'No se pudo diagnosticar el Background.' }, { status })
  }
}
