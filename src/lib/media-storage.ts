import {
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { del, get, list, put, rename } from '@vercel/blob'
import { createHash } from 'crypto'
import type { Payload } from 'payload'

import { getIntegration, listIntegrations, type IntegrationDocument } from '@/lib/integrations/service'

export const mediaSources = ['database', 'vercel-blob', 'cloudinary', 's3'] as const
export type MediaSource = (typeof mediaSources)[number]

export type ManagedAsset = {
  key: string
  url: string
  name: string
  size?: number
  uploadedAt?: string
  contentType?: string
  provider: Exclude<MediaSource, 'database'>
}

type Credentials = Record<string, string>
type StorageIntegration = IntegrationDocument & { provider: Exclude<MediaSource, 'database'> }
export type BlobVisibility = 'private' | 'public'

const db = (payload: Payload) => payload as any
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

function cleanFolder(value: unknown) {
  return String(value || 'general')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9/_-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .slice(0, 160) || 'general'
}

function cleanFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-160) || `archivo-${Date.now()}`
}

function blobVisibility(value?: unknown): BlobVisibility {
  return value === 'public' ? 'public' : 'private'
}

function isPublicAccessError(error: unknown) {
  return /public access on a private store/i.test(error instanceof Error ? error.message : String(error))
}

function isPrivateAccessError(error: unknown) {
  return /private access on a public store/i.test(error instanceof Error ? error.message : String(error))
}

async function putBlob(path: string, file: File, token: string, visibility?: BlobVisibility) {
  const access = blobVisibility(visibility)
  try {
    return await put(path, file, {
      access,
      addRandomSuffix: true,
      contentType: file.type || undefined,
      token,
    })
  } catch (error) {
    // Existing projects can have either store type. Retry once with the only
    // compatible mode, instead of returning a non-actionable 500 to Payload.
    if (access === 'public' && isPublicAccessError(error)) {
      return put(path, file, { access: 'private', addRandomSuffix: true, contentType: file.type || undefined, token })
    }
    if (access === 'private' && isPrivateAccessError(error)) {
      return put(path, file, { access: 'public', addRandomSuffix: true, contentType: file.type || undefined, token })
    }
    throw error
  }
}

async function getBlob(path: string, token: string, visibility?: BlobVisibility) {
  const access = blobVisibility(visibility)
  try {
    return await get(path, { access, token })
  } catch (error) {
    // Keep media created in projects with an older public Blob store readable
    // after the app moves to private-by-default storage.
    if (access === 'private' && isPrivateAccessError(error)) return get(path, { access: 'public', token })
    if (access === 'public' && isPublicAccessError(error)) return get(path, { access: 'private', token })
    throw error
  }
}

async function renameBlob(pathname: string, nextPathname: string, token: string, visibility?: BlobVisibility) {
  const access = blobVisibility(visibility)
  try {
    return await rename(pathname, nextPathname, { access, token })
  } catch (error) {
    if (access === 'private' && isPrivateAccessError(error)) return rename(pathname, nextPathname, { access: 'public', token })
    if (access === 'public' && isPublicAccessError(error)) return rename(pathname, nextPathname, { access: 'private', token })
    throw error
  }
}

function systemBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN
  if (!token) throw Object.assign(new Error('No hay un Blob del proyecto conectado. Agrega BLOB_READ_WRITE_TOKEN en Vercel o selecciona Cloudinary/S3.'), { status: 409 })
  return token
}

function requireCredential(credentials: Credentials, name: string) {
  const value = credentials[name]?.trim()
  if (!value) throw Object.assign(new Error(`Falta ${name} en la integración de almacenamiento.`), { status: 400 })
  return value
}

function status(error: unknown) {
  const candidate = Number((error as { status?: number })?.status || 500)
  return Number.isInteger(candidate) && candidate >= 400 ? candidate : 500
}

export function assertMediaSource(value: unknown): MediaSource {
  if (typeof value === 'string' && (mediaSources as readonly string[]).includes(value)) return value as MediaSource
  throw Object.assign(new Error('Origen multimedia no válido.'), { status: 400 })
}

