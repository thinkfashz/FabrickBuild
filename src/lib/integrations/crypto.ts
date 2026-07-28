import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
} from 'crypto'

export type EncryptedPayload = {
  encryptedCredentials: string
  credentialIV: string
  credentialTag: string
  credentialBinding: string
  credentialFingerprint: string
  credentialKeyVersion: number
  secretUpdatedAt: string
}

type EncryptedRecord = {
  provider?: null | string
  encryptedCredentials?: null | string
  credentialIV?: null | string
  credentialTag?: null | string
  credentialBinding?: null | string
  credentialKeyVersion?: null | number
}

const KEY_VERSION = 2
const KEY_CONTEXT = Buffer.from('fabrickbuild/integration-vault/v2', 'utf8')

function getMasterSecret(): Buffer {
  const source = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.PAYLOAD_SECRET || ''
  if (source.length < 32) {
    throw new Error('PAYLOAD_SECRET o INTEGRATION_ENCRYPTION_KEY debe tener al menos 32 caracteres.')
  }
  return Buffer.from(source, 'utf8')
}

function deriveRecordKey(binding: string): Buffer {
  const master = getMasterSecret()
  try {
    return Buffer.from(
      hkdfSync('sha256', master, Buffer.from(binding, 'utf8'), KEY_CONTEXT, 32),
    )
  } finally {
    master.fill(0)
  }
}

function associatedData(provider: string, binding: string, version = KEY_VERSION): Buffer {
  return Buffer.from(`fabrickbuild:${provider}:${binding}:v${version}`, 'utf8')
}

function canonicalCredentials(credentials: Record<string, string>): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(credentials)
        .map(([key, value]) => [key, String(value || '').trim()])
        .filter(([, value]) => Boolean(value))
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  )
}

export function encryptCredentials(
  credentials: Record<string, string>,
  provider: string,
  existingBinding?: null | string,
): EncryptedPayload {
  const plaintextString = canonicalCredentials(credentials)
  if (plaintextString === '{}') throw new Error('No hay credenciales para cifrar.')

  const binding = existingBinding || randomBytes(18).toString('base64url')
  const iv = randomBytes(12)
  const key = deriveRecordKey(binding)
  const plaintext = Buffer.from(plaintextString, 'utf8')
  const aad = associatedData(provider, binding)

  try {
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    cipher.setAAD(aad)
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
    const tag = cipher.getAuthTag()

    return {
      encryptedCredentials: encrypted.toString('base64url'),
      credentialIV: iv.toString('base64url'),
      credentialTag: tag.toString('base64url'),
      credentialBinding: binding,
      credentialFingerprint: createHash('sha256')
        .update(plaintextString)
        .digest('hex')
        .slice(0, 20),
      credentialKeyVersion: KEY_VERSION,
      secretUpdatedAt: new Date().toISOString(),
    }
  } finally {
    key.fill(0)
    plaintext.fill(0)
    aad.fill(0)
  }
}

function decryptLegacy(record: EncryptedRecord): Record<string, string> {
  const source = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.PAYLOAD_SECRET || ''
  const key = createHash('sha256').update(source).digest()
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(record.credentialIV || '', 'base64url'),
  )
  decipher.setAuthTag(Buffer.from(record.credentialTag || '', 'base64url'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.encryptedCredentials || '', 'base64url')),
    decipher.final(),
  ])

  try {
    return JSON.parse(decrypted.toString('utf8')) as Record<string, string>
  } finally {
    key.fill(0)
    decrypted.fill(0)
  }
}

export function decryptCredentials(record: EncryptedRecord): Record<string, string> {
  if (!record.encryptedCredentials || !record.credentialIV || !record.credentialTag) {
    return {}
  }

  const version = Number(record.credentialKeyVersion || 1)
  if (version < 2 || !record.credentialBinding || !record.provider) {
    return decryptLegacy(record)
  }

  const key = deriveRecordKey(record.credentialBinding)
  const aad = associatedData(record.provider, record.credentialBinding, version)
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(record.credentialIV, 'base64url'),
  )
  decipher.setAAD(aad)
  decipher.setAuthTag(Buffer.from(record.credentialTag, 'base64url'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.encryptedCredentials, 'base64url')),
    decipher.final(),
  ])

  try {
    return JSON.parse(decrypted.toString('utf8')) as Record<string, string>
  } finally {
    key.fill(0)
    decrypted.fill(0)
    aad.fill(0)
  }
}

export function maskSecret(value?: string): string {
  if (!value) return 'Sin credencial'
  if (value.length <= 8) return `${value.slice(0, 2)}••••${value.slice(-2)}`
  return `${value.slice(0, 4)}••••••${value.slice(-4)}`
}
