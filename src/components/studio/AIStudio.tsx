'use client'

import {
  ArrowUp,
  Bot,
  Braces,
  Check,
  Code2,
  Command,
  Eye,
  FileCode2,
  ImageIcon,
  LayoutTemplate,
  Loader2,
  MonitorSmartphone,
  Paperclip,
  RefreshCcw,
  Send,
  Sparkles,
  Undo2,
  WandSparkles,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'

type Model = { id: string; name?: string; contextLength?: number; capabilities?: string[] }
type Integration = {
  id: string | number
  label: string
  provider: string
  enabled?: boolean
  priority?: number
  status?: string
  defaultModel?: string
  models?: Model[]
  usage?: Record<string, number>
}
type PageDoc = { id: string | number; title: string; slug: string; _status?: string }
type Message = { id: string; role: 'assistant' | 'user'; content: string }
type Proposal = {
  id: string
  title: string
  summary: string
  html: string
  css: string
  layout: Record<string, unknown>[]
}
type Usage = {
  requests?: number
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  activeMilliseconds?: number
}
type CommandSuggestion = {
  icon: React.ReactNode
  label: string
  description: string
  prefix: string
  design: boolean
}

const commands: CommandSuggestion[] = [
  { icon: <ImageIcon size={16} />, label: 'Clonar interfaz', description: 'Recrear una referencia visual con bloques seguros', prefix: '/clone', design: true },
  { icon: <LayoutTemplate size={16} />, label: 'Crear página', description: 'Generar dos propuestas de página completa', prefix: '/page', design: true },
  { icon: <Sparkles size={16} />, label: 'Mejorar diseño', description: 'Reestructurar una página existente', prefix: '/improve', design: true },
  { icon: <Braces size={16} />, label: 'Crear bloque', description: 'Proponer una sección nueva y responsiva', prefix: '/block', design: true },
  { icon: <Code2 size={16} />, label: 'Revisar código', description: 'Conversar sobre arquitectura y código', prefix: '/code', design: false },
]

function useAutoResizeTextarea(minHeight = 64, maxHeight = 210) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const adjustHeight = useCallback((reset = false) => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = `${minHeight}px`
    if (!reset) textarea.style.height = `${Math.min(maxHeight, Math.max(minHeight, textarea.scrollHeight))}px`
  }, [maxHeight, minHeight])
  return { textareaRef, adjustHeight }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatNumber(value?: number) {
  return new Intl.NumberFormat('es-CL').format(Number(value || 0))
}

function formatDuration(milliseconds?: number) {
  const seconds = Math.round(Number(milliseconds || 0) / 1000)
  if (seconds < 60) return `${seconds} s`
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`
}

function previewDocument(proposal: Proposal) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f7f6f1;color:#111}button,a{font:inherit}.ai-page{min-height:100vh;overflow:hidden}.ai-page img{max-width:100%;display:block}
${proposal.css}
</style></head><body><main class="ai-page">${proposal.html}</main></body></html>`
}

function parseSSEChunk(chunk: string) {
  let event = 'message'
  const data: string[] = []
  for (const line of chunk.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    if (line.startsWith('data:')) data.push(line.slice(5).trim())
  }
  return { event, data: data.join('\n') }
}