async function integrationFor(
  payload: Payload,
  source: Exclude<MediaSource, 'database'>,
  integrationID?: string | number | null,
): Promise<{ document: StorageIntegration; credentials: Credentials }> {
  let id = integrationID
  if (!id) {
    const integrations = await listIntegrations(payload)
    const match = integrations.find((item) => item.provider === source && item.enabled !== false && item.status === 'connected') ||
      integrations.find((item) => item.provider === source && item.enabled !== false)
    id = match?.id
  }
  if (!id) {
    throw Object.assign(new Error(`Conecta ${source === 's3' ? 'Amazon S3' : source} desde Integraciones antes de usarlo.`), { status: 409 })
  }
  const result = await getIntegration(payload, id)
  if (result.document.provider !== source) {
    throw Object.assign(new Error('La integración seleccionada no corresponde a este origen.'), { status: 400 })
  }
  if (result.document.enabled === false) throw Object.assign(new Error('La integración está desactivada.'), { status: 409 })
  return { document: result.document as StorageIntegration, credentials: result.credentials }
}

function cloudinarySignature(params: Record<string, string>, apiSecret: string) {
  return createHash('sha1')
    .update(`${Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&')}${apiSecret}`)
    .digest('hex')
}

function s3Client(credentials: Credentials) {
  const endpoint = credentials.endpoint?.trim() || undefined
  return new S3Client({
    region: credentials.region || 'us-east-1',
    endpoint,
    forcePathStyle: Boolean(endpoint),
    credentials: {
      accessKeyId: requireCredential(credentials, 'accessKeyId'),
      secretAccessKey: requireCredential(credentials, 'secretAccessKey'),
    },
  })
}

function s3PublicURL(credentials: Credentials, key: string) {
  const base = credentials.publicBaseURL?.trim().replace(/\/+$/, '')
  if (base) return `${base}/${key.split('/').map(encodeURIComponent).join('/')}`
  const bucket = requireCredential(credentials, 'bucket')
  const endpoint = credentials.endpoint?.trim().replace(/\/+$/, '')
  if (endpoint) return `${endpoint}/${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`
  const region = credentials.region || 'us-east-1'
  return `https://${bucket}.s3.${region}.amazonaws.com/${key.split('/').map(encodeURIComponent).join('/')}`
}

