import type { Payload } from 'payload'

import { decryptCredentials, encryptCredentials, maskSecret } from './crypto'
import type { IntegrationRecord, ProviderID, ProviderUsage } from './providers'
import { PROVIDER_CATALOG } from './providers'

type IntegrationDocument = IntegrationRecord & {
  enabled?: boolean
  priority?: number
  status?: string
  credentialHint?: string
  expiresAt?: string | null
  lastTestedAt?: string | null
  lastUsedAt?: string | null
  lastError?: string | null
  models?: unknown
  capabilities?: unknown
  encryptedCredentials?: string | null
  credentialIV?: string | null
  credentialTag?: string | null
  createdAt?: string
  updatedAt?: string
}

const db = (payload: Payload) => payload as any

export async function requireAdmin(payload: Payload, request: Request) {
  const auth = await payload.auth({ headers: request.headers, canSetHeaders: false })
  if (!auth.user || (auth.user as { role?: string }).role !== 'admin') {
    throw Object.assign(new Error('No autorizado'), { status: 401 })
  }
  return auth.user as { id: string | number; email?: string; role?: string }
}

export function publicIntegration(document: IntegrationDocument) {
  const {
    encryptedCredentials: _encryptedCredentials,
    credentialIV: _credentialIV,
    credentialTag: _credentialTag,
    ...safe
  } = document
  return safe
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

export async function saveIntegration(
  payload: Payload,
  input: {
    id?: string | number
    label: string
    provider: ProviderID
    enabled?: boolean
    priority?: number
    baseURL?: string
    defaultModel?: string
    expiresAt?: string | null
    credentials?: Record<string, string>
  },
) {
  if (!PROVIDER_CATALOG[input.provider]) throw new Error('Proveedor no compatible.')
  if (!input.label?.trim()) throw new Error('El nombre de la integración es obligatorio.')

  const credentials = Object.fromEntries(
    Object.entries(input.credentials || {})
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => Boolean(value)),
  )
  const encrypted = Object.keys(credentials).length ? encryptCredentials(credentials) : undefined
  const hintSource = credentials.apiKey || credentials.cloudName || credentials.apiSecret

  const data: Record<string, unknown> = {
    label: input.label.trim(),
    provider: input.provider,
    enabled: input.enabled !== false,
    priority: Number.isFinite(input.priority) ? Number(input.priority) : input.provider === 'ollama' ? 1 : 100,
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
    if (!encrypted) throw new Error('Debes guardar al menos una credencial.')
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
  const document = await db(payload).update({
    collection: 'integrations',
    id,
    data: {
      status: result.ok ? 'connected' : 'error',
      lastTestedAt: new Date().toISOString(),
      lastError: result.error || null,
      models: result.models,
      capabilities: result.capabilities,
      usage: result.usage,
    },
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  return publicIntegration(document)
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
