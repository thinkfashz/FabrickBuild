import crypto from 'node:crypto'
import { cloudinaryAdmin, destroyCloudinaryAsset, getCloudinaryCredentials, uploadCloudinaryImage } from '@/lib/cloudinary'
import config from '@payload-config'
import { getPayload } from 'payload'

export const runtime = 'nodejs'
export const maxDuration = 60

async function requireAdmin(request: Request) {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: request.headers })
  if (!auth.user) return null
  if (auth.user.role && auth.user.role !== 'admin') return null
  return payload
}

const cleanPath = (value: unknown) => String(value || '').replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/')
const safeName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || `asset-${Date.now()}`

async function renameAsset(fromPublicID: string, toPublicID: string) {
  const credentials = await getCloudinaryCredentials()
  const timestamp = Math.floor(Date.now() / 1000)
  const params = `from_public_id=${fromPublicID}&overwrite=false&timestamp=${timestamp}&to_public_id=${toPublicID}`
  const signature = crypto.createHash('sha1').update(`${params}${credentials.apiSecret}`).digest('hex')
  const body = new URLSearchParams({ from_public_id: fromPublicID, to_public_id: toPublicID, overwrite: 'false', timestamp: String(timestamp), api_key: credentials.apiKey, signature })
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(credentials.cloudName)}/image/rename`, { method: 'POST', body })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(json?.error?.message || `Cloudinary rename HTTP ${response.status}`)
  return json
}

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return Response.json({ ok: false, message: 'No autorizado.' }, { status: 403 })
  const url = new URL(request.url)
  const prefix = cleanPath(url.searchParams.get('prefix'))
  const cursor = cleanPath(url.searchParams.get('cursor'))
  const requestedLimit = Number(url.searchParams.get('limit') || 24)
  const limit = Math.min(36, Math.max(8, Number.isFinite(requestedLimit) ? requestedLimit : 24))

  try {
    const folderPath = prefix ? `/folders/${prefix.split('/').map(encodeURIComponent).join('/')}` : '/folders'
    const query = new URLSearchParams({ max_results: String(limit) })
    if (prefix) query.set('prefix', `${prefix}/`)
    if (cursor) query.set('next_cursor', cursor)

    const [folders, resources] = await Promise.all([
      cloudinaryAdmin(folderPath).catch(() => ({ folders: [] })),
      cloudinaryAdmin(`/resources/image?${query.toString()}`),
    ])

    return Response.json({
      ok: true,
      prefix,
      folders: folders?.folders || [],
      resources: resources?.resources || [],
      nextCursor: resources?.next_cursor || null,
      limit,
    })
  } catch (error) {
    return Response.json({ ok: false, message: error instanceof Error ? error.message : 'No fue posible consultar Cloudinary.' }, { status: 502 })
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return Response.json({ ok: false, message: 'No autorizado.' }, { status: 403 })

  try {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('file')
      if (!(file instanceof File) || !file.type.startsWith('image/')) return Response.json({ ok: false, message: 'Selecciona una imagen válida.' }, { status: 400 })
      if (file.size > 20 * 1024 * 1024) return Response.json({ ok: false, message: `${file.name} supera 20 MB.` }, { status: 413 })
      const credentials = await getCloudinaryCredentials()
      const requestedFolder = cleanPath(form.get('folder'))
      const root = cleanPath(credentials.rootFolder)
      const relativeFolder = requestedFolder === root ? '' : requestedFolder.startsWith(`${root}/`) ? requestedFolder.slice(root.length + 1) : requestedFolder
      const asset = await uploadCloudinaryImage(file, relativeFolder, `${safeName(file.name)}-${Date.now()}`)
      return Response.json({ ok: true, asset })
    }

    const body = await request.json().catch(() => ({})) as any
    const action = String(body.action || '')

    if (action === 'create-folder') {
      const folder = cleanPath(body.folder)
      if (!folder) return Response.json({ ok: false, message: 'Escribe el nombre de la carpeta.' }, { status: 400 })
      return Response.json({ ok: true, result: await cloudinaryAdmin(`/folders/${folder.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST' }) })
    }

    if (action === 'delete-asset') {
      const publicID = cleanPath(body.publicID)
      if (!publicID) return Response.json({ ok: false, message: 'Falta publicID.' }, { status: 400 })
      return Response.json({ ok: true, result: await destroyCloudinaryAsset(publicID) })
    }

    if (action === 'rename-asset') {
      const publicID = cleanPath(body.publicID)
      const toPublicID = cleanPath(body.toPublicID)
      if (!publicID || !toPublicID) return Response.json({ ok: false, message: 'Falta el origen o el nuevo nombre.' }, { status: 400 })
      if (publicID === toPublicID) return Response.json({ ok: true, result: { public_id: publicID } })
      return Response.json({ ok: true, result: await renameAsset(publicID, toPublicID) })
    }

    if (action === 'delete-folder') {
      const folder = cleanPath(body.folder)
      if (!folder) return Response.json({ ok: false, message: 'Falta la carpeta.' }, { status: 400 })
      const contents = await cloudinaryAdmin(`/resources/image?max_results=1&prefix=${encodeURIComponent(folder + '/')}`).catch(() => ({ resources: [] }))
      if (contents?.resources?.length) return Response.json({ ok: false, message: 'La carpeta contiene imágenes. Elimina o mueve sus recursos antes de borrarla.' }, { status: 409 })
      return Response.json({ ok: true, result: await cloudinaryAdmin(`/folders/${folder.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE' }) })
    }

    return Response.json({ ok: false, message: 'Acción no válida.' }, { status: 400 })
  } catch (error) {
    return Response.json({ ok: false, message: error instanceof Error ? error.message : 'Cloudinary rechazó la operación.' }, { status: 502 })
  }
}