export async function listRemoteAssets(
  payload: Payload,
  source: Exclude<MediaSource, 'database'>,
  args: { folder?: string; integrationID?: string | number | null },
): Promise<{ assets: ManagedAsset[]; integrationID: string | number }> {
  const { document, credentials } = await integrationFor(payload, source, args.integrationID)
  const folder = cleanFolder(args.folder)

  try {
    if (source === 'vercel-blob') {
      const result = await list({ prefix: `${folder}/`, limit: 100, token: requireCredential(credentials, 'token') })
      return {
        integrationID: document.id,
        assets: result.blobs.map((asset) => ({
          key: asset.pathname,
          url: asset.url,
          name: asset.pathname.split('/').pop() || asset.pathname,
          size: asset.size,
          uploadedAt: asset.uploadedAt.toISOString(),
          provider: source,
        })),
      }
    }

    if (source === 'cloudinary') {
      const cloudName = requireCredential(credentials, 'cloudName')
      const auth = Buffer.from(`${requireCredential(credentials, 'apiKey')}:${requireCredential(credentials, 'apiSecret')}`).toString('base64')
      const result = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image/upload?prefix=${encodeURIComponent(`${folder}/`)}&max_results=100`,
        { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' },
      )
      const data = await result.json().catch(() => null)
      if (!result.ok) throw new Error(String(data?.error?.message || `Cloudinary respondió HTTP ${result.status}`))
      return {
        integrationID: document.id,
        assets: (Array.isArray(data?.resources) ? data.resources : []).map((asset: any) => ({
          key: String(asset.public_id),
          url: String(asset.secure_url || asset.url),
          name: String(asset.public_id || '').split('/').pop() || 'archivo',
          size: Number(asset.bytes || 0),
          uploadedAt: asset.created_at,
          contentType: asset.format ? `image/${asset.format}` : undefined,
          provider: source,
        })),
      }
    }

    const client = s3Client(credentials)
    const result = await client.send(new ListObjectsV2Command({
      Bucket: requireCredential(credentials, 'bucket'),
      Prefix: `${folder}/`,
      MaxKeys: 100,
    }))
    return {
      integrationID: document.id,
      assets: (result.Contents || []).filter((asset) => asset.Key).map((asset) => ({
        key: asset.Key as string,
        url: s3PublicURL(credentials, asset.Key as string),
        name: String(asset.Key).split('/').pop() || String(asset.Key),
        size: asset.Size,
        uploadedAt: asset.LastModified?.toISOString(),
        provider: source,
      })),
    }
  } catch (error) {
    throw Object.assign(new Error(error instanceof Error ? error.message : 'No se pudo leer el proveedor multimedia.'), { status: status(error) })
  }
}

async function createMediaRecord(payload: Payload, input: {
  asset: ManagedAsset
  folder: string
  alt?: string
  category?: string
  integrationID?: string | number | null
  visibility?: BlobVisibility
}) {
  const media = await db(payload).create({
    collection: 'media',
    depth: 0,
    overrideAccess: true,
    data: {
      alt: input.alt?.trim() || input.asset.name.replace(/[-_.]+/g, ' ').replace(/\.[a-z0-9]+$/i, ''),
      category: input.category || 'otro',
      storageProvider: input.asset.provider,
      externalURL: input.asset.url,
      storageKey: input.asset.key,
      storageFolder: input.folder,
      storageIntegrationID: input.integrationID ? String(input.integrationID) : undefined,
      storageVisibility: input.visibility || 'public',
      filename: input.asset.name,
      mimeType: input.asset.contentType || undefined,
      filesize: input.asset.size || undefined,
    },
  })
  if (input.visibility === 'private') {
    return db(payload).update({
      collection: 'media',
      id: media.id,
      depth: 0,
      overrideAccess: true,
      data: { externalURL: `/api/media-file/${media.id}` },
    })
  }
  return media
}

export async function uploadManagedAsset(payload: Payload, args: {
  source: Exclude<MediaSource, 'database'>
  integrationID?: string | number | null
  folder?: string
  file: File
  alt?: string
  category?: string
}) {
  if (args.file.size > MAX_UPLOAD_BYTES) throw Object.assign(new Error('El archivo supera el límite de 25 MB.'), { status: 413 })
  if (!args.file.type.startsWith('image/') && args.file.type !== 'video/mp4' && args.file.type !== 'application/pdf') {
    throw Object.assign(new Error('Solo se permiten imágenes, PDF o video MP4.'), { status: 415 })
  }
  const { document, credentials } = await integrationFor(payload, args.source, args.integrationID)
  const folder = cleanFolder(args.folder)
  const fileName = cleanFileName(args.file.name)
  const path = `${folder}/${Date.now()}-${fileName}`
  let asset: ManagedAsset

  if (args.source === 'vercel-blob') {
    const result = await putBlob(path, args.file, requireCredential(credentials, 'token'))
    asset = { key: result.pathname, url: result.url, name: fileName, size: args.file.size, contentType: args.file.type, provider: args.source }
  } else if (args.source === 'cloudinary') {
    const timestamp = String(Math.floor(Date.now() / 1000))
    const params = { folder, timestamp }
    const form = new FormData()
    form.append('file', args.file)
    form.append('folder', folder)
    form.append('timestamp', timestamp)
    form.append('api_key', requireCredential(credentials, 'apiKey'))
    form.append('signature', cloudinarySignature(params, requireCredential(credentials, 'apiSecret')))
    const cloudName = requireCredential(credentials, 'cloudName')
    const result = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/auto/upload`, { method: 'POST', body: form })
    const data = await result.json().catch(() => null)
    if (!result.ok || !data?.secure_url || !data?.public_id) throw Object.assign(new Error(String(data?.error?.message || 'Cloudinary no confirmó la subida.')), { status: 502 })
    asset = { key: data.public_id, url: data.secure_url, name: fileName, size: data.bytes || args.file.size, contentType: args.file.type, uploadedAt: data.created_at, provider: args.source }
  } else {
    const client = s3Client(credentials)
    await client.send(new PutObjectCommand({
      Bucket: requireCredential(credentials, 'bucket'),
      Key: path,
      Body: Buffer.from(await args.file.arrayBuffer()),
      ContentType: args.file.type || undefined,
      CacheControl: 'public, max-age=31536000, immutable',
    }))
    asset = { key: path, url: s3PublicURL(credentials, path), name: fileName, size: args.file.size, contentType: args.file.type, provider: args.source }
  }

  const media = await createMediaRecord(payload, {
    asset,
    folder,
    alt: args.alt,
    category: args.category,
    integrationID: document.id,
    visibility: args.source === 'vercel-blob' ? 'private' : 'public',
  })
  return { asset, media, integrationID: document.id }
}

