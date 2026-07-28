import type { Payload } from 'payload'

import { decryptCredentials, encryptCredentials, maskSecret } from './crypto'
import type {
  IntegrationRecord,
  ProviderID,
  ProviderTestResult,
  ProviderUsage,
} from './providers'
import { PROVIDER_CATALOG, testProvider } from './providers'

export type IntegrationDocument = IntegrationRecord & {
  enabled?: boolean
  priority?: number
  connectionMode?: 'automatic' | 'manual'
  status?: string
  credentialHint?: string
  credentialFingerprint?: string
  credentialKeyVersion?: number
  secretUpdatedAt?: string | null
  expiresAt?: string | null
  lastConnectedAt?: string | null
  lastTestedAt?: string | null
  lastUsedAt?: string | null
  lastError?: string | null
  models?: unknown
  capabilities?: unknown
  lastTestUsage?: unknown
  failedConnectionAttempts?: number
  lockedUntil?: string | null
  encryptedCredentials?: string | null
  credentialIV?: string | null
  credentialTag?: string | null
  credentialBinding?: string | null
  createdAt?: string
  updatedAt?: string
}

export type SaveIntegrationInput = {
  id?: string | number
  label: string
  provider: ProviderID
  enabled?: boolean
  priority?: number
  connectionMode?: 'automatic' | 'manual'
  baseURL?: string
  defaultModel?: string
  expiresAt?: string | null
  credentials?: Record<string, string>
}

const db = (payload: Payload) => payload as any
const MAX_JSON_BYTES = 64 * 1024
const LOCK_AFTER_ATTEMPTS = 5
const LOCK_MINUTES = 15

export async function requireAdmin(payload: Payload, request: Request) {
  const auth = await payload.auth({ headers: request.headers, canSetHeaders: false })
  if (!auth.user || (auth.user as { role?: string }).role !== 'admin') {
    throw Object.assign(new Error('No autorizado'), { status: 401 })
  }
  return auth.user as { id: string | number; email?: string; role?: string }
}

export function requireTrustedMutation(request: Request) {
  const secFetchSite = request.headers.get('sec-fetch-site')
  if (secFetchSite && !['same-origin', 'same-site', 'none'].includes(secFetchSite)) {
    throw Object.assign(new Error('Solicitud bloqueada por política de origen.'), { status: 403 })
  }

  const origin = request.headers.get('origin')
  if (origin) {
    const requestURL = new URL(request.url)
    const originURL = new URL(origin)
    if (originURL.host !== requestURL.host || originURL.protocol !== requestURL.protocol) {
      throw Object.assign(new Error('Origen no autorizado.'), { status: 403 })
    }
  }

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw Object.assign(new Error('Solo se acepta contenido JSON.'), { status: 415 })
  }

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_JSON_BYTES) {
    throw Object.assign(new Error('La solicitud excede el tamaño permitido.'), { status: 413 })
  }
}

export async function readLimitedJSON<T = Record<string, unknown>>(request: Request): Promise<T> {
  requireTrustedMutation(request)
  const raw = await request.text()
  if (Buffer.byteLength(raw, 'utf8') > MAX_JSON_BYTES) {
    throw Object.assign(new Error('La solicitud excede el tamaño permitido.'), { status: 413 })
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    throw Object.assign(new Error('JSON inválido.'), { status: 400 })
  }
}

export function publicIntegration(document: IntegrationDocument) {
  const {
    encryptedCredentials: _encryptedCredentials,
    credentialIV: _credentialIV,
    credentialTag: _credentialTag,
    credentialBinding: _credentialBinding,
    ...safe
  } = document

  return {
    ...safe,
    vaultState: document.encryptedCredentials ? 'sealed' : 'empty',
  }
}

export async function listIntegrations(payload: Payload) {
  const result = await db(payload).find({
    collection: 'integrations',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    sort: 'priority',
    showHiddenFields: true,
  })
  return (result.docs as IntegrationDocument[]).map(publicIntegration)
}

export async function getIntegration(payload: Payload, id: string | number) {
  const document = (await db(payload).findByID({
    collection: 'integrations',
    id,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })) as IntegrationDocument

  return {
    document,
    credentials: decryptCredentials(document),
  }
}

function cleanCredentials(credentials?: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(credentials || {})
      .map(([key, value]) => [key, String(value || '').trim()])
      .filter(([, value]) => Boolean(value)),
  )
}

function assertProvider(provider: ProviderID) {
  if (!PROVIDER_CATALOG[provider]) {
    throw Object.assign(new Error('Proveedor no compatible.'), { status: 400 })
  }
}

function assertNotLocked(document?: IntegrationDocument | null) {
  if (!document?.lockedUntil) return
  const lockedUntil = new Date(document.lockedUntil)
  if (lockedUntil.getTime() > Date.now()) {
    throw Object.assign(
      new Error(
        `Bóveda bloqueada temporalmente hasta ${lockedUntil.toLocaleString('es-CL')}.`,
      ),
      { status: 423 },
    )
  }
}

