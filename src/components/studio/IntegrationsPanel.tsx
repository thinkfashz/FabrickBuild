'use client'

import {
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Pencil,
  PlugZap,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

type Usage = {
  requests?: number
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  activeMilliseconds?: number
  rateLimit?: Record<string, string | number | null>
  provider?: Record<string, unknown>
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
  connectionMode?: 'automatic' | 'manual'
  baseURL?: string
  defaultModel?: string
  status?: string
  vaultState?: string
  credentialHint?: string
  credentialFingerprint?: string
  credentialKeyVersion?: number
  expiresAt?: string | null
  lastConnectedAt?: string | null
  lastTestedAt?: string | null
  lastUsedAt?: string | null
  lastError?: string | null
  lockedUntil?: string | null
  failedConnectionAttempts?: number
  models?: Model[]
  capabilities?: string[]
  usage?: Usage
  lastTestUsage?: Usage
}

type ProviderDefinition = {
  id: string
  label: string
  short: string
  description: string
  baseURL: string
  kind: 'ai' | 'email' | 'media'
  icon: ReactNode
  keyLabel: string
  keyPlaceholder: string
  optionalKey?: boolean
}

type FormState = {
  id?: string | number
  provider: string
  label: string
  enabled: boolean
  priority: number
  connectionMode: 'automatic' | 'manual'
  baseURL: string
  defaultModel: string
  expiresAt: string
  apiKey: string
  apiSecret: string
  cloudName: string
}

type ConnectionState = 'idle' | 'waiting' | 'connecting' | 'connected' | 'error'

const PROVIDERS: ProviderDefinition[] = [
  {
    id: 'ollama',
    label: 'Ollama Cloud',
    short: 'Ollama',
    description: 'Prioridad para modelos cloud y razonamiento transmitido.',
    baseURL: 'https://ollama.com',
    kind: 'ai',
    icon: <Sparkles size={19} />,
    keyLabel: 'Ollama API key',
    keyPlaceholder: 'Pega la clave creada en ollama.com',
  },
  {
    id: 'openai',
    label: 'OpenAI / ChatGPT',
    short: 'OpenAI',
    description: 'Modelos GPT disponibles para tu organización.',
    baseURL: 'https://api.openai.com',
    kind: 'ai',
    icon: <Bot size={19} />,
    keyLabel: 'OpenAI API key',
    keyPlaceholder: 'sk-proj-…',
  },
  {
    id: 'anthropic',
    label: 'Anthropic / Claude',
    short: 'Claude',
    description: 'Claude y flujos compatibles con Claude Code.',
    baseURL: 'https://api.anthropic.com',
    kind: 'ai',
    icon: <Bot size={19} />,
    keyLabel: 'Anthropic API key',
    keyPlaceholder: 'sk-ant-…',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    short: 'OpenRouter',
    description: 'Catálogo unificado de múltiples proveedores.',
    baseURL: 'https://openrouter.ai',
    kind: 'ai',
    icon: <Zap size={19} />,
    keyLabel: 'OpenRouter API key',
    keyPlaceholder: 'sk-or-…',
  },
  {
    id: 'glm',
    label: 'Z.AI / GLM',
    short: 'GLM',
    description: 'Modelos GLM para código y razonamiento.',
    baseURL: 'https://api.z.ai/api/paas/v4',
    kind: 'ai',
    icon: <Bot size={19} />,
    keyLabel: 'Z.AI API key',
    keyPlaceholder: 'Pega tu clave de Z.AI',
  },
  {
    id: 'custom-openai',
    label: 'OpenAI compatible / OpenCode',
    short: 'Compatible',
    description: 'Ollama local, OpenCode, proxy o gateway compatible.',
    baseURL: 'http://127.0.0.1:11434',
    kind: 'ai',
    icon: <PlugZap size={19} />,
    keyLabel: 'API key opcional',
    keyPlaceholder: 'Vacío cuando el servidor local no exige clave',
    optionalKey: true,
  },
  {
    id: 'resend',
    label: 'Resend',
    short: 'Resend',
    description: 'Correo transaccional y notificaciones del CMS.',
    baseURL: 'https://api.resend.com',
    kind: 'email',
    icon: <Mail size={19} />,
    keyLabel: 'Resend API key',
    keyPlaceholder: 're_…',
  },
  {
    id: 'cloudinary',
    label: 'Cloudinary',
    short: 'Cloudinary',
    description: 'Biblioteca, optimización y administración multimedia.',
    baseURL: 'https://api.cloudinary.com',
    kind: 'media',
    icon: <Cloud size={19} />,
    keyLabel: 'API key',
    keyPlaceholder: 'API key de Cloudinary',
  },
]

function providerByID(id: string) {
  return PROVIDERS.find((provider) => provider.id === id) || PROVIDERS[0]
}

function emptyForm(providerID = 'ollama'): FormState {
  const provider = providerByID(providerID)
  return {
    provider: provider.id,
    label: `${provider.label} principal`,
    enabled: true,
    priority: provider.id === 'ollama' ? 1 : 100,
    connectionMode: 'automatic',
    baseURL: provider.baseURL,
    defaultModel: '',
    expiresAt: '',
    apiKey: '',
    apiSecret: '',
    cloudName: '',
  }
}

function formatDate(value?: null | string) {
  if (!value) return 'Sin registro'
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDuration(milliseconds = 0) {
  const seconds = Math.round(milliseconds / 1000)
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ${seconds % 60} s`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

function formatNumber(value?: number) {
  return new Intl.NumberFormat('es-CL').format(Number(value || 0))
}

function credentialStrength(form: FormState) {
  if (form.provider === 'custom-openai' && !form.apiKey) return 4
  const secret = form.provider === 'cloudinary'
    ? `${form.cloudName}${form.apiKey}${form.apiSecret}`
    : form.apiKey
  if (!secret) return 0
  if (secret.length < 12) return 1
  if (secret.length < 24) return 2
  if (secret.length < 40) return 3
  return 4
}

function credentialsComplete(form: FormState) {
  if (form.provider === 'cloudinary') {
    return form.cloudName.trim().length >= 2 && form.apiKey.trim().length >= 4 && form.apiSecret.trim().length >= 8
  }
  if (form.provider === 'custom-openai') {
    return /^https?:\/\//i.test(form.baseURL.trim())
  }
  return form.apiKey.trim().length >= 8
}

function statusPill(integration: Integration) {
  if (integration.status === 'connected') {
    return <span className="studio-pill studio-pill-ok"><CheckCircle2 size={13} /> Conectada</span>
  }
  if (integration.status === 'locked') {
    return <span className="studio-pill studio-pill-error"><LockKeyhole size={13} /> Bloqueada</span>
  }
  if (integration.status === 'error') {
    return <span className="studio-pill studio-pill-error"><XCircle size={13} /> Error</span>
  }
  return <span className="studio-pill"><PlugZap size={13} /> Sin probar</span>
}

export default function IntegrationsPanel() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [form, setForm] = useState<FormState>(() => emptyForm())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | number | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [autoConnect, setAutoConnect] = useState(true)
  const [dirtyCredentials, setDirtyCredentials] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const autoSignature = useRef('')

  const provider = useMemo(() => providerByID(form.provider), [form.provider])
  const isCloudinary = form.provider === 'cloudinary'
  const isAI = provider.kind === 'ai'
  const complete = credentialsComplete(form)
  const strength = credentialStrength(form)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/integrations', {
        credentials: 'include',
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No se pudieron cargar las integraciones.')
      }
      setIntegrations(data.integrations || [])
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error de conexión.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    if (['apiKey', 'apiSecret', 'cloudName', 'baseURL'].includes(key)) {
      setDirtyCredentials(true)
      setConnectionState('waiting')
    }
  }

  function selectProvider(providerID: string) {
    const next = emptyForm(providerID)
    setForm(next)
    setDirtyCredentials(false)
    setConnectionState('idle')
    setNotice(null)
    setShowSecret(false)
    autoSignature.current = ''
  }

  function editIntegration(integration: Integration) {
    setForm({
      id: integration.id,
      provider: integration.provider,
      label: integration.label,
      enabled: integration.enabled !== false,
      priority: Number(integration.priority || 100),
      connectionMode: integration.connectionMode || 'automatic',
      baseURL: integration.baseURL || providerByID(integration.provider).baseURL,
      defaultModel: integration.defaultModel || '',
      expiresAt: integration.expiresAt ? integration.expiresAt.slice(0, 16) : '',
      apiKey: '',
      apiSecret: '',
      cloudName: '',
    })
    setDirtyCredentials(false)
    setConnectionState(integration.status === 'connected' ? 'connected' : 'idle')
    setAdvancedOpen(false)
    setNotice(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setForm(emptyForm())
    setDirtyCredentials(false)
    setConnectionState('idle')
    setNotice(null)
    setAdvancedOpen(false)
    autoSignature.current = ''
  }

  const connect = useCallback(async (source: 'auto' | 'manual' = 'manual') => {
    if (!credentialsComplete(form) || saving) return
    setSaving(true)
    setConnectionState('connecting')
    setNotice(null)

    try {
      const credentials = isCloudinary
        ? {
            cloudName: form.cloudName,
            apiKey: form.apiKey,
            apiSecret: form.apiSecret,
          }
        : { apiKey: form.apiKey }

      const response = await fetch('/api/integrations/connect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          provider: form.provider,
          label: form.label || `${provider.label} principal`,
          enabled: form.enabled,
          priority: form.priority,
          connectionMode: autoConnect ? 'automatic' : 'manual',
          baseURL: form.baseURL,
          defaultModel: form.defaultModel,
          expiresAt: form.expiresAt || null,
          credentials,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo validar la credencial.')
      }

      const integration = data.integration as Integration
      setForm((current) => ({
        ...current,
        id: integration.id,
        apiKey: '',
        apiSecret: '',
        cloudName: '',
        defaultModel: integration.defaultModel || data.result?.models?.[0]?.id || '',
      }))
      setDirtyCredentials(false)
      setConnectionState('connected')
      setNotice({
        type: 'success',
        text: `${provider.label} conectado, cifrado y guardado. ${data.result?.models?.length || 0} modelos detectados.`,
      })
      await load()
    } catch (error) {
      setConnectionState('error')
      setNotice({
        type: 'error',
        text: `${source === 'auto' ? 'Conexión automática' : 'Conexión'}: ${error instanceof Error ? error.message : 'falló la validación.'}`,
      })
      await load()
    } finally {
      setSaving(false)
    }
  }, [autoConnect, form, isCloudinary, load, provider.label, saving])

  useEffect(() => {
    if (!autoConnect || !dirtyCredentials || !complete || saving) return
    const signature = JSON.stringify([
      form.id,
      form.provider,
      form.baseURL,
      form.apiKey,
      form.apiSecret,
      form.cloudName,
    ])
    if (signature === autoSignature.current) return

    setConnectionState('waiting')
    const timeout = window.setTimeout(() => {
      autoSignature.current = signature
      void connect('auto')
    }, 900)
    return () => window.clearTimeout(timeout)
  }, [autoConnect, complete, connect, dirtyCredentials, form, saving])

  async function saveMetadata(event: FormEvent) {
    event.preventDefault()
    if (!form.id) {
      await connect('manual')
      return
    }

    setSaving(true)
    setNotice(null)
    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          provider: form.provider,
          label: form.label,
          enabled: form.enabled,
          priority: form.priority,
          connectionMode: autoConnect ? 'automatic' : 'manual',
          baseURL: form.baseURL,
          defaultModel: form.defaultModel,
          expiresAt: form.expiresAt || null,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar.')
      setNotice({ type: 'success', text: 'Configuración actualizada sin exponer la credencial.' })
      await load()
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar.' })
    } finally {
      setSaving(false)
    }
  }

  async function retest(integration: Integration) {
    setTesting(integration.id)
    setNotice(null)
    try {
      const response = await fetch('/api/integrations/test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: integration.id }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'La prueba falló.')
      setNotice({
        type: 'success',
        text: `Conexión verificada. ${data.result.models?.length || 0} modelos disponibles.`,
      })
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
        provider: integration.provider,
        label: integration.label,
        enabled: integration.enabled,
        priority: integration.priority,
        connectionMode: integration.connectionMode,
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

  async function removeIntegration(id: string | number) {
    if (!window.confirm('¿Eliminar esta integración y su bóveda cifrada?')) return
    const response = await fetch(`/api/integrations?id=${encodeURIComponent(String(id))}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await response.json()
    if (!response.ok || !data.ok) {
      setNotice({ type: 'error', text: data.error || 'No se pudo eliminar.' })
      return
    }
    setNotice({ type: 'success', text: 'Integración y credencial cifrada eliminadas.' })
    if (String(form.id || '') === String(id)) resetForm()
    await load()
  }

  return (
    <main className="studio-page integration-vault-page">
      <div className="studio-page-head integration-hero-head">
        <div>
          <p className="studio-kicker">Bóveda cifrada / Conexión automática / Modelos</p>
          <h1>Conecta un proveedor en segundos.</h1>
          <p>
            Selecciona el servicio y pega la credencial. FabrickBuild la valida desde el servidor,
            la cifra, la guarda en PostgreSQL y carga los modelos sin mostrar pasos innecesarios.
          </p>
        </div>
        <div className="studio-toolbar">
          <span className="studio-pill studio-pill-ok"><ShieldCheck size={14} /> Vault v2</span>
          <button className="studio-button" type="button" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      <section className="vault-security-strip" aria-label="Proceso de seguridad">
        <div className={form.provider ? 'active' : ''}><span>1</span><strong>Proveedor</strong><small>Seleccionado</small></div>
        <i />
        <div className={complete ? 'active' : ''}><span>2</span><strong>Validación</strong><small>Servidor a servidor</small></div>
        <i />
        <div className={connectionState === 'connected' ? 'active' : ''}><span>3</span><strong>Cifrado</strong><small>AES-256-GCM + HKDF</small></div>
        <i />
        <div className={connectionState === 'connected' ? 'active' : ''}><span>4</span><strong>Base de datos</strong><small>Secreto sellado</small></div>
      </section>

      {notice && (
        <div className={`studio-notice studio-notice-${notice.type} studio-enter`} style={{ marginBottom: 16 }}>
          {notice.text}
        </div>
      )}

      <div className="provider-picker" role="list" aria-label="Proveedores disponibles">
        {PROVIDERS.map((item) => (
          <button
            type="button"
            role="listitem"
            key={item.id}
            className={`provider-tile ${form.provider === item.id ? 'selected' : ''}`}
            onClick={() => selectProvider(item.id)}
          >
            <span className="provider-tile-icon">{item.icon}</span>
            <span><strong>{item.short}</strong><small>{item.kind === 'ai' ? 'IA' : item.kind === 'email' ? 'Correo' : 'Media'}</small></span>
            {form.provider === item.id && <Check size={16} />}
          </button>
        ))}
      </div>

      <div className="integration-connect-layout">
        <section className="studio-card vault-connect-card">
          <div className="studio-card-head">
            <div>
              <h2>{form.id ? `Actualizar ${provider.label}` : provider.label}</h2>
              <p>{provider.description}</p>
            </div>
            <span className={`studio-pill ${connectionState === 'connected' ? 'studio-pill-ok' : connectionState === 'error' ? 'studio-pill-error' : ''}`}>
              {connectionState === 'connecting' && <Loader2 size={13} className="spin" />}
              {connectionState === 'connected' && <CheckCircle2 size={13} />}
              {connectionState === 'error' && <XCircle size={13} />}
              {connectionState === 'idle' && <KeyRound size={13} />}
              {connectionState === 'waiting' && <Zap size={13} />}
              {connectionState === 'connecting' ? 'Validando' : connectionState === 'connected' ? 'Conectada' : connectionState === 'error' ? 'Revisar clave' : connectionState === 'waiting' ? 'Lista para conectar' : 'Esperando clave'}
            </span>
          </div>

          <form className="vault-connect-form" onSubmit={saveMetadata}>
            {isCloudinary && (
              <div className="studio-field">
                <label>Cloud name</label>
                <input
                  className="studio-input studio-input-large"
                  value={form.cloudName}
                  onChange={(event) => setField('cloudName', event.target.value)}
                  placeholder="Nombre de tu cloud"
                  autoComplete="off"
                />
              </div>
            )}

            <div className="studio-field">
              <label>{provider.keyLabel}</label>
              <div className="vault-secret-input">
                <LockKeyhole size={18} />
                <input
                  value={form.apiKey}
                  onChange={(event) => setField('apiKey', event.target.value)}
                  type={showSecret ? 'text' : 'password'}
                  placeholder={form.id ? 'Pega una nueva clave para rotarla' : provider.keyPlaceholder}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowSecret((current) => !current)} aria-label={showSecret ? 'Ocultar clave' : 'Mostrar clave'}>
                  {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {provider.optionalKey && <small>La clave puede quedar vacía para un Ollama local sin autenticación.</small>}
            </div>

            {isCloudinary && (
              <div className="studio-field">
                <label>API secret</label>
                <div className="vault-secret-input">
                  <LockKeyhole size={18} />
                  <input
                    value={form.apiSecret}
                    onChange={(event) => setField('apiSecret', event.target.value)}
                    type={showSecret ? 'text' : 'password'}
                    placeholder={form.id ? 'Pega un secreto nuevo para rotarlo' : 'API secret de Cloudinary'}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            <div className="vault-strength" aria-label={`Fortaleza ${strength} de 4`}>
              <div>{[1, 2, 3, 4].map((level) => <i key={level} className={strength >= level ? 'active' : ''} />)}</div>
              <span>{strength === 0 ? 'Esperando credencial' : strength < 3 ? 'Credencial corta' : strength === 3 ? 'Fortaleza adecuada' : 'Fortaleza alta'}</span>
            </div>

            <label className="vault-auto-toggle">
              <input type="checkbox" checked={autoConnect} onChange={(event) => setAutoConnect(event.target.checked)} />
              <span><Zap size={16} /><strong>Conectar automáticamente</strong><small>Valida y guarda 0,9 segundos después de completar la credencial.</small></span>
            </label>

            <button
              type="button"
              className="studio-button studio-button-primary vault-main-action"
              onClick={() => void connect('manual')}
              disabled={!complete || saving}
            >
              {saving ? <Loader2 size={17} className="spin" /> : <PlugZap size={17} />}
              {saving ? 'Validando y cifrando…' : form.id ? 'Rotar o reconectar clave' : 'Conectar y guardar'}
            </button>

            <button
              className="vault-advanced-trigger"
              type="button"
              onClick={() => setAdvancedOpen((current) => !current)}
              aria-expanded={advancedOpen}
            >
              Configuración avanzada <ChevronDown size={16} className={advancedOpen ? 'open' : ''} />
            </button>

            {advancedOpen && (
              <div className="vault-advanced studio-enter">
                <div className="studio-form-grid">
                  <div className="studio-field">
                    <label>Nombre visible</label>
                    <input className="studio-input" value={form.label} onChange={(event) => setField('label', event.target.value)} />
                  </div>
                  <div className="studio-field">
                    <label>Prioridad</label>
                    <input className="studio-input" type="number" min="0" value={form.priority} onChange={(event) => setField('priority', Number(event.target.value))} />
                  </div>
                  <div className="studio-field studio-field-wide">
                    <label>URL base</label>
                    <input className="studio-input" value={form.baseURL} onChange={(event) => setField('baseURL', event.target.value)} />
                  </div>
                  {isAI && (
                    <div className="studio-field">
                      <label>Modelo predeterminado</label>
                      <input className="studio-input" value={form.defaultModel} onChange={(event) => setField('defaultModel', event.target.value)} placeholder="Se completa al conectar" />
                    </div>
                  )}
                  <div className="studio-field">
                    <label>Expiración conocida</label>
                    <input className="studio-input" type="datetime-local" value={form.expiresAt} onChange={(event) => setField('expiresAt', event.target.value)} />
                  </div>
                  <label className="ai-checkbox studio-field-wide">
                    <input type="checkbox" checked={form.enabled} onChange={(event) => setField('enabled', event.target.checked)} /> Integración habilitada
                  </label>
                </div>
                <div className="studio-toolbar">
                  <button className="studio-button" type="submit" disabled={saving || !form.id}><Save size={15} /> Guardar metadatos</button>
                  <button className="studio-button" type="button" onClick={resetForm}><RotateCcw size={15} /> Nueva conexión</button>
                </div>
              </div>
            )}
          </form>
        </section>

        <aside className="studio-card vault-summary-card">
          <div className="studio-card-head">
            <div><h2>Bóveda actual</h2><p>Estado real guardado en PostgreSQL.</p></div>
            <span className="studio-pill"><ShieldCheck size={13} /> {integrations.length} selladas</span>
          </div>
          <div className="vault-summary-list">
            {loading && !integrations.length && <><div className="studio-skeleton" /><div className="studio-skeleton" /></>}
            {!loading && !integrations.length && (
              <div className="vault-empty">
                <LockKeyhole size={28} />
                <strong>La bóveda está vacía</strong>
                <p>Selecciona Ollama Cloud o cualquier proveedor y pega la clave.</p>
              </div>
            )}
            {integrations.map((integration) => {
              const definition = providerByID(integration.provider)
              const models = Array.isArray(integration.models) ? integration.models : []
              const usage = integration.usage || {}
              return (
                <article className={`vault-provider-card ${integration.status === 'connected' ? 'connected' : ''}`} key={integration.id}>
                  <div className="vault-provider-head">
                    <span className="provider-tile-icon">{definition.icon}</span>
                    <div><h3>{integration.label}</h3><p>{definition.label} · {integration.credentialHint || 'credencial sellada'}</p></div>
                    {statusPill(integration)}
                  </div>

                  <div className="vault-provider-metrics">
                    <div><small>Modelos</small><strong>{formatNumber(models.length)}</strong></div>
                    <div><small>Tokens</small><strong>{formatNumber(usage.totalTokens)}</strong></div>
                    <div><small>Solicitudes</small><strong>{formatNumber(usage.requests)}</strong></div>
                    <div><small>Tiempo activo</small><strong>{formatDuration(usage.activeMilliseconds)}</strong></div>
                  </div>

                  <div className="vault-provider-security">
                    <span><ShieldCheck size={14} /> Vault v{integration.credentialKeyVersion || 1}</span>
                    <span>Huella {integration.credentialFingerprint || 'legacy'}</span>
                    <span>Conectada {formatDate(integration.lastConnectedAt)}</span>
                    <span>{integration.expiresAt ? `Expira ${formatDate(integration.expiresAt)}` : integration.provider === 'ollama' ? 'Sin expiración automática' : 'Expiración no informada'}</span>
                  </div>

                  {models.length > 0 && (
                    <select
                      className="studio-select"
                      value={integration.defaultModel || ''}
                      onChange={(event) => void setDefaultModel(integration, event.target.value)}
                    >
                      <option value="">Seleccionar modelo predeterminado</option>
                      {models.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name || item.id}{item.contextLength ? ` · ${formatNumber(item.contextLength)} ctx` : ''}
                        </option>
                      ))}
                    </select>
                  )}

                  {integration.lockedUntil && new Date(integration.lockedUntil).getTime() > Date.now() && (
                    <div className="studio-notice studio-notice-error">Bloqueada hasta {formatDate(integration.lockedUntil)} después de intentos fallidos.</div>
                  )}
                  {integration.lastError && <div className="studio-notice studio-notice-error">{integration.lastError}</div>}

                  <div className="integration-actions">
                    <button className="studio-button studio-button-violet" type="button" onClick={() => void retest(integration)} disabled={testing === integration.id || integration.status === 'locked'}>
                      {testing === integration.id ? <Loader2 size={15} className="spin" /> : <PlugZap size={15} />} Probar
                    </button>
                    <button className="studio-button" type="button" onClick={() => editIntegration(integration)}><Pencil size={15} /> Configurar</button>
                    <button className="studio-button studio-button-danger" type="button" onClick={() => void removeIntegration(integration.id)}><Trash2 size={15} /> Eliminar</button>
                  </div>
                </article>
              )
            })}
          </div>
        </aside>
      </div>
    </main>
  )
}