export default function AIStudio() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [pages, setPages] = useState<PageDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [integrationId, setIntegrationId] = useState<string>('')
  const [model, setModel] = useState('')
  const [mode, setMode] = useState<'chat' | 'design'>('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<{ name: string; content?: string }[]>([])
  const [streaming, setStreaming] = useState(false)
  const [reasoning, setReasoning] = useState('')
  const [lastUsage, setLastUsage] = useState<Usage | null>(null)
  const [error, setError] = useState('')
  const [showPalette, setShowPalette] = useState(false)
  const [activeCommand, setActiveCommand] = useState(0)
  const [targetPageId, setTargetPageId] = useState<string>('')
  const [designPrompt, setDesignPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [changeId, setChangeId] = useState<string | number | null>(null)
  const [selectedProposal, setSelectedProposal] = useState(0)
  const [codeTab, setCodeTab] = useState<'css' | 'html' | 'layout'>('html')
  const [publish, setPublish] = useState(false)
  const [applying, setApplying] = useState(false)
  const [appliedPath, setAppliedPath] = useState('')
  const [rolledBack, setRolledBack] = useState(false)
  const { textareaRef, adjustHeight } = useAutoResizeTextarea()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedIntegration = useMemo(
    () => integrations.find((integration) => String(integration.id) === integrationId),
    [integrationId, integrations],
  )
  const models = useMemo(
    () => (Array.isArray(selectedIntegration?.models) ? selectedIntegration.models : []),
    [selectedIntegration],
  )

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [integrationsResponse, pagesResponse] = await Promise.all([
        fetch('/api/integrations', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/pages?limit=100&depth=0&sort=title', { credentials: 'include', cache: 'no-store' }),
      ])
      const integrationsData = await integrationsResponse.json()
      const pagesData = await pagesResponse.json()
      if (!integrationsResponse.ok || !integrationsData.ok) throw new Error(integrationsData.error || 'No se pudieron cargar los proveedores.')

      const aiIntegrations = (integrationsData.integrations || [])
        .filter((item: Integration) => !['resend', 'cloudinary'].includes(item.provider) && item.enabled !== false)
        .sort((a: Integration, b: Integration) => Number(a.priority || 100) - Number(b.priority || 100))
      setIntegrations(aiIntegrations)
      setPages(Array.isArray(pagesData.docs) ? pagesData.docs : [])

      const preferred = aiIntegrations.find((item: Integration) => item.provider === 'ollama' && item.status === 'connected') || aiIntegrations[0]
      if (preferred) {
        setIntegrationId(String(preferred.id))
        setModel(preferred.defaultModel || preferred.models?.[0]?.id || '')
      }
      const home = (Array.isArray(pagesData.docs) ? pagesData.docs : []).find((item: PageDoc) => item.slug === 'home') || pagesData.docs?.[0]
      if (home) setTargetPageId(String(home.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar AI Studio.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (!selectedIntegration) return
    setModel(selectedIntegration.defaultModel || selectedIntegration.models?.[0]?.id || '')
  }, [selectedIntegration])

  useEffect(() => {
    if (input.startsWith('/') && !input.includes(' ')) {
      setShowPalette(true)
      const found = commands.findIndex((command) => command.prefix.startsWith(input))
      setActiveCommand(found >= 0 ? found : 0)
    } else {
      setShowPalette(false)
    }
  }, [input])

  function selectCommand(command: CommandSuggestion) {
    setInput(`${command.prefix} `)
    setShowPalette(false)
    if (command.design) {
      setMode('design')
      setDesignPrompt(`${command.prefix} `)
    } else {
      setMode('chat')
    }
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (showPalette) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveCommand((current) => (current + 1) % commands.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveCommand((current) => (current - 1 + commands.length) % commands.length)
        return
      }
      if (event.key === 'Tab' || event.key === 'Enter') {
        event.preventDefault()
        selectCommand(commands[activeCommand])
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setShowPalette(false)
        return
      }
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || !integrationId || !model || streaming) return
    const attachmentContext = attachments
      .filter((item) => item.content)
      .map((item) => `\n\nArchivo ${item.name}:\n${item.content}`)
      .join('')
    const userMessage: Message = { id: uid(), role: 'user', content: `${text}${attachmentContext}` }
    const assistantID = uid()
    setMessages((current) => [...current, userMessage, { id: assistantID, role: 'assistant', content: '' }])
    setInput('')
    setAttachments([])
    adjustHeight(true)
    setReasoning('')
    setError('')
    setStreaming(true)
    setLastUsage(null)

    try {
      const history = [...messages, userMessage].slice(-30).map(({ role, content }) => ({ role, content }))
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId,
          model,
          messages: [
            {
              role: 'system',
              content:
                'Eres FabrickBuild AI Studio. Responde en español. Ayuda a crear aplicaciones y páginas seguras, modernas y responsivas. Explica decisiones sin revelar secretos. Usa bloques de código completos cuando corresponda.',
            },
            ...history,
          ],
        }),
      })
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() || ''
        for (const chunk of chunks) {
          if (!chunk.trim()) continue
          const event = parseSSEChunk(chunk)
          if (!event.data) continue
          const value = JSON.parse(event.data)
          if (event.event === 'reasoning') setReasoning((current) => current + String(value))
          if (event.event === 'token') {
            setMessages((current) => current.map((message) => message.id === assistantID ? { ...message, content: message.content + String(value) } : message))
          }
          if (event.event === 'usage') setLastUsage(value as Usage)
          if (event.event === 'error') throw new Error(String(value))
        }
        if (done) break
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'La respuesta fue interrumpida.'
      setError(message)
      setMessages((current) => current.map((item) => item.id === assistantID && !item.content ? { ...item, content: `Error: ${message}` } : item))
    } finally {
      setStreaming(false)
    }
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, 4)
    const next = await Promise.all(files.map(async (file) => {
      const textLike = file.type.startsWith('text/') || /\.(json|js|jsx|ts|tsx|css|html|md|txt)$/i.test(file.name)
      const content = textLike && file.size < 750_000 ? await file.text() : undefined
      return { name: file.name, content }
    }))
    setAttachments((current) => [...current, ...next].slice(0, 4))
    event.target.value = ''
  }

  async function generateDesign() {
    if (!integrationId || !model || !targetPageId || designPrompt.trim().length < 8 || generating) return
    setGenerating(true)
    setError('')
    setProposals([])
    setAppliedPath('')
    setRolledBack(false)
    try {
      const response = await fetch('/api/ai/proposals', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId, model, targetPageId, prompt: designPrompt.trim() }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudieron generar las propuestas.')
      setProposals(data.proposals || [])
      setChangeId(data.changeId)
      setLastUsage(data.usage || null)
      setSelectedProposal(0)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron generar las propuestas.')
    } finally {
      setGenerating(false)
    }
  }

  async function applyDesign() {
    if (!changeId || !proposals[selectedProposal] || applying) return
    setApplying(true)
    setError('')
    try {
      const response = await fetch('/api/ai/apply', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeId, selectedIndex: selectedProposal, publish }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo aplicar el diseño.')
      setAppliedPath(data.path)
      setRolledBack(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo aplicar el diseño.')
    } finally {
      setApplying(false)
    }
  }

  async function rollbackDesign() {
    if (!changeId || applying) return
    setApplying(true)
    setError('')
    try {
      const response = await fetch('/api/ai/rollback', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeId, publish }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo deshacer.')
      setRolledBack(true)
      setAppliedPath('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo deshacer.')
    } finally {
      setApplying(false)
    }
  }

  const selected = proposals[selectedProposal]

  return (
    <main className="studio-page">
      <div className="studio-page-head">
        <div>
          <p className="studio-kicker">Ollama primero / Multi-modelo / Preview seguro</p>
          <h1>Construye, compara y aplica.</h1>
          <p>Conversa con tus modelos, genera dos diseños diferentes y revisa cada preview antes de reemplazar el layout de una página. Todos los cambios conservan snapshot para deshacer.</p>
        </div>
        <div className="studio-toolbar">
          <select className="studio-select" style={{ width: 220 }} value={integrationId} onChange={(event) => setIntegrationId(event.target.value)}>
            <option value="">Proveedor</option>
            {integrations.map((integration) => <option key={integration.id} value={String(integration.id)}>{integration.provider === 'ollama' ? '★ ' : ''}{integration.label}</option>)}
          </select>
          <select className="studio-select" style={{ width: 240 }} value={model} onChange={(event) => setModel(event.target.value)}>
            <option value="">Modelo</option>
            {models.map((item) => <option key={item.id} value={item.id}>{item.name || item.id}</option>)}
            {!models.length && selectedIntegration?.defaultModel && <option value={selectedIntegration.defaultModel}>{selectedIntegration.defaultModel}</option>}
          </select>
          <button className="studio-button" onClick={() => void loadData()} disabled={loading}><RefreshCcw size={15} /> Recargar</button>
        </div>
      </div>

      {error && <div className="studio-notice studio-notice-error" style={{ marginBottom: 16 }}>{error}</div>}
      {!loading && !integrations.length && <div className="studio-notice studio-notice-error" style={{ marginBottom: 16 }}>No hay proveedor IA habilitado. Guarda y prueba Ollama Cloud en Integraciones.</div>}

      <div className="studio-chat-grid">
        <section className="studio-card ai-chat-card">
          <div className="studio-card-head">
            <div><h2>{mode === 'chat' ? 'Chat de construcción digital' : 'Brief de diseño'}</h2><p>{selectedIntegration?.label || 'Selecciona una integración'} · {model || 'sin modelo'}</p></div>
            <div className="studio-toolbar">
              <button className={`studio-button ${mode === 'chat' ? 'studio-button-violet' : ''}`} onClick={() => setMode('chat')}><Bot size={15} /> Chat</button>
              <button className={`studio-button ${mode === 'design' ? 'studio-button-violet' : ''}`} onClick={() => setMode('design')}><WandSparkles size={15} /> Diseñar</button>
            </div>
          </div>

          <div className="ai-messages">
            {!messages.length && (
              <motion.div className="ai-empty" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                <div className="ai-empty-mark"><Bot size={29} /></div>
                <h2>¿Qué vamos a construir?</h2>
                <p>Escribe una instrucción o utiliza una orden rápida. En modo Diseño recibirás dos propuestas con preview, código y aplicación reversible.</p>
                <div className="ai-command-row">
                  {commands.map((command) => <button className="ai-command" key={command.prefix} onClick={() => selectCommand(command)}>{command.icon} {command.label}</button>)}
                </div>
              </motion.div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div key={message.id} className={`ai-message ai-message-${message.role}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <span className="ai-message-label">{message.role === 'user' ? 'Tú' : 'FabrickBuild IA'}</span>
                  {message.content || (streaming && message.role === 'assistant' ? <span className="ai-thinking-line">Generando <span className="ai-thinking-dots"><i /><i /><i /></span></span> : '')}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="ai-composer">
            <div className="ai-composer-box">
              <AnimatePresence>
                {showPalette && (
                  <motion.div className="ai-palette" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
                    {commands.map((command, index) => (
                      <button key={command.prefix} className={activeCommand === index ? 'active' : ''} onMouseDown={(event) => event.preventDefault()} onClick={() => selectCommand(command)}>
                        {command.icon}<span><strong>{command.label}</strong><small style={{ display: 'block' }}>{command.description}</small></span><small>{command.prefix}</small>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <textarea ref={textareaRef} value={input} onChange={(event) => { setInput(event.target.value); adjustHeight() }} onKeyDown={handleKeyDown} placeholder="Escribe / para ver comandos o pide una mejora..." />
              {attachments.length > 0 && <div className="studio-toolbar" style={{ padding: '0 10px 7px' }}>{attachments.map((file, index) => <span className="studio-pill" key={`${file.name}-${index}`}><FileCode2 size={12} />{file.name}<button className="ai-icon-button" style={{ width: 20, height: 20 }} onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={12} /></button></span>)}</div>}
              <div className="ai-composer-actions">
                <div className="ai-composer-left">
                  <input ref={fileInputRef} hidden type="file" multiple onChange={(event) => void handleFiles(event)} />
                  <button className="ai-icon-button" onClick={() => fileInputRef.current?.click()} aria-label="Adjuntar archivo"><Paperclip size={17} /></button>
                  <button className="ai-icon-button" onClick={() => setShowPalette((current) => !current)} aria-label="Comandos"><Command size={17} /></button>
                </div>
                <button className="studio-button studio-button-primary ai-send" onClick={() => void sendMessage()} disabled={!input.trim() || !integrationId || !model || streaming}>
                  {streaming ? <Loader2 size={16} className="spin" /> : <Send size={16} />}<span>Enviar</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="ai-side">
          <section className="studio-card ai-reasoning">
            <div className="studio-card-head">
              <div><h3>Proceso del modelo</h3><p>Streaming de razonamiento cuando el proveedor lo entrega.</p></div>
              {streaming ? <span className="studio-pill"><Loader2 size={13} className="spin" /> En vivo</span> : <span className="studio-pill"><Check size={13} /> Listo</span>}
            </div>
            <div className={`ai-reasoning-body ${reasoning ? 'ai-reasoning-live' : ''}`}>
              {reasoning || (streaming ? <span className="ai-thinking-line">Procesando <span className="ai-thinking-dots"><i /><i /><i /></span></span> : 'El razonamiento compatible aparecerá aquí. Algunos proveedores solo transmiten la respuesta final.')}
            </div>
            {lastUsage && <div className="integration-meta" style={{ padding: '0 12px 12px', marginTop: 0 }}><div><small>Entrada</small><strong>{formatNumber(lastUsage.promptTokens)}</strong></div><div><small>Salida</small><strong>{formatNumber(lastUsage.completionTokens)}</strong></div><div><small>Total</small><strong>{formatNumber(lastUsage.totalTokens)}</strong></div><div><small>Tiempo</small><strong>{formatDuration(lastUsage.activeMilliseconds)}</strong></div></div>}
          </section>

          <section className="studio-card ai-design-panel">
            <div className="studio-card-head">
              <div><h3>Laboratorio de propuestas</h3><p>Dos opciones, preview aislada y aplicación reversible.</p></div>
              <span className="studio-pill"><MonitorSmartphone size={13} /> Responsive</span>
            </div>
            <div className="ai-design-form">
              <div className="studio-form-grid">
                <div className="studio-field">
                  <label>Página objetivo</label>
                  <select className="studio-select" value={targetPageId} onChange={(event) => setTargetPageId(event.target.value)}>
                    <option value="">Seleccionar página</option>
                    {pages.map((page) => <option key={page.id} value={String(page.id)}>{page.title} · /{page.slug === 'home' ? '' : page.slug}</option>)}
                  </select>
                </div>
                <div className="studio-field">
                  <label>Estado al aplicar</label>
                  <label className="ai-checkbox" style={{ minHeight: 44, border: '1px solid var(--studio-border)', borderRadius: 12, padding: '0 12px' }}><input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} /> Publicar inmediatamente</label>
                </div>
                <div className="studio-field studio-field-wide">
                  <label>Describe la página o mejora</label>
                  <textarea className="studio-textarea" value={designPrompt} onChange={(event) => setDesignPrompt(event.target.value)} placeholder="Ejemplo: mejora la portada con una presentación premium, métricas, servicios y CTA, manteniendo la identidad amarilla y negra..." />
                </div>
              </div>
              <button className="studio-button studio-button-primary" onClick={() => void generateDesign()} disabled={generating || !integrationId || !model || !targetPageId || designPrompt.trim().length < 8}>
                {generating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />} Generar dos propuestas
              </button>
            </div>

            {generating && <div style={{ padding: 14 }}><div className="studio-skeleton" style={{ minHeight: 320 }} /></div>}
            {proposals.length > 0 && (
              <>
                <div className="ai-preview-list">
                  {proposals.map((proposal, index) => (
                    <article className={`ai-preview-card ${selectedProposal === index ? 'selected' : ''}`} key={proposal.id}>
                      <div className="ai-preview-card-head"><div><h3>{proposal.title}</h3><p>{proposal.summary}</p></div>{selectedProposal === index && <span className="studio-pill studio-pill-ok"><Check size={12} /> Seleccionada</span>}</div>
                      <iframe className="ai-preview-frame" title={`Preview ${proposal.title}`} sandbox="" srcDoc={previewDocument(proposal)} />
                      <div className="ai-preview-actions"><button className="studio-button" onClick={() => setSelectedProposal(index)}><Eye size={14} /> Seleccionar</button></div>
                    </article>
                  ))}
                </div>

                {selected && <div><div className="ai-code-tabs"><button className={codeTab === 'html' ? 'active' : ''} onClick={() => setCodeTab('html')}>HTML</button><button className={codeTab === 'css' ? 'active' : ''} onClick={() => setCodeTab('css')}>CSS</button><button className={codeTab === 'layout' ? 'active' : ''} onClick={() => setCodeTab('layout')}>Bloques Payload</button></div><pre className="ai-code-view">{codeTab === 'html' ? selected.html : codeTab === 'css' ? selected.css : JSON.stringify(selected.layout, null, 2)}</pre></div>}

                <div className="ai-apply-bar">
                  <div>{appliedPath && !rolledBack ? <div className="studio-notice studio-notice-success">Diseño aplicado en {publish ? 'producción' : 'borrador'}: <a href={appliedPath} target="_blank">abrir página</a></div> : rolledBack ? <div className="studio-notice">Cambio deshecho correctamente.</div> : <span className="studio-pill">Opción {selectedProposal + 1} preparada</span>}</div>
                  <div className="studio-toolbar">
                    {appliedPath && !rolledBack && <button className="studio-button" onClick={() => void rollbackDesign()} disabled={applying}><Undo2 size={15} /> Deshacer</button>}
                    <button className="studio-button studio-button-primary" onClick={() => void applyDesign()} disabled={applying || Boolean(appliedPath && !rolledBack)}>{applying ? <Loader2 size={15} className="spin" /> : <ArrowUp size={15} />} Aplicar diseño</button>
                  </div>
                </div>
              </>
            )}
          </section>
        </aside>
      </div>
    </main>
  )
}
