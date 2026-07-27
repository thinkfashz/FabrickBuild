export type ProviderID =
  | 'ollama'
  | 'openai'
  | 'anthropic'
  | 'openrouter'
  | 'glm'
  | 'custom-openai'
  | 'resend'
  | 'cloudinary'

export type IntegrationRecord = {
  id: string | number
  label?: string
  provider: ProviderID
  baseURL?: null | string
  defaultModel?: null | string
  usage?: null | ProviderUsage
}

export type ProviderModel = {
  id: string
  name: string
  contextLength?: number
  inputPrice?: string
  outputPrice?: string
  capabilities?: string[]
}

export type ProviderUsage = {
  requests?: number
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  activeMilliseconds?: number
  rateLimit?: Record<string, string | number | null>
  provider?: Record<string, unknown>
}

export type ProviderTestResult = {
  ok: boolean
  models: ProviderModel[]
  capabilities: string[]
  usage: ProviderUsage
  expiresAt?: null | string
  details?: Record<string, unknown>
}

export type ChatMessage = {
  role: 'assistant' | 'system' | 'user'
  content: string
}

export type ChatStreamEvent =
  | { type: 'reasoning'; value: string }
  | { type: 'token'; value: string }
  | { type: 'usage'; value: ProviderUsage }
  | { type: 'done'; value: { duration: number } }

export const PROVIDER_CATALOG: Record<
  ProviderID,
  { ai: boolean; defaultBaseURL: string; label: string; manualModels?: string[] }
> = {
  ollama: {
    ai: true,
    defaultBaseURL: 'https://ollama.com',
    label: 'Ollama Cloud',
  },
  openai: {
    ai: true,
    defaultBaseURL: 'https://api.openai.com',
    label: 'OpenAI / ChatGPT',
  },
  anthropic: {
    ai: true,
    defaultBaseURL: 'https://api.anthropic.com',
    label: 'Anthropic / Claude Code',
  },
  openrouter: {
    ai: true,
    defaultBaseURL: 'https://openrouter.ai',
    label: 'OpenRouter',
  },
  glm: {
    ai: true,
    defaultBaseURL: 'https://api.z.ai/api/paas/v4',
    label: 'Z.AI / GLM',
    manualModels: ['glm-5.1', 'glm-5', 'glm-4.7', 'glm-4.6', 'glm-4.5'],
  },
  'custom-openai': {
    ai: true,
    defaultBaseURL: 'http://127.0.0.1:11434',
    label: 'OpenAI compatible / OpenCode',
  },
  resend: {
    ai: false,
    defaultBaseURL: 'https://api.resend.com',
    label: 'Resend',
  },
  cloudinary: {
    ai: false,
    defaultBaseURL: 'https://api.cloudinary.com',
    label: 'Cloudinary',
  },
}

function cleanBaseURL(integration: IntegrationRecord): string {
  const fallback = PROVIDER_CATALOG[integration.provider].defaultBaseURL
  return (integration.baseURL || fallback).replace(/\/+$/, '')
}

