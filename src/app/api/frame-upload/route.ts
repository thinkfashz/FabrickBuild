import { del, put } from '@vercel/blob'
import config from '@payload-config'
import { getPayload } from 'payload'
import { destroyCloudinaryAsset, uploadCloudinaryImage } from '@/lib/cloudinary'

export const runtime = 'nodejs'
export const maxDuration = 60

type FrameMetadata = {
  alt?: string
  category?: 'frame'
  device?: 'desktop' | 'mobile'
  frameOrder?: number
  collectionKey?: string
  caption?: string
  folder?: string
  provider?: 'blob' | 'cloudinary'
}

type ExternalMediaRecord = {
  alt: string
  category: 'frame'
  device: 'desktop' | 'mobile'
  frameOrder: number
  collectionKey: string
  caption: string
  filename: string
  mimeType: string
  filesize: number
  prefix: string
  url: string
  width?: number
  height?: number
}

const safeSegment = (value: unknown, fallback: string) =>
  String(value || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || fallback

const errorJSON = (status: number, code: string, message: string, detail?: string, stage?: string) =>
  Response.json({ ok: false, code, message, detail, stage }, { status })

/**
 * Guarda solamente los metadatos del archivo ya almacenado.
 *
 * No usa payload.create porque `media` es una upload collection y el plugin
 * @payloadcms/storage-vercel-blob intentaría subir nuevamente el archivo con
 * acceso público. El adaptador de base de datos evita los hooks de upload y
 * conserva el documento compatible con relaciones, REST y el editor.
 */
async function registerExternalMedia(payload: Awaited<ReturnType<typeof getPayload>>, record: ExternalMediaRecord) {
  const now = new Date().toISOString()
  const database = payload.db as any

  if (typeof database?.create !== 'function') {
    throw new Error('El adaptador de base de datos no expone la operación create requerida para registrar el frame.')
  }

  const doc = await database.create({
    collection: 'media',
    data: {
      ...record,
      createdAt: now,
      updatedAt: now,
    },
  })

  if (!doc?.id) {
    throw new Error('PostgreSQL no devolvió el ID del registro multimedia.')
  }

  return doc
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: request.headers })
  if (!auth.user) return errorJSON(401, 'AUTH_REQUIRED', 'La sesión del administrador expiró. Vuelve a iniciar sesión.', undefined, 'authentication')

  let form: FormData
  try {
    form = await request.formData()
  } catch (error) {
    return errorJSON(400, 'INVALID_FORM_DATA', 'No fue posible leer el archivo enviado.', error instanceof Error ? error.message : undefined, 'request')
  }

  const file = form.get('file')
  if (!(file instanceof File)) return errorJSON(400, 'FILE_REQUIRED', 'No se recibió ningún frame.', undefined, 'validation')
  if (!file.type.startsWith('image/')) return errorJSON(415, 'INVALID_FILE_TYPE', `El archivo ${file.name} no es una imagen compatible.`, undefined, 'validation')
  if (file.size > 15 * 1024 * 1024) return errorJSON(413, 'FRAME_TOO_LARGE', `${file.name} supera el máximo de 15 MB.`, undefined, 'validation')

  let metadata: FrameMetadata = {}
  try {
    metadata = JSON.parse(String(form.get('metadata') || '{}')) as FrameMetadata
  } catch {
    return errorJSON(400, 'INVALID_METADATA', 'Los datos de organización del frame no son válidos.', undefined, 'validation')
  }

  const provider = metadata.provider === 'cloudinary' ? 'cloudinary' : 'blob'
  const collectionKey = safeSegment(metadata.collectionKey, 'secuencia')
  const device = metadata.device === 'desktop' ? 'desktop' : 'mobile'
  const frameOrder = Math.max(1, Number(metadata.frameOrder) || 1)
  const extension = safeSegment(file.name.split('.').pop(), 'webp')
  const baseName = safeSegment(file.name.replace(/\.[^.]+$/, ''), `frame-${frameOrder}`)
  const uniqueName = `${baseName}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`

  if (provider === 'cloudinary') {
    let publicID = ''
    try {
      const folder = `frames/${collectionKey}/${device}`
      const asset = await uploadCloudinaryImage(file, folder, uniqueName)
      publicID = asset.public_id
      const filename = `${publicID.split('/').pop() || uniqueName}.${asset.format || extension}`
      const prefix = publicID.includes('/') ? publicID.slice(0, publicID.lastIndexOf('/')) : ''

      const doc = await registerExternalMedia(payload, {
        alt: metadata.alt || `${baseName} — ${collectionKey}`,
        category: 'frame',
        device,
        frameOrder,
        collectionKey,
        caption: `Cloudinary · ${publicID}`,
        filename,
        mimeType: file.type || `image/${asset.format || 'webp'}`,
        filesize: asset.bytes || file.size,
        width: asset.width,
        height: asset.height,
        prefix,
        url: asset.secure_url,
      })

      return Response.json({
        ok: true,
        doc,
        storage: { provider: 'cloudinary', publicID, url: asset.secure_url, folder },
      })
    } catch (error) {
      if (publicID) await destroyCloudinaryAsset(publicID).catch(() => null)
      const message = error instanceof Error ? error.message : 'Error desconocido al guardar en Cloudinary.'
      const databaseFailure = /postgres|database|adaptador|registro|id/i.test(message)
      const code = databaseFailure ? 'MEDIA_CATALOG_WRITE_FAILED' : 'CLOUDINARY_UPLOAD_FAILED'
      const stage = databaseFailure ? 'catalog' : 'provider-upload'
      console.error('[frame-upload:cloudinary]', { code, stage, filename: file.name, publicID, message })
      return errorJSON(
        500,
        code,
        message,
        databaseFailure
          ? 'Cloudinary recibió el archivo, pero el registro multimedia falló y el recurso fue eliminado automáticamente.'
          : 'Cloudinary rechazó el archivo antes de registrarlo en Multimedia.',
        stage,
      )
    }
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN
  if (!token) return errorJSON(503, 'BLOB_TOKEN_MISSING', 'BLOB_READ_WRITE_TOKEN no está configurado en este deployment.', undefined, 'configuration')

  const folder = `fabrickbuild/frames/${collectionKey}/${device}`
  const filenameWithExtension = `${uniqueName}.${extension}`
  const pathname = `${folder}/${filenameWithExtension}`
  let blob: Awaited<ReturnType<typeof put>> | null = null

  try {
    blob = await put(pathname, file, {
      access: 'private',
      token,
      addRandomSuffix: false,
      cacheControlMaxAge: 31_536_000,
      contentType: file.type || 'image/webp',
    })

    const proxyURL = `/api/blob-frame/${blob.pathname.split('/').map(encodeURIComponent).join('/')}`
    const filename = blob.pathname.split('/').pop() || filenameWithExtension
    const prefix = blob.pathname.slice(0, -(filename.length + 1))

    const doc = await registerExternalMedia(payload, {
      alt: metadata.alt || `${baseName} — ${collectionKey}`,
      category: 'frame',
      device,
      frameOrder,
      collectionKey,
      caption: `Vercel Blob privado · ${folder}`,
      filename,
      mimeType: file.type || 'image/webp',
      filesize: file.size,
      prefix,
      url: proxyURL,
    })

    return Response.json({
      ok: true,
      doc,
      storage: { provider: 'blob', pathname: blob.pathname, url: proxyURL, access: 'private' },
    })
  } catch (error) {
    if (blob) await del(blob.url, { token }).catch(() => null)
    const message = error instanceof Error ? error.message : 'Error desconocido al guardar el frame.'
    const databaseFailure = /postgres|database|adaptador|registro|id/i.test(message)
    const code = databaseFailure ? 'MEDIA_CATALOG_WRITE_FAILED' : 'PRIVATE_BLOB_UPLOAD_FAILED'
    const stage = databaseFailure ? 'catalog' : 'provider-upload'
    console.error('[frame-upload:blob]', { code, stage, filename: file.name, pathname, message })
    return errorJSON(
      500,
      code,
      message,
      databaseFailure
        ? 'Blob recibió el archivo, pero el registro multimedia falló y el recurso fue eliminado automáticamente.'
        : 'Vercel Blob privado rechazó el archivo antes de registrarlo en Multimedia.',
      stage,
    )
  }
}
