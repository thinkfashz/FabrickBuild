import config from '@payload-config'
import { del } from '@vercel/blob'
import { getPayload } from 'payload'
import { destroyCloudinaryAsset } from '@/lib/cloudinary'

export const runtime = 'nodejs'

const idOf = (value: unknown) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) return String((value as { id: unknown }).id)
  return ''
}

export async function DELETE(request: Request) {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: request.headers })
  if (!auth.user) return Response.json({ ok: false, message: 'Sesión expirada.' }, { status: 401 })
  if (auth.user.role && auth.user.role !== 'admin') return Response.json({ ok: false, message: 'Solo un administrador puede eliminar frames.' }, { status: 403 })

  const body = await request.json().catch(() => ({})) as any
  const backgroundId = String(body.backgroundId || '')
  const mediaId = String(body.mediaId || '')
  const device = body.device === 'desktop' ? 'desktop' : 'mobile'
  const deleteMedia = body.deleteMedia !== false
  if (!backgroundId || !mediaId) return Response.json({ ok: false, message: 'Falta backgroundId o mediaId.' }, { status: 400 })

  try {
    const background = await payload.findByID({ collection: 'backgrounds', id: backgroundId, depth: 0, overrideAccess: true }) as any
    const field = device === 'desktop' ? 'desktopFrames' : 'mobileFrames'
    const next = (Array.isArray(background?.[field]) ? background[field] : []).filter((item: unknown) => idOf(item) !== mediaId)
    await payload.update({ collection: 'backgrounds', id: backgroundId, overrideAccess: true, data: { [field]: next } as any })

    let mediaDeleted = false
    let warning = ''
    if (deleteMedia) {
      try {
        const media = await payload.findByID({ collection: 'media', id: mediaId, depth: 0, overrideAccess: true }) as any
        const caption = String(media?.caption || '')
        const url = String(media?.url || '')
        if (caption.startsWith('Cloudinary · ')) {
          await destroyCloudinaryAsset(caption.replace('Cloudinary · ', '').trim()).catch(() => null)
        } else if (url.includes('/api/blob-frame/')) {
          const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN
          const pathname = decodeURIComponent(url.split('/api/blob-frame/')[1] || '')
          if (token && pathname) await del(pathname, { token }).catch(() => null)
        }
        const db = payload.db as any
        if (typeof db.deleteOne === 'function') {
          await db.deleteOne({ collection: 'media', id: mediaId })
          mediaDeleted = true
        } else {
          await payload.delete({ collection: 'media', id: mediaId, overrideAccess: true })
          mediaDeleted = true
        }
      } catch (error) {
        warning = error instanceof Error ? error.message : 'El frame fue desvinculado, pero el archivo no pudo eliminarse del catálogo.'
      }
    }

    return Response.json({ ok: true, mediaDeleted, warning, message: mediaDeleted ? 'Frame eliminado de la secuencia y de Multimedia.' : 'Frame eliminado de la secuencia.' })
  } catch (error) {
    return Response.json({ ok: false, message: error instanceof Error ? error.message : 'No fue posible eliminar el frame.' }, { status: 500 })
  }
}
