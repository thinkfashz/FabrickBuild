import crypto from 'node:crypto'
import config from '@payload-config'
import { getPayload } from 'payload'

type CloudinaryCredentials = {
  cloudName: string
  apiKey: string
  apiSecret: string
  rootFolder?: string
}

const PROVIDER = 'cloudinary'

const encryptionKey = () =>
  crypto.createHash('sha256').update(process.env.INTEGRATIONS_ENCRYPTION_KEY || process.env.PAYLOAD_SECRET || 'fabrickbuild-development-secret-change-in-production').digest()

export function encryptCloudinaryCredentials(value: CloudinaryCredentials) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return {
    encryptedCredentials: encrypted.toString('base64'),
    credentialIV: iv.toString('base64'),
    credentialTag: cipher.getAuthTag().toString('base64'),
    credentialBinding: PROVIDER,
    credentialFingerprint: crypto.createHash('sha256').update(`${value.cloudName}:${value.apiKey}`).digest('hex').slice(0, 16),
    credentialHint: `${value.cloudName} · ${value.apiKey.slice(0, 4)}••••${value.apiKey.slice(-4)}`,
  }
}

export function decryptCloudinaryCredentials(doc: any): CloudinaryCredentials {
  if (!doc?.encryptedCredentials || !doc?.credentialIV || !doc?.credentialTag) throw new Error('Cloudinary no tiene credenciales guardadas en esta base de datos.')
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(doc.credentialIV, 'base64'))
  decipher.setAuthTag(Buffer.from(doc.credentialTag, 'base64'))
  const clear = Buffer.concat([decipher.update(Buffer.from(doc.encryptedCredentials, 'base64')), decipher.final()]).toString('utf8')
  return JSON.parse(clear) as CloudinaryCredentials
}

export async function getCloudinaryIntegration() {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'integrations',
    depth: 0,
    limit: 20,
    sort: '-updatedAt',
    overrideAccess: true,
    where: { provider: { equals: PROVIDER } },
  })
  const docs = (result.docs || []) as any[]
  const doc = docs.find((item) => item?.enabled && item?.encryptedCredentials)
    || docs.find((item) => item?.encryptedCredentials)
    || docs[0]
  return { payload, doc, duplicates: Math.max(0, docs.length - 1) }
}

const basicAuth = (credentials: CloudinaryCredentials) => `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64')}`

export async function testCloudinary(credentials: CloudinaryCredentials) {
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(credentials.cloudName)}/resources/image?max_results=1`, { headers: { Authorization: basicAuth(credentials) }, cache: 'no-store' })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(json?.error?.message || `Cloudinary respondió HTTP ${response.status}`)
  return { ok: true, total: Number(json?.total_count || 0), cloudName: credentials.cloudName }
}

export async function getCloudinaryCredentials() {
  const { payload, doc } = await getCloudinaryIntegration()
  const credentials = decryptCloudinaryCredentials(doc)

  if (!doc?.enabled || doc?.status !== 'connected') {
    try {
      await testCloudinary(credentials)
      if (doc?.id) {
        await payload.update({
          collection: 'integrations',
          id: doc.id,
          overrideAccess: true,
          data: {
            enabled: true,
            status: 'connected',
            lastConnectedAt: new Date().toISOString(),
            lastTestedAt: new Date().toISOString(),
            lastError: null,
          } as any,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Las credenciales guardadas no son válidas.'
      throw new Error(`Cloudinary está guardado pero no pudo reactivarse: ${message}`)
    }
  }

  return credentials
}

export function cloudinaryEnvironmentInfo() {
  const database = process.env.PAYLOAD_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || 'local'
  let databaseTarget = 'local'
  try {
    const parsed = new URL(database)
    databaseTarget = `${parsed.hostname}/${parsed.pathname.replace(/^\//, '') || 'database'}`
  } catch {}
  return {
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'local',
    deployment: process.env.VERCEL_URL || 'local',
    databaseFingerprint: crypto.createHash('sha256').update(databaseTarget).digest('hex').slice(0, 10),
  }
}

export async function uploadCloudinaryImage(file: File, folder: string, publicID: string) {
  const credentials = await getCloudinaryCredentials()
  const timestamp = Math.floor(Date.now() / 1000)
  const normalizedFolder = [credentials.rootFolder, folder].filter(Boolean).join('/').replace(/^\/+|\/+$/g, '')
  const signatureBase = `folder=${normalizedFolder}&overwrite=false&public_id=${publicID}&timestamp=${timestamp}${credentials.apiSecret}`
  const signature = crypto.createHash('sha1').update(signatureBase).digest('hex')
  const body = new FormData()
  body.append('file', file)
  body.append('api_key', credentials.apiKey)
  body.append('timestamp', String(timestamp))
  body.append('signature', signature)
  body.append('folder', normalizedFolder)
  body.append('public_id', publicID)
  body.append('overwrite', 'false')
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(credentials.cloudName)}/image/upload`, { method: 'POST', body })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(json?.error?.message || `Cloudinary upload HTTP ${response.status}`)
  return json as { public_id: string; secure_url: string; bytes: number; format: string; width: number; height: number; resource_type: string }
}

export async function destroyCloudinaryAsset(publicID: string) {
  const credentials = await getCloudinaryCredentials()
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = crypto.createHash('sha1').update(`public_id=${publicID}&timestamp=${timestamp}${credentials.apiSecret}`).digest('hex')
  const body = new URLSearchParams({ public_id: publicID, timestamp: String(timestamp), api_key: credentials.apiKey, signature })
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(credentials.cloudName)}/image/destroy`, { method: 'POST', body })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(json?.error?.message || `Cloudinary destroy HTTP ${response.status}`)
  return json
}

export async function cloudinaryAdmin(pathname: string, init?: RequestInit) {
  const credentials = await getCloudinaryCredentials()
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(credentials.cloudName)}${pathname}`, {
    ...init,
    headers: { Authorization: basicAuth(credentials), 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(json?.error?.message || `Cloudinary Admin HTTP ${response.status}`)
  return json
}
