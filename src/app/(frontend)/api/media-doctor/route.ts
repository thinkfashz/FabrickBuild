import config from '@payload-config'
import { getPayload } from 'payload'

import { requireAdmin } from '@/lib/integrations/service'
import { ensureRuntimeSchema } from '@/system/runtimeSchema'

type RecordLike = Record<string, unknown>

const isRecord = (value: unknown): value is RecordLike => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

function sourceFor(value: unknown) {
  if (!isRecord(value)) return null
  const direct = value.externalURL || value.url
  if (typeof direct === 'string' && direct) return direct
  const id = value.id
  return typeof id === 'string' || typeof id === 'number' ? `/api/media-file/${id}` : null
}

function hasSavedBackground(value: unknown, backgroundID: number) {
  if (!isRecord(value)) return false
  const saved = value.savedBackground
  return isRecord(saved) && Number(saved.id) === backgroundID
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Small authenticated diagnostic endpoint used by the native Payload record.
 * It never exposes credentials or file bytes; it reports only renderability.
 */
export async function GET(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get('background'))
    if (!Number.isInteger(id) || id < 1) return Response.json({ ok: false, error: 'Background inválido.' }, { status: 400 })

    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    await ensureRuntimeSchema(payload)

    const background = await payload.findByID({ collection: 'backgrounds', id, depth: 2, overrideAccess: true }) as RecordLike
    const desktop = Array.isArray(background.desktopFrames) ? background.desktopFrames : []
    const mobile = Array.isArray(background.mobileFrames) ? background.mobileFrames : []
    const frames = [...desktop, ...mobile]
    const usable = frames.filter((item) => Boolean(sourceFor(item))).length
    const missing = frames.length - usable
    const issues: string[] = []

    if (background.status !== 'ready') issues.push('El background no está marcado como “Listo para usar”.')
    if (background.kind === 'frames' && frames.length < 2) issues.push('Una secuencia cinematográfica necesita al menos 2 frames.')
    if (background.kind === 'frames' && !desktop.length) issues.push('No hay frames de escritorio; se usará la secuencia móvil si existe.')
    if (background.kind === 'frames' && missing) issues.push(`${missing} frame(s) no tienen URL o archivo reproducible.`)
    if (background.kind === 'image' && !sourceFor(background.image)) issues.push('La imagen principal no tiene un archivo reproducible.')
    if (background.kind === 'url' && typeof background.externalURL !== 'string') issues.push('Falta la URL externa del background.')

    const home = await payload.find({
      collection: 'pages', depth: 0, limit: 1, overrideAccess: true,
      where: { slug: { equals: 'home' } },
    })
    const page = home.docs[0] as RecordLike | undefined
    const layout = Array.isArray(page?.layout) ? page.layout : []
    const configuredOnHome = hasSavedBackground(page?.pageAppearance, id)
      || layout.some((block) => isRecord(block) && hasSavedBackground(block.appearance, id))

    return Response.json({
      ok: true,
      background: { id: background.id, name: background.name, kind: background.kind, status: background.status },
      frames: { desktop: desktop.length, mobile: mobile.length, total: frames.length, usable, missing },
      configuredOnHome,
      issues,
      previewURL: '/',
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    const status = Number((error as { status?: number }).status || 500)
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'No se pudo diagnosticar el background.' }, { status })
  }
}