/** Store an application upload in the project Blob without exposing its token.
 * This powers Payload's normal /api/media endpoint and its folder uploader. */
export async function uploadSystemMedia(payload: Payload, args: {
  folder?: string
  file: File
  alt?: string
  category?: string
  device?: string
  frameOrder?: number
  collectionKey?: string
}) {
  if (args.file.size > MAX_UPLOAD_BYTES) throw Object.assign(new Error('El archivo supera el límite de 25 MB.'), { status: 413 })
  if (!args.file.type.startsWith('image/') && args.file.type !== 'video/mp4' && args.file.type !== 'application/pdf') {
    throw Object.assign(new Error('Solo se permiten imágenes, PDF o video MP4.'), { status: 415 })
  }
  const folder = cleanFolder(args.folder)
  const name = cleanFileName(args.file.name)
  const result = await putBlob(`${folder}/${Date.now()}-${name}`, args.file, systemBlobToken())
  const asset: ManagedAsset = {
    key: result.pathname,
    url: result.url,
    name,
    size: args.file.size,
    contentType: args.file.type,
    provider: 'vercel-blob',
  }
  const media = await createMediaRecord(payload, {
    asset,
    folder,
    alt: args.alt,
    category: args.category,
    visibility: 'private',
  })
  const enriched = await db(payload).update({
    collection: 'media',
    id: media.id,
    depth: 0,
    overrideAccess: true,
    data: {
      device: args.device || 'universal',
      frameOrder: args.frameOrder,
      collectionKey: args.collectionKey,
    },
  })
  return { asset, media: enriched }
}

export async function readPrivateBlob(payload: Payload, mediaID: string | number) {
  const media = await db(payload).findByID({ collection: 'media', id: mediaID, depth: 0, overrideAccess: true })
  if (media.storageProvider !== 'vercel-blob' || !media.storageKey) {
    throw Object.assign(new Error('Este archivo no usa el almacenamiento Blob administrado.'), { status: 404 })
  }
  let token: string
  if (media.storageIntegrationID) {
    const integration = await integrationFor(payload, 'vercel-blob', media.storageIntegrationID)
    token = requireCredential(integration.credentials, 'token')
  } else {
    token = systemBlobToken()
  }
  const result = await getBlob(media.storageKey, token, media.storageVisibility)
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw Object.assign(new Error('El archivo ya no existe en el Blob.'), { status: 404 })
  }
  return { media, result }
}