export async function saveIntegration(payload: Payload, input: SaveIntegrationInput) {
  assertProvider(input.provider)
  if (!input.label?.trim()) throw Object.assign(new Error('El nombre de la integración es obligatorio.'), { status: 400 })

  const existing = input.id
    ? ((await db(payload).findByID({
        collection: 'integrations',
        id: input.id,
        depth: 0,
        overrideAccess: true,
        showHiddenFields: true,
      })) as IntegrationDocument)
    : null
  assertNotLocked(existing)

  const credentials = cleanCredentials(input.credentials)
  if (existing && existing.provider !== input.provider && !Object.keys(credentials).length) {
    throw Object.assign(
      new Error('Al cambiar de proveedor debes introducir una credencial nueva.'),
      { status: 400 },
    )
  }

  const encrypted = Object.keys(credentials).length
    ? encryptCredentials(credentials, input.provider, existing?.credentialBinding)
    : undefined
  const hintSource = credentials.apiKey || credentials.cloudName || credentials.apiSecret

  const data: Record<string, unknown> = {
    label: input.label.trim(),
    provider: input.provider,
    enabled: input.enabled !== false,
    priority: Number.isFinite(input.priority)
      ? Number(input.priority)
      : input.provider === 'ollama'
        ? 1
        : 100,
    connectionMode: input.connectionMode || 'automatic',
    baseURL: input.baseURL?.trim() || PROVIDER_CATALOG[input.provider].defaultBaseURL,
    defaultModel: input.defaultModel?.trim() || undefined,
    expiresAt: input.expiresAt || null,
    ...(encrypted || {}),
    ...(hintSource ? { credentialHint: maskSecret(hintSource) } : {}),
  }

  let document: IntegrationDocument
  if (input.id) {
    document = await db(payload).update({
      collection: 'integrations',
      id: input.id,
      data,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })
  } else {
    if (!encrypted) throw Object.assign(new Error('Debes introducir una credencial.'), { status: 400 })
    document = await db(payload).create({
      collection: 'integrations',
      data: { ...data, status: 'untested' },
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })
  }

  return publicIntegration(document)
}

export async function recordProviderTest(
  payload: Payload,
  id: string | number,
  result: {
    ok: boolean
    models?: unknown
    capabilities?: unknown
    usage?: ProviderUsage
    error?: string
  },
) {
  const current = (await db(payload).findByID({
    collection: 'integrations',
    id,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })) as IntegrationDocument

  const failures = result.ok ? 0 : Number(current.failedConnectionAttempts || 0) + 1
  const locked = !result.ok && failures >= LOCK_AFTER_ATTEMPTS
  const firstModel = Array.isArray(result.models)
    ? String((result.models as Array<{ id?: string }>)[0]?.id || '')
    : ''

  const document = await db(payload).update({
    collection: 'integrations',
    id,
    data: {
      status: result.ok ? 'connected' : locked ? 'locked' : 'error',
      lastConnectedAt: result.ok ? new Date().toISOString() : current.lastConnectedAt || null,
      lastTestedAt: new Date().toISOString(),
      lastError: result.error || null,
      models: result.models,
      capabilities: result.capabilities,
      lastTestUsage: result.usage,
      failedConnectionAttempts: failures,
      lockedUntil: locked
        ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
        : null,
      defaultModel: current.defaultModel || firstModel || undefined,
    },
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  return publicIntegration(document)
}

export async function connectAndSaveIntegration(
  payload: Payload,
  input: SaveIntegrationInput,
): Promise<{ integration: ReturnType<typeof publicIntegration>; result: ProviderTestResult }> {
  assertProvider(input.provider)

  const existing = input.id ? await getIntegration(payload, input.id) : null
  assertNotLocked(existing?.document)
  const incomingCredentials = cleanCredentials(input.credentials)
  const credentials = Object.keys(incomingCredentials).length
    ? incomingCredentials
    : existing?.credentials || {}

  if (!Object.keys(credentials).length && input.provider !== 'custom-openai') {
    throw Object.assign(new Error('Introduce la clave antes de conectar.'), { status: 400 })
  }

  const candidate: IntegrationRecord = {
    id: input.id || 'pending',
    label: input.label,
    provider: input.provider,
    baseURL: input.baseURL || PROVIDER_CATALOG[input.provider].defaultBaseURL,
    defaultModel: input.defaultModel,
  }

  let result: ProviderTestResult
  try {
    result = await testProvider(candidate, credentials)
  } catch (error) {
    if (input.id) {
      await recordProviderTest(payload, input.id, {
        ok: false,
        error: error instanceof Error ? error.message : 'La conexión falló.',
      })
    }
    throw error
  }

  const selectedModel =
    input.defaultModel ||
    existing?.document.defaultModel ||
    result.models[0]?.id ||
    ''
  const saved = await saveIntegration(payload, {
    ...input,
    defaultModel: selectedModel,
    credentials: Object.keys(incomingCredentials).length ? incomingCredentials : undefined,
  })
  const integration = await recordProviderTest(payload, saved.id, result)
  return { integration, result }
}

export async function addUsage(
  payload: Payload,
  integration: IntegrationDocument,
  current: ProviderUsage,
) {
  const previous = integration.usage || {}
  const usage: ProviderUsage = {
    ...previous,
    requests: Number(previous.requests || 0) + 1,
    promptTokens: Number(previous.promptTokens || 0) + Number(current.promptTokens || 0),
    completionTokens:
      Number(previous.completionTokens || 0) + Number(current.completionTokens || 0),
    totalTokens: Number(previous.totalTokens || 0) + Number(current.totalTokens || 0),
    activeMilliseconds:
      Number(previous.activeMilliseconds || 0) + Number(current.activeMilliseconds || 0),
    rateLimit: current.rateLimit || previous.rateLimit,
    provider: current.provider || previous.provider,
  }

  await db(payload).update({
    collection: 'integrations',
    id: integration.id,
    data: { usage, lastUsedAt: new Date().toISOString(), lastError: null },
    overrideAccess: true,
  })
  return usage
}
