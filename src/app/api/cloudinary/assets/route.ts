import { cloudinaryAdmin, destroyCloudinaryAsset } from '@/lib/cloudinary'
import config from '@payload-config'
import { getPayload } from 'payload'

export const runtime = 'nodejs'
export const maxDuration = 60

async function requireAdmin(request: Request) {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: request.headers })
  if (!auth.user || auth.user.role !== 'admin') return null
  return payload
}

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return Response.json({ ok: false, message: 'No autorizado.' }, { status: 403 })
  const url = new URL(request.url)
  const prefix = String(url.searchParams.get('prefix') || '').replace(/^\/+|\/+$/g, '')
  try {
    const folderPath = prefix ? `/folders/${encodeURIComponent(prefix)}` : '/folders'
    const resourcePath = `/resources/image?max_results=100${prefix ? `&prefix=${encodeURIComponent(prefix + '/')}` : ''}`
    const [folders, resources] = await Promise.all([
      cloudinaryAdmin(folderPath).catch(() => ({ folders: [] })),
      cloudinaryAdmin(resourcePath),
    ])
    return Response.json({ ok: true, prefix, folders: folders?.folders || [], resources: resources?.resources || [], nextCursor: resources?.next_cursor || null })
  } catch (error) {
    return Response.json({ ok: false, message: error instanceof Error ? error.message : 'No fue posible consultar Cloudinary.' }, { status: 502 })
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return Response.json({ ok: false, message: 'No autorizado.' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as any
  const action = String(body.action || '')
  try {
    if (action === 'create-folder') {
      const folder = String(body.folder || '').replace(/^\/+|\/+$/g, '')
      if (!folder) return Response.json({ ok: false, message: 'Escribe el nombre de la carpeta.' }, { status: 400 })
      const result = await cloudinaryAdmin(`/folders/${folder.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST' })
      return Response.json({ ok: true, result })
    }
    if (action === 'delete-asset') {
      const publicID = String(body.publicID || '')
      if (!publicID) return Response.json({ ok: false, message: 'Falta publicID.' }, { status: 400 })
      const result = await destroyCloudinaryAsset(publicID)
      return Response.json({ ok: true, result })
    }
    if (action === 'delete-folder') {
      const folder = String(body.folder || '').replace(/^\/+|\/+$/g, '')
      if (!folder) return Response.json({ ok: false, message: 'Falta la carpeta.' }, { status: 400 })
      const result = await cloudinaryAdmin(`/folders/${folder.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE' })
      return Response.json({ ok: true, result })
    }
    return Response.json({ ok: false, message: 'Acción no válida.' }, { status: 400 })
  } catch (error) {
    return Response.json({ ok: false, message: error instanceof Error ? error.message : 'Cloudinary rechazó la operación.' }, { status: 502 })
  }
}
