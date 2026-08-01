import { del, put } from '@vercel/blob'
import config from '@payload-config'
import { getPayload } from 'payload'

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

const errorJSON = (status: number, code: string, message: string, detail?: string) =>
  Response.json({ ok: false, code, message, detail }, { status })

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: request.headers })

  if (!auth.user) {
    return errorJSON(401, 'AUTH_REQUIRED', 'La sesión del administrador expiró. Vuelve a iniciar sesión.')
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN
  if (!token) {
    return errorJSON(503, 'BLOB_TOKEN_MISSING', 'BLOB_READ_WRITE_TOKEN no está configurado en este deployment.')
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch (error) {
    return errorJSON(400, 'INVALID_FORM_DATA', 'No fue posible leer el archivo enviado.', error instanceof Error ? error.message : undefined)
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return errorJSON(400, 'FILE_REQUIRED', 'No se recibió ningún frame.')
  }
  if (!file.type.startsWith('image/')) {
    return errorJSON(415, 'INVALID_FILE_TYPE', `El archivo ${file.name} no es una imagen compatible.`)
  }
  if (file.size > 15 * 1024 * 1024) {
    return errorJSON(413, 'FRAME_TOO_LARGE', `${file.name} supera el máximo de 15 MB.`)
  }

  let metadata: FrameMetadata = {}
  try {
    metadata = JSON.parse(String(form.get('metadata') || '{}')) as FrameMetadata
  } catch {
    return errorJSON(400, 'INVALID_METADATA', 'Los datos de organización del frame no son válidos.')
  }

  const collectionKey = safeSegment(metadata.collectionKey, 'secuencia')
  const device = metadata.device === 'desktop' ? 'desktop' : 'mobile'
  const folder = `fabrickbuild/frames/${collectionKey}/${device}`
  const frameOrder = Math.max(1, Number(metadata.frameOrder) || 1)
  const extension = safeSegment(file.name.split('.').pop(), 'webp')
  const baseName = safeSegment(file.name.replace(/\.[^.]+$/, ''), `frame-${frameOrder}`)
  const uniqueName = `${baseName}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`
  const pathname = `${folder}/${uniqueName}`

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
    const filename = blob.pathname.split('/').pop() || uniqueName
    const prefix = blob.pathname.slice(0, -(filename.length + 1))

    const doc = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: {
        alt: metadata.alt || `${baseName} — ${collectionKey}`,
        category: 'frame',
        device,
        frameOrder,
        collectionKey,
        caption: metadata.caption || `Blob privado: ${folder}`,
        filename,
        mimeType: file.type || 'image/webp',
        filesize: file.size,
        prefix,
        url: proxyURL,
      } as any,
    })

    return Response.json({
      ok: true,
      doc,
      storage: { pathname: blob.pathname, url: proxyURL, access: 'private' },
    })
  } catch (error) {
    if (blob) {
      try {
        await del(blob.url, { token })
      } catch {
        // The orphan cleanup must not hide the original failure.
      }
    }

    const message = error instanceof Error ? error.message : 'Error desconocido al guardar el frame.'
    const lower = message.toLowerCase()
    const code = lower.includes('postgres') || lower.includes('connection') || lower.includes('timeout')
      ? 'DATABASE_WRITE_FAILED'
      : lower.includes('blob') || lower.includes('access') || lower.includes('private')
        ? 'PRIVATE_BLOB_UPLOAD_FAILED'
        : 'FRAME_UPLOAD_FAILED'

    console.error('[frame-upload]', { code, filename: file.name, pathname, message })
    return errorJSON(500, code, message, 'El Blob se elimina automáticamente cuando falla el registro en Multimedia.')
  }
}
