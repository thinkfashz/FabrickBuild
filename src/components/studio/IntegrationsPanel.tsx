'use client'

import {
  Bot,
  CheckCircle2,
  Cloud,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  PlugZap,
  RefreshCw,
  Save,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type Usage = {
  requests?: number
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  activeMilliseconds?: number
  rateLimit?: Record<string, string | number | null>
  provider?: Record<string, any>
}

type Model = {
  id: string
  name?: string
  contextLength?: number
  inputPrice?: string
  outputPrice?: string
  capabilities?: string[]
}

type Integration = {
  id: string | number
  label: string
  provider: string
  enabled?: boolean
  priority?: number
  baseURL?: string
  defaultModel?: string
  status?: string
  credentialHint?: string
  expiresAt?: string | null
  lastTestedAt?: string | null
  lastUsedAt?: string | null
  lastError?: string | null
  models?: Model[]
  capabilities?: string[]
  usage?: Usage
}

type FormState = {
  id?: string | number
  label: string
  provider: string
  enabled: boolean
  priority: number
  baseURL: string
  defaultModel: string
  expiresAt: string
  apiKey: string
  apiSecret: string
  cloudName: string
}

const PROVIDERS = [
  ['ollama', 'Ollama Cloud', 'https://ollama.com'],
  ['openai', 'OpenAI / ChatGPT', 'https://api.openai.com'],
  ['anthropic', 'Anthropic / Claude Code', 'https://api.anthropic.com'],
  ['openrouter', 'OpenRouter', 'https://openrouter.ai'],
  ['glm', 'Z.AI / GLM', 'https://api.z.ai/api/paas/v4'],
  ['custom-openai', 'OpenAI compatible / OpenCode', 'http://127.0.0.1:11434'],
  ['resend', 'Resend', 'https://api.resend.com'],
  ['cloudinary', 'Cloudinary', 'https://api.cloudinary.com'],
] as const

const EMPTY_FORM: FormState = {
  label: 'Ollama Cloud principal',
  provider: 'ollama',
  enabled: true,
  priority: 1,
  baseURL: 'https://ollama.com',
  defaultModel: '',
  expiresAt: '',
  apiKey: '',
  apiSecret: '',
  cloudName: '',
}

function providerMeta(provider: string) {
  return PROVIDERS.find(([id]) => id === provider) || PROVIDERS[0]
}

function date(value?: null | string) {
  if (!value) return 'Sin registro'
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function duration(milliseconds = 0) {
  const seconds = Math.round(milliseconds / 1000)
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  if (minutes < 60) return `${minutes} min ${remaining} s`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

function number(value?: number) {
  return new Intl.NumberFormat('es-CL').format(Number(value || 0))
}

function providerIcon(provider: string) {
  if (provider === 'resend') return <Mail size={17} />
  if (provider === 'cloudinary') return <Cloud size={17} />
  return <Bot size={17} />
}

export default function IntegrationsPanel() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | number | null>(null)
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const selectedProvider = useMemo(() => providerMeta(form.provider), [form.provider])
  const isCloudinary = form.provider === 'cloudinary'
  const isAI = !['resend', 'cloudinary'].includes(form.provider)

  async function load() {
    setLoading(true)
    try {
      const response = await fetch('/api/integrations', { credentials: 'include', cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudieron cargar las integraciones.')
      setIntegrations(data.integrations || [])
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Error de conexión.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function changeProvider(provider: string) {
    const meta = providerMeta(provider)
    setForm((current) => ({
      ...current,
      provider,
      baseURL: meta[2],
      priority: provider === 'ollama' ? 1 : 100,
      label: current.id ? current.label : `${meta[1]} principal`,
    }))
  }

  function edit(integration: Integration) {
    setForm({
      id: integration.id,
      label: integration.label,
      provider: integration.provider,
      enabled: integration.enabled !== false,
      priority: Number(integration.priority || 100),
      baseURL: integration.baseURL || providerMeta(integration.provider)[2],
      defaultModel: integration.defaultModel || '',
      expiresAt: integration.expiresAt ? integration.expiresAt.slice(0, 16) : '',
      apiKey: '',
      apiSecret: '',
      cloudName: '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() {
    setForm(EMPTY_FORM)
    setNotice(null)
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      const credentials = isCloudinary
        ? { cloudName: form.cloudName, apiKey: form.apiKey, apiSecret: form.apiSecret }
        : { apiKey: form.apiKey }
      const response = await fetch('/api/integrations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          label: form.label,
          provider: form.provider,
          enabled: form.enabled,
          priority: form.priority,
          baseURL: form.baseURL,
          defaultModel: form.defaultModel,
          expiresAt: form.expiresAt || null,
          credentials,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar.')
      setNotice({ type: 'success', text: form.id ? 'Integración actualizada.' : 'Credencial cifrada y guardada.' })
      reset()
      await load()
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar.' })
    } finally {
      setSaving(false)
    }
  }

  async function test(id: string | number) {
    setTesting(id)
    setNotice(null)
    try {
      const response = await fetch('/api/integrations/test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'La prueba falló.')
      setNotice({ type: 'success', text: `Conexión verificada. ${data.result.models?.length || 0} modelos disponibles.` })
      await load()
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'La prueba falló.' })
      await load()
    } finally {
      setTesting(null)
    }
  }

  async function setDefaultModel(integration: Integration, model: string) {
    const response = await fetch('/api/integrations', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: integration.id,
        label: integration.label,
        provider: integration.provider,
        enabled: integration.enabled,
        priority: integration.priority,
        baseURL: integration.baseURL,
        defaultModel: model,
        expiresAt: integration.expiresAt,
      }),
    })
    const data = await response.json()
    if (!response.ok || !data.ok) {
      setNotice({ type: 'error', text: data.error || 'No se pudo seleccionar el modelo.' })
      return
    }
    setNotice({ type: 'success', text: `Modelo predeterminado: ${model}` })
    await load()
  }

  async function remove(id: string | number) {
    if (!window.confirm('¿Eliminar esta integración y su credencial cifrada?')) return
    const response = await fetch(`/api/integrations?id=${encodeURIComponent(String(id))}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await response.json()
    if (!response.ok || !data.ok) {
      setNotice({ type: 'error', text: data.error || 'No se pudo eliminar.' })
      return
    }
    setNotice({ type: 'success', text: 'Integración eliminada.' })
    await load()
  }

  return (
    <main className="studio-page">
      <div className="studio-page-head">
        <div>
          <p className="studio-kicker">Credenciales / Modelos / Consumo</p>
          <h1>Centro de integraciones</h1>
          <p>
            Guarda claves cifradas, prueba cada servicio desde el servidor y elige los modelos que utilizará
            FabrickBuild AI Studio. Ollama Cloud recibe prioridad automática.
          </p>
        </div>
        <button className="studio-button" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar
        </button>
      </div>

      {notice && (
        <div className={`studio-notice studio-notice-${notice.type}`} style={{ marginBottom: 16 }}>
          {notice.text}
        </div>
      )}

      <div className="integration-layout">
        <section className="studio-card">
          <div className="studio-card-head">
            <div><h2>{form.id ? 'Editar integración' : 'Nueva integración'}</h2><p>Las claves no vuelven al navegador después de guardarse.</p></div>
            <span className="studio-pill"><KeyRound size={13} /> AES-256-GCM</span>
          </div>
          <form className="integration-form" onSubmit={save}>
            <div className="studio-form-grid">
              <div className="studio-field studio-field-wide">
                <label>Proveedor</label>
                <select className="studio-select" value={form.provider} onChange={(event) => changeProvider(event.target.value)}>
                  {PROVIDERS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </div>
              <div className="studio-field">
                <label>Nombre visible</label>
                <input className="studio-input" value={form.label} onChange={(event) => setField('label', event.target.value)} required />
              </div>
              <div className="studio-field">
                <label>Prioridad</label>
                <input className="studio-input" type="number" min="0" value={form.priority} onChange={(event) => setField('priority', Number(event.target.value))} />
              </div>
              <div className="studio-field studio-field-wide">
                <label>URL base</label>
                <input className="studio-input" value={form.baseURL} onChange={(event) => setField('baseURL', event.target.value)} required />
                <small>Predeterminada: {selectedProvider[2]}</small>
              </div>

              {isCloudinary && (
                <div className="studio-field">
                  <label>Cloud name</label>
                  <input className="studio-input" value={form.cloudName} onChange={(event) => setField('cloudName', event.target.value)} placeholder={form.id ? 'Vacío conserva el actual' : 'mi-cloud'} />
                </div>
              )}
              <div className="studio-field">
                <label>{isCloudinary ? 'API key' : 'Clave API'}</label>
                <input className="studio-input" type="password" autoComplete="new-password" value={form.apiKey} onChange={(event) => setField('apiKey', event.target.value)} placeholder={form.id ? 'Vacío conserva la clave actual' : 'Pegar clave'} />
              </div>
              {isCloudinary && (
                <div className="studio-field">
                  <label>API secret</label>
                  <input className="studio-input" type="password" autoComplete="new-password" value={form.apiSecret} onChange={(event) => setField('apiSecret', event.target.value)} placeholder={form.id ? 'Vacío conserva el actual' : 'Pegar secreto'} />
                </div>
              )}
              {isAI && (
                <div className="studio-field">
                  <label>Modelo predeterminado</label>
                  <input className="studio-input" value={form.defaultModel} onChange={(event) => setField('defaultModel', event.target.value)} placeholder="Se puede elegir después de probar" />
                </div>
              )}
              <div className="studio-field">
                <label>Expiración conocida</label>
                <input className="studio-input" type="datetime-local" value={form.expiresAt} onChange={(event) => setField('expiresAt', event.target.value)} />
                <small>{form.provider === 'ollama' ? 'Las claves Ollama no caducan automáticamente.' : 'Déjalo vacío cuando el proveedor no exponga esta fecha.'}</small>
              </div>
              <label className="ai-checkbox studio-field-wide">
                <input type="checkbox" checked={form.enabled} onChange={(event) => setField('enabled', event.target.checked)} />
                Integración habilitada
              </label>
            </div>
            <div className="studio-toolbar">
              <button className="studio-button studio-button-primary" type="submit" disabled={saving}>
                {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                {form.id ? 'Guardar cambios' : 'Cifrar y guardar'}
              </button>
              {form.id && <button className="studio-button" type="button" onClick={reset}>Cancelar</button>}
            </div>
          </form>
        </section>

        <section className="studio-card">
          <div className="studio-card-head">
            <div><h2>Integraciones configuradas</h2><p>Prueba, inspecciona modelos y controla el consumo acumulado.</p></div>
            <span className="studio-pill"><PlugZap size={13} /> {integrations.length} activas</span>
          </div>
          <div className="integration-list">
            {loading && !integrations.length && <><div className="studio-skeleton" /><div className="studio-skeleton" /></>}
            {!loading && !integrations.length && <div className="studio-notice">Aún no hay integraciones. Comienza por Ollama Cloud.</div>}
            {integrations.map((integration) => {
              const models = Array.isArray(integration.models) ? integration.models : []
              const usage = integration.usage || {}
              const statusOK = integration.status === 'connected'
              const cloudUsage = usage.provider || {}
              return (
                <article className="integration-card" key={integration.id}>
                  <div className="integration-card-top">
                    <div>
                      <div className="studio-toolbar">
                        <span className="studio-pill">{providerIcon(integration.provider)} {providerMeta(integration.provider)[1]}</span>
                        <span className={`studio-pill ${statusOK ? 'studio-pill-ok' : integration.status === 'error' ? 'studio-pill-error' : ''}`}>
                          {statusOK ? <CheckCircle2 size={13} /> : integration.status === 'error' ? <XCircle size={13} /> : <PlugZap size={13} />}
                          {statusOK ? 'Conectada' : integration.status === 'error' ? 'Con error' : 'Sin probar'}
                        </span>
                      </div>
                      <h3 style={{ marginTop: 10 }}>{integration.label}</h3>
                      <p>{integration.baseURL} · {integration.credentialHint || 'Credencial protegida'}</p>
                    </div>
                    <span className="studio-pill">Prioridad {integration.priority ?? 100}</span>
                  </div>

                  <div className="integration-meta">
                    <div><small>Modelos</small><strong>{number(models.length)}</strong></div>
                    <div><small>Tokens</small><strong>{number(usage.totalTokens)}</strong></div>
                    <div><small>Solicitudes</small><strong>{number(usage.requests)}</strong></div>
                    <div><small>Tiempo activo</small><strong>{duration(usage.activeMilliseconds)}</strong></div>
                    <div><small>Última prueba</small><strong>{date(integration.lastTestedAt)}</strong></div>
                    <div><small>Último uso</small><strong>{date(integration.lastUsedAt)}</strong></div>
                    <div><small>Expiración</small><strong>{integration.provider === 'ollama' && !integration.expiresAt ? 'No expira' : integration.expiresAt ? date(integration.expiresAt) : 'No informada'}</strong></div>
                    <div><small>Modelo actual</small><strong>{integration.defaultModel || 'Sin seleccionar'}</strong></div>
                  </div>

                  {Object.keys(cloudUsage).length > 0 && (
                    <div className="studio-notice" style={{ marginTop: 12 }}>
                      {cloudUsage.plan && <strong>Plan: {String(cloudUsage.plan)}. </strong>}
                      Datos de uso disponibles: {Object.keys(cloudUsage).join(', ')}.
                    </div>
                  )}
                  {integration.lastError && <div className="studio-notice studio-notice-error" style={{ marginTop: 12 }}>{integration.lastError}</div>}

                  {models.length > 0 && (
                    <div className="integration-models">
                      <select className="studio-select" value={integration.defaultModel || ''} onChange={(event) => void setDefaultModel(integration, event.target.value)}>
                        <option value="">Seleccionar modelo predeterminado</option>
                        {models.map((model) => (
                          <option key={model.id} value={model.id}>{model.name || model.id}{model.contextLength ? ` · ${number(model.contextLength)} ctx` : ''}</option>
                        ))}
                      </select>
                      <span className="studio-pill">{models.length} disponibles</span>
                    </div>
                  )}

                  <div className="integration-actions">
                    <button className="studio-button studio-button-violet" type="button" onClick={() => void test(integration.id)} disabled={testing === integration.id}>
                      {testing === integration.id ? <Loader2 size={15} className="spin" /> : <PlugZap size={15} />} Probar clave
                    </button>
                    <button className="studio-button" type="button" onClick={() => edit(integration)}><Pencil size={15} /> Editar</button>
                    <button className="studio-button studio-button-danger" type="button" onClick={() => void remove(integration.id)}><Trash2 size={15} /> Eliminar</button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