export async function removeManagedAsset(payload: Payload, args: {
  source: Exclude<MediaSource, 'database'>
  integrationID?: string | number | null
  key: string
  mediaID?: string | number | null
}) {
  const { credentials } = await integrationFor(payload, args.source, args.integrationID)
  if (args.source === 'vercel-blob') {
    await del(args.key, { token: requireCredential(credentials, 'token') })
  } else if (args.source === 'cloudinary') {
    const timestamp = String(Math.floor(Date.now() / 1000))
    const signature = cloudinarySignature({ public_id: args.key, timestamp }, requireCredential(credentials, 'apiSecret'))
    const form = new FormData()
    form.append('public_id', args.key)
    form.append('timestamp', timestamp)
    form.append('api_key', requireCredential(credentials, 'apiKey'))
    form.append('signature', signature)
    const result = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(requireCredential(credentials, 'cloudName'))}/image/destroy`, { method: 'POST', body: form })
    if (!result.ok) throw Object.assign(new Error('Cloudinary no pudo eliminar el archivo.'), { status: 502 })
  } else {
    await s3Client(credentials).send(new DeleteObjectCommand({ Bucket: requireCredential(credentials, 'bucket'), Key: args.key }))
  }
  if (args.mediaID) await db(payload).delete({ collection: 'media', id: args.mediaID, overrideAccess: true })
}

export async function moveManagedAsset(payload: Payload, args: {
  source: Exclude<MediaSource, 'database'>
  integrationID?: string | number | null
  key: string
  folder: string
  mediaID?: string | number | null
}) {
  const { credentials } = await integrationFor(payload, args.source, args.integrationID)
  const folder = cleanFolder(args.folder)
  const nextKey = `${folder}/${cleanFileName(args.key.split('/').pop() || 'archivo')}`
  let url = ''
  if (args.source === 'vercel-blob') {
    const result = await renameBlob(args.key, nextKey, requireCredential(credentials, 'token'), 'private')
    url = result.url
  } else if (args.source === 'cloudinary') {
    const timestamp = String(Math.floor(Date.now() / 1000))
    const signature = cloudinarySignature({ from_public_id: args.key, timestamp, to_public_id: nextKey }, requireCredential(credentials, 'apiSecret'))
    const form = new FormData()
    form.append('from_public_id', args.key)
    form.append('to_public_id', nextKey)
    form.append('timestamp', timestamp)
    form.append('api_key', requireCredential(credentials, 'apiKey'))
    form.append('signature', signature)
    const result = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(requireCredential(credentials, 'cloudName'))}/image/rename`, { method: 'POST', body: form })
    const data = await result.json().catch(() => null)
    if (!result.ok || !data?.secure_url) throw Object.assign(new Error(String(data?.error?.message || 'Cloudinary no pudo mover el archivo.')), { status: 502 })
    url = data.secure_url
  } else {
    const client = s3Client(credentials)
    const bucket = requireCredential(credentials, 'bucket')
    await client.send(new CopyObjectCommand({ Bucket: bucket, Key: nextKey, CopySource: `${encodeURIComponent(bucket)}/${args.key.split('/').map(encodeURIComponent).join('/')}` }))
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: args.key }))
    url = s3PublicURL(credentials, nextKey)
  }
  if (args.mediaID) {
    await db(payload).update({
      collection: 'media',
      id: args.mediaID,
      overrideAccess: true,
      data: { storageKey: nextKey, storageFolder: folder, externalURL: args.source === 'vercel-blob' ? `/api/media-file/${args.mediaID}` : url },
    })
  }
  return { key: nextKey, url, folder }
}

export async function listDatabaseMedia(payload: Payload, folder?: string) {
  const clean = folder ? cleanFolder(folder) : ''
  const result = await db(payload).find({
    collection: 'media',
    depth: 0,
    limit: 120,
    sort: '-updatedAt',
    overrideAccess: true,
    ...(clean ? { where: { storageFolder: { equals: clean } } } : {}),
  })
  return result.docs || []
}

export async function moveDatabaseMedia(payload: Payload, id: string | number, folder: string) {
  const media = await db(payload).findByID({ collection: 'media', id, depth: 0, overrideAccess: true })
  const nextFolder = cleanFolder(folder)
  if (media.storageProvider === 'vercel-blob' && media.storageKey) {
    let token: string
    if (media.storageIntegrationID) {
      const integration = await integrationFor(payload, 'vercel-blob', media.storageIntegrationID)
      token = requireCredential(integration.credentials, 'token')
    } else {
      token = systemBlobToken()
    }
    const nextKey = `${nextFolder}/${cleanFileName(String(media.storageKey).split('/').pop() || 'archivo')}`
    await renameBlob(String(media.storageKey), nextKey, token, media.storageVisibility)
    return db(payload).update({
      collection: 'media',
      id,
      overrideAccess: true,
      data: {
        storageKey: nextKey,
        storageFolder: nextFolder,
        externalURL: media.storageVisibility === 'private' ? `/api/media-file/${id}` : media.externalURL,
      },
    })
  }
  return db(payload).update({ collection: 'media', id, data: { storageFolder: nextFolder }, overrideAccess: true })
}

export async function removeDatabaseMedia(payload: Payload, id: string | number) {
  const media = await db(payload).findByID({ collection: 'media', id, depth: 0, overrideAccess: true })
  if (media.storageProvider === 'vercel-blob' && media.storageKey) {
    let token: string
    if (media.storageIntegrationID) {
      const integration = await integrationFor(payload, 'vercel-blob', media.storageIntegrationID)
      token = requireCredential(integration.credentials, 'token')
    } else {
      token = systemBlobToken()
    }
    await del(String(media.storageKey), { token })
  }
  await db(payload).delete({ collection: 'media', id, overrideAccess: true })
}
