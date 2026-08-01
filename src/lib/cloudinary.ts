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
  if (!doc?.encryptedCredentials || !doc?.credentialIV || !doc?.credentialTag) throw new Error('Cloudinary no tiene credenciales guardadas.')
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(doc.credentialIV, 'base64'))
  decipher.setAuthTag(Buffer.from(doc.credentialTag, 'base64'))
  const clear = Buffer.concat([decipher.update(Buffer.from(doc.encryptedCredentials, 'base64')), decipher.final()]).toString('utf8')
  return JSON.parse(clear) as CloudinaryCredentials
}

export async function getCloudinaryIntegration() {
  const payload = await getPayload({ config })
  const result = await payload.find({ collection: 'integrations', depth: 0, limit: 1, overrideAccess: true, where: { provider: { equals: PROVIDER } } })
  return { payload, doc: result.docs?.[0] as any }
}

export async function getCloudinaryCredentials() {
  const { doc } = await getCloudinaryIntegration()
  if (!doc?.enabled) throw new Error('Cloudinary está desactivado en Integraciones.')
  return decryptCloudinaryCredentials(doc)
}

const basicAuth = (credentials: CloudinaryCredentials) => `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64')}`

export async function testCloudinary(credentials: CloudinaryCredentials) {
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(credentials.cloudName)}/resources/image?max_results=1`, { headers: { Authorization: basicAuth(credentials) }, cache: 'no-store' })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(json?.error?.message || `Cloudinary respondió HTTP ${response.status}`)
  return { ok: true, total: Number(json?.total_count || 0), cloudName: credentials.cloudName }
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