function bearer(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` }
}

function requireCredential(credentials: Record<string, string>, key: string): string {
  const value = credentials[key]?.trim()
  if (!value) throw new Error(`Falta la credencial ${key}.`)
  return value
}

async function checkedJSON(response: Response): Promise<any> {
  const text = await response.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text.slice(0, 500) }
  }
  if (!response.ok) {
    const message = data?.error?.message || data?.message || data?.error || `HTTP ${response.status}`
    throw new Error(String(message))
  }
  return data
}

function rateLimitFromHeaders(headers: Headers): Record<string, string | null> {
  const names = [
    'ratelimit-limit',
    'ratelimit-remaining',
    'ratelimit-reset',
    'retry-after',
    'x-ratelimit-limit-requests',
    'x-ratelimit-remaining-requests',
    'x-ratelimit-reset-requests',
    'x-resend-daily-quota',
    'x-resend-monthly-quota',
    'x-featureratelimit-limit',
    'x-featureratelimit-remaining',
    'x-featureratelimit-reset',
  ]
  return Object.fromEntries(names.map((name) => [name, headers.get(name)]).filter(([, value]) => value))
}

function normalizeOpenAIModels(data: any): ProviderModel[] {
  return (Array.isArray(data?.data) ? data.data : [])
    .map((item: any) => ({
      id: String(item.id || ''),
      name: String(item.name || item.id || ''),
      contextLength: Number(item.context_length || item.top_provider?.context_length || 0) || undefined,
      inputPrice: item.pricing?.prompt,
      outputPrice: item.pricing?.completion,
      capabilities: Array.isArray(item.supported_parameters) ? item.supported_parameters : undefined,
    }))
    .filter((item: ProviderModel) => item.id)
}

export async function listProviderModels(
  integration: IntegrationRecord,
  credentials: Record<string, string>,
): Promise<ProviderModel[]> {
  const apiKey = credentials.apiKey || ''
  const baseURL = cleanBaseURL(integration)

  if (integration.provider === 'ollama') {
    const data = await checkedJSON(
      await fetch(`${baseURL}/api/tags`, {
        headers: { ...bearer(requireCredential(credentials, 'apiKey')) },
        cache: 'no-store',
      }),
    )
    return (Array.isArray(data?.models) ? data.models : []).map((model: any) => ({
      id: String(model.name || model.model),
      name: String(model.name || model.model),
      capabilities: Array.isArray(model.capabilities) ? model.capabilities : undefined,
    }))
  }

  if (integration.provider === 'openai' || integration.provider === 'custom-openai') {
    const prefix = baseURL.endsWith('/v1') ? '' : '/v1'
    const data = await checkedJSON(
      await fetch(`${baseURL}${prefix}/models`, {
        headers: apiKey ? bearer(apiKey) : undefined,
        cache: 'no-store',
      }),
    )
    return normalizeOpenAIModels(data)
  }

  if (integration.provider === 'openrouter') {
    const data = await checkedJSON(
      await fetch(`${baseURL}/api/v1/models`, {
        headers: bearer(requireCredential(credentials, 'apiKey')),
        cache: 'no-store',
      }),
    )
    return normalizeOpenAIModels(data)
  }

  if (integration.provider === 'anthropic') {
    const data = await checkedJSON(
      await fetch(`${baseURL}/v1/models`, {
        headers: {
          'anthropic-version': '2023-06-01',
          'x-api-key': requireCredential(credentials, 'apiKey'),
        },
        cache: 'no-store',
      }),
    )
    return normalizeOpenAIModels(data)
  }

  if (integration.provider === 'glm') {
    return (PROVIDER_CATALOG.glm.manualModels || []).map((id) => ({ id, name: id }))
  }

  return []
}

export async function testProvider(
  integration: IntegrationRecord,
  credentials: Record<string, string>,
): Promise<ProviderTestResult> {
  const startedAt = Date.now()
  const baseURL = cleanBaseURL(integration)
  let models: ProviderModel[] = []
  let details: Record<string, unknown> = {}
  let usage: ProviderUsage = {}

  if (PROVIDER_CATALOG[integration.provider].ai) {
    models = await listProviderModels(integration, credentials)

    if (integration.provider === 'glm') {
      const model = integration.defaultModel || models[0]?.id || 'glm-5.1'
      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          ...bearer(requireCredential(credentials, 'apiKey')),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Responde únicamente OK.' }],
          max_tokens: 4,
          stream: false,
        }),
      })
      const data = await checkedJSON(response)
      usage = {
        promptTokens: Number(data?.usage?.prompt_tokens || 0),
        completionTokens: Number(data?.usage?.completion_tokens || 0),
        totalTokens: Number(data?.usage?.total_tokens || 0),
        rateLimit: rateLimitFromHeaders(response.headers),
      }
    }

    details = { modelCount: models.length, baseURL }
  } else if (integration.provider === 'resend') {
    const response = await fetch(`${baseURL}/api-keys`, {
      headers: {
        ...bearer(requireCredential(credentials, 'apiKey')),
        'User-Agent': 'FabrickBuild/2.0',
      },
      cache: 'no-store',
    })
    const data = await checkedJSON(response)
    usage = { rateLimit: rateLimitFromHeaders(response.headers) }
    details = { keys: Array.isArray(data?.data) ? data.data.length : 0 }
  } else if (integration.provider === 'cloudinary') {
    const cloudName = requireCredential(credentials, 'cloudName')
    const apiKey = requireCredential(credentials, 'apiKey')
    const apiSecret = requireCredential(credentials, 'apiSecret')
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
    const response = await fetch(`${baseURL}/v1_1/${encodeURIComponent(cloudName)}/usage`, {
      headers: { Authorization: `Basic ${auth}` },
      cache: 'no-store',
    })
    const data = await checkedJSON(response)
    usage = {
      rateLimit: rateLimitFromHeaders(response.headers),
      provider: {
        plan: data?.plan,
        credits: data?.credits,
        storage: data?.storage,
        bandwidth: data?.bandwidth,
        transformations: data?.transformations,
      },
    }
    details = { plan: data?.plan, cloudName }
  }

  return {
    ok: true,
    models,
    capabilities: PROVIDER_CATALOG[integration.provider].ai
      ? ['chat', 'model-selection', 'code-generation', 'preview-proposals']
      : ['credential-test', 'usage'],
    usage: {
      ...usage,
      activeMilliseconds: Date.now() - startedAt,
    },
    expiresAt: integration.provider === 'ollama' ? null : undefined,
    details,
  }
}

function chatEndpoint(integration: IntegrationRecord): string {
  const baseURL = cleanBaseURL(integration)
  if (integration.provider === 'ollama') return `${baseURL}/api/chat`
  if (integration.provider === 'openrouter') return `${baseURL}/api/v1/chat/completions`
  if (integration.provider === 'anthropic') return `${baseURL}/v1/messages`
  if (integration.provider === 'glm') return `${baseURL}/chat/completions`
  const prefix = baseURL.endsWith('/v1') ? '' : '/v1'
  return `${baseURL}${prefix}/chat/completions`
}

function chatHeaders(
  integration: IntegrationRecord,
  credentials: Record<string, string>,
): HeadersInit {
  if (integration.provider === 'anthropic') {
    return {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': requireCredential(credentials, 'apiKey'),
    }
  }
  if (integration.provider === 'custom-openai' && !credentials.apiKey) {
    return { 'Content-Type': 'application/json' }
  }
  return {
    ...bearer(requireCredential(credentials, 'apiKey')),
    'Content-Type': 'application/json',
    ...(integration.provider === 'openrouter'
      ? {
          'HTTP-Referer': process.env.NEXT_PUBLIC_SERVER_URL || 'https://fabrickbuild.vercel.app',
          'X-Title': 'FabrickBuild AI Studio',
        }
      : {}),
  }
}

export async function streamProviderChat(args: {
  integration: IntegrationRecord
  credentials: Record<string, string>
  model: string
  messages: ChatMessage[]
  onEvent: (event: ChatStreamEvent) => void
  signal?: AbortSignal
}): Promise<ProviderUsage> {
  const { integration, credentials, model, messages, onEvent, signal } = args
  const startedAt = Date.now()
  const isAnthropic = integration.provider === 'anthropic'
  const body = isAnthropic
    ? {
        model,
        max_tokens: 4096,
        stream: true,
        system: messages.find((message) => message.role === 'system')?.content,
        messages: messages
          .filter((message) => message.role !== 'system')
          .map((message) => ({ role: message.role, content: message.content })),
      }
    : {
        model,
        messages,
        stream: true,
        ...(integration.provider === 'ollama' ? { think: true } : {}),
        ...(integration.provider === 'openrouter' ? { include_reasoning: true } : {}),
      }

  const response = await fetch(chatEndpoint(integration), {
    method: 'POST',
    headers: chatHeaders(integration, credentials),
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok || !response.body) {
    await checkedJSON(response)
    throw new Error(`El proveedor respondió HTTP ${response.status}.`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let usage: ProviderUsage = { rateLimit: rateLimitFromHeaders(response.headers) }

  const processPayload = (payload: any) => {
    if (integration.provider === 'ollama') {
      if (payload?.message?.thinking) onEvent({ type: 'reasoning', value: payload.message.thinking })
      if (payload?.message?.content) onEvent({ type: 'token', value: payload.message.content })
      if (payload?.done) {
        usage = {
          ...usage,
          promptTokens: Number(payload.prompt_eval_count || 0),
          completionTokens: Number(payload.eval_count || 0),
          totalTokens: Number(payload.prompt_eval_count || 0) + Number(payload.eval_count || 0),
          activeMilliseconds: Math.round(Number(payload.total_duration || 0) / 1_000_000),
        }
      }
      return
    }

    if (integration.provider === 'anthropic') {
      const delta = payload?.delta
      if (delta?.type === 'thinking_delta' && delta.thinking) {
        onEvent({ type: 'reasoning', value: delta.thinking })
      }
      if (delta?.type === 'text_delta' && delta.text) onEvent({ type: 'token', value: delta.text })
      const anthropicUsage = payload?.message?.usage || payload?.usage
      if (anthropicUsage) {
        usage = {
          ...usage,
          promptTokens: Number(anthropicUsage.input_tokens || usage.promptTokens || 0),
          completionTokens: Number(anthropicUsage.output_tokens || usage.completionTokens || 0),
        }
        usage.totalTokens = Number(usage.promptTokens || 0) + Number(usage.completionTokens || 0)
      }
      return
    }

    const delta = payload?.choices?.[0]?.delta || {}
    const reasoning = delta.reasoning_content || delta.reasoning
    if (reasoning) onEvent({ type: 'reasoning', value: String(reasoning) })
    if (delta.content) onEvent({ type: 'token', value: String(delta.content) })
    if (payload?.usage) {
      usage = {
        ...usage,
        promptTokens: Number(payload.usage.prompt_tokens || 0),
        completionTokens: Number(payload.usage.completion_tokens || 0),
        totalTokens: Number(payload.usage.total_tokens || 0),
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || line.startsWith('event:')) continue
      const source = line.startsWith('data:') ? line.slice(5).trim() : line
      if (!source || source === '[DONE]') continue
      try {
        processPayload(JSON.parse(source))
      } catch {
        // Los fragmentos incompletos permanecen en el buffer; los eventos desconocidos se omiten.
      }
    }
    if (done) break
  }

  if (buffer.trim()) {
    const source = buffer.trim().startsWith('data:') ? buffer.trim().slice(5).trim() : buffer.trim()
    if (source && source !== '[DONE]') {
      try {
        processPayload(JSON.parse(source))
      } catch {
        // No se expone contenido no validado.
      }
    }
  }

  usage.activeMilliseconds = usage.activeMilliseconds || Date.now() - startedAt
  onEvent({ type: 'usage', value: usage })
  onEvent({ type: 'done', value: { duration: Date.now() - startedAt } })
  return usage
}
