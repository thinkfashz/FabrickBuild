import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

export type EncryptedPayload = {
  encryptedCredentials: string
  credentialIV: string
  credentialTag: string
}

function getEncryptionKey(): Buffer {
  const source = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.PAYLOAD_SECRET || ''
  if (source.length < 32) {
    throw new Error('PAYLOAD_SECRET o INTEGRATION_ENCRYPTION_KEY debe tener al menos 32 caracteres.')
  }
  return createHash('sha256').update(source).digest()
}

export function encryptCredentials(credentials: Record<string, string>): EncryptedPayload {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const plaintext = Buffer.from(JSON.stringify(credentials), 'utf8')
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    encryptedCredentials: encrypted.toString('base64url'),
    credentialIV: iv.toString('base64url'),
    credentialTag: tag.toString('base64url'),
  }
}

export function decryptCredentials(record: {
  encryptedCredentials?: null | string
  credentialIV?: null | string
  credentialTag?: null | string
}): Record<string, string> {
  if (!record.encryptedCredentials || !record.credentialIV || !record.credentialTag) {
    return {}
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(record.credentialIV, 'base64url'),
  )
  decipher.setAuthTag(Buffer.from(record.credentialTag, 'base64url'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.encryptedCredentials, 'base64url')),
    decipher.final(),
  ])

  return JSON.parse(decrypted.toString('utf8')) as Record<string, string>
}

export function maskSecret(value?: string): string {
  if (!value) return 'Sin credencial'
  if (value.length <= 8) return `${value.slice(0, 2)}••••${value.slice(-2)}`
  return `${value.slice(0, 4)}••••••${value.slice(-4)}`
}
