'use client'

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Blocks,
  Braces,
  Code2,
  Copy,
  Database,
  GripVertical,
  Laptop,
  LayoutDashboard,
  Loader2,
  Maximize2,
  Monitor,
  MousePointer2,
  Plus,
  Redo2,
  Save,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DragEvent, ReactNode } from 'react'

type BuilderBlock = Record<string, any> & { blockType: string; id?: string }
type PageSummary = { id: string | number; title: string; slug: string; _status?: string }
type PageDoc = PageSummary & { layout?: BuilderBlock[]; aiStyle?: string }
type ReusableComponent = {
  id: string | number
  name: string
  slug: string
  description?: string
  category?: string
  status?: string
  layout?: BuilderBlock[]
  styles?: string
  version?: number
}
type AIProposal = {
  id?: string
  title?: string
  summary?: string
  html?: string
  css?: string
  layout?: BuilderBlock[]
}
type AIChange = {
  id: string | number
  title: string
  targetPage?: string | number
  proposals?: AIProposal[]
}
type Device = 'mobile' | 'tablet' | 'desktop' | 'wide'
type CodeTab = 'layout' | 'css' | 'html'
type FieldDefinition = {
  path: string
  label: string
  type?: 'text' | 'textarea' | 'number' | 'select'
  options?: Array<{ label: string; value: string }>
}

const BLOCK_LABELS: Record<string, string> = {
  hero: 'Portada principal',
  servicesGrid: 'Servicios',
  projectsGrid: 'Proyectos',
  content: 'Contenido',
  stats: 'Indicadores',
  testimonials: 'Testimonios',
  beforeAfter: 'Antes y después',
  cta: 'Llamado a la acción',
  contactForm: 'Formulario',
  reusableComponent: 'Componente reutilizable',
}

const BLOCK_ICONS: Record<string, ReactNode> = {
  hero: <LayoutDashboard size={16} />,
  servicesGrid: <Blocks size={16} />,
  projectsGrid: <Blocks size={16} />,
  content: <Braces size={16} />,
  stats: <Database size={16} />,
  testimonials: <Sparkles size={16} />,
  beforeAfter: <Maximize2 size={16} />,
  cta: <ArrowRight size={16} />,
  contactForm: <MousePointer2 size={16} />,
  reusableComponent: <Blocks size={16} />,
}

const FIELDS: Record<string, FieldDefinition[]> = {
  hero: [
    { path: 'theme', label: 'Tema', type: 'select', options: [{ label: 'Oscuro', value: 'dark' }, { label: 'Claro', value: 'light' }, { label: 'Amarillo', value: 'yellow' }] },
    { path: 'eyebrow', label: 'Texto superior' },
    { path: 'heading', label: 'Título' },
    { path: 'highlight', label: 'Texto destacado' },
    { path: 'description', label: 'Descripción', type: 'textarea' },
    { path: 'primaryCTA.label', label: 'Botón principal' },
    { path: 'primaryCTA.url', label: 'Ruta principal' },
    { path: 'secondaryCTA.label', label: 'Botón secundario' },
    { path: 'secondaryCTA.url', label: 'Ruta secundaria' },
  ],
  servicesGrid: [
    { path: 'eyebrow', label: 'Texto superior' },
    { path: 'heading', label: 'Título' },
    { path: 'intro', label: 'Introducción', type: 'textarea' },
    { path: 'limit', label: 'Cantidad', type: 'number' },
  ],
  projectsGrid: [
    { path: 'eyebrow', label: 'Texto superior' },
    { path: 'heading', label: 'Título' },
    { path: 'intro', label: 'Introducción', type: 'textarea' },
    { path: 'limit', label: 'Cantidad', type: 'number' },
  ],
  content: [
    { path: 'eyebrow', label: 'Texto superior' },
    { path: 'heading', label: 'Título' },
    { path: '__plainContent', label: 'Contenido', type: 'textarea' },
    { path: 'mediaPosition', label: 'Posición del medio', type: 'select', options: [{ label: 'Derecha', value: 'right' }, { label: 'Izquierda', value: 'left' }, { label: 'Arriba', value: 'top' }] },
  ],
  stats: [{ path: 'heading', label: 'Título' }],
  testimonials: [{ path: 'eyebrow', label: 'Texto superior' }, { path: 'heading', label: 'Título' }],
  beforeAfter: [{ path: 'eyebrow', label: 'Texto superior' }, { path: 'heading', label: 'Título' }, { path: 'description', label: 'Descripción', type: 'textarea' }],
  cta: [{ path: 'eyebrow', label: 'Texto superior' }, { path: 'heading', label: 'Título' }, { path: 'description', label: 'Descripción', type: 'textarea' }, { path: 'button.label', label: 'Texto del botón' }, { path: 'button.url', label: 'Ruta del botón' }],
  contactForm: [{ path: 'eyebrow', label: 'Texto superior' }, { path: 'heading', label: 'Título' }, { path: 'description', label: 'Descripción', type: 'textarea' }, { path: 'successMessage', label: 'Mensaje de éxito', type: 'textarea' }],
  reusableComponent: [
    { path: 'anchor', label: 'Ancla' },
    { path: 'background', label: 'Fondo', type: 'select', options: [{ label: 'Heredado', value: 'inherit' }, { label: 'Claro', value: 'light' }, { label: 'Oscuro', value: 'dark' }, { label: 'Amarillo', value: 'yellow' }] },
    { path: 'spacing', label: 'Espaciado', type: 'select', options: [{ label: 'Compacto', value: 'compact' }, { label: 'Normal', value: 'normal' }, { label: 'Amplio', value: 'large' }] },
  ],
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function uid() {
  return `builder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getAtPath(object: Record<string, any>, path: string) {
  return path.split('.').reduce((current, key) => current?.[key], object)
}

function setAtPath(object: Record<string, any>, path: string, value: unknown) {
  const keys = path.split('.')
  let current = object
  for (const key of keys.slice(0, -1)) {
    if (!current[key] || typeof current[key] !== 'object') current[key] = {}
    current = current[key]
  }
  current[keys[keys.length - 1]] = value
}

function richTextToPlain(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const node = value as Record<string, any>
  return `${typeof node.text === 'string' ? node.text : ''}${Array.isArray(node.children) ? node.children.map(richTextToPlain).join('') : ''}${node.root ? richTextToPlain(node.root) : ''}`
}

function plainToRichText(value: string) {
  return {
    root: {
      type: 'root',
      children: value.split(/\n{2,}/).filter(Boolean).map((paragraph) => ({
        type: 'paragraph',
        children: [{ type: 'text', text: paragraph, detail: 0, format: 0, mode: 'normal', style: '', version: 1 }],
        direction: null,
        format: '',
        indent: 0,
        textFormat: 0,
        textStyle: '',
        version: 1,
      })),
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

function defaultBlock(blockType: string): BuilderBlock {
  const id = uid()
  if (blockType === 'hero') return { id, blockType, theme: 'dark', eyebrow: 'Construcción inteligente', heading: 'Construimos con claridad.', highlight: 'Diseñamos para durar.', description: 'Describe aquí la propuesta principal de la página.', primaryCTA: { label: 'Solicitar cotización', url: '#contacto' }, secondaryCTA: { label: 'Ver proyectos', url: '/proyectos' }, stats: [{ value: '8+', label: 'años' }, { value: '100%', label: 'trazabilidad' }] }
  if (blockType === 'servicesGrid') return { id, blockType, eyebrow: 'Servicios', heading: 'Soluciones para cada etapa.', intro: 'Servicios conectados desde Payload.', limit: 6 }
  if (blockType === 'projectsGrid') return { id, blockType, eyebrow: 'Proyectos', heading: 'Obras que hablan por nosotros.', intro: 'Proyectos conectados desde Payload.', limit: 4 }
  if (blockType === 'content') return { id, blockType, eyebrow: 'Información', heading: 'Una sección de contenido', content: plainToRichText('Escribe aquí el contenido de esta sección.'), mediaPosition: 'right' }
  if (blockType === 'stats') return { id, blockType, heading: 'Resultados medibles', items: [{ value: '01', label: 'Diagnóstico', description: 'Definimos el alcance.' }, { value: '02', label: 'Ejecución', description: 'Construimos con seguimiento.' }] }
  if (blockType === 'testimonials') return { id, blockType, eyebrow: 'Testimonios', heading: 'Confianza construida en cada proyecto.' }
  if (blockType === 'beforeAfter') return { id, blockType, eyebrow: 'Transformación', heading: 'Antes y después', description: 'Selecciona las imágenes desde Payload.' }
  if (blockType === 'cta') return { id, blockType, eyebrow: 'Siguiente paso', heading: 'Hablemos de tu proyecto.', description: 'Recibe una evaluación inicial y un plan claro.', button: { label: 'Cotizar ahora', url: '#contacto' } }
  if (blockType === 'contactForm') return { id, blockType, eyebrow: 'Cotización', heading: 'Describe tu proyecto.', description: 'Completa los datos principales.', successMessage: 'Solicitud recibida correctamente.' }
  return { id, blockType: 'content', heading: 'Nuevo bloque', content: plainToRichText('Contenido') }
}

function relationID(value: unknown): string | number | '' {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) return (value as { id: string | number }).id
  return ''
}

function componentForBlock(block: BuilderBlock, components: ReusableComponent[]) {
  const id = relationID(block.component)
  return components.find((component) => String(component.id) === String(id)) || (typeof block.component === 'object' ? block.component as ReusableComponent : undefined)
}

function renderPreviewBlock(block: BuilderBlock, components: ReusableComponent[], depth = 0): ReactNode {
  if (depth > 3) return <div className="builder-preview-placeholder">Límite de anidación</div>
  if (block.blockType === 'hero') return <section className={`builder-preview-hero builder-preview-hero-${block.theme || 'dark'}`}><span>{block.eyebrow}</span><h1>{block.heading}<em>{block.highlight}</em></h1><p>{block.description}</p><div className="builder-preview-actions"><button>{block.primaryCTA?.label || 'Acción principal'}</button><button>{block.secondaryCTA?.label || 'Acción secundaria'}</button></div><div className="builder-preview-stats">{(block.stats || []).map((item: any, index: number) => <div key={item.id || index}><strong>{item.value}</strong><small>{item.label}</small></div>)}</div></section>
  if (block.blockType === 'servicesGrid' || block.blockType === 'projectsGrid') return <section className={`builder-preview-section ${block.blockType === 'projectsGrid' ? 'dark' : ''}`}><span>{block.eyebrow}</span><h2>{block.heading}</h2><p>{block.intro}</p><div className="builder-preview-card-grid">{Array.from({ length: Math.min(Number(block.limit || 4), 6) }).map((_, index) => <article key={index}><i /><small>{block.blockType === 'servicesGrid' ? 'Servicio' : 'Proyecto'} {index + 1}</small><strong>Contenido conectado</strong></article>)}</div></section>
  if (block.blockType === 'content') return <section className="builder-preview-section builder-preview-content"><div><span>{block.eyebrow}</span><h2>{block.heading}</h2><p>{richTextToPlain(block.content)}</p></div><i className="builder-preview-media">Media</i></section>
  if (block.blockType === 'stats') return <section className="builder-preview-section builder-preview-stat-section"><h2>{block.heading}</h2><div>{(block.items || []).map((item: any, index: number) => <article key={item.id || index}><strong>{item.value}</strong><h3>{item.label}</h3><p>{item.description}</p></article>)}</div></section>
  if (block.blockType === 'testimonials') return <section className="builder-preview-section"><span>{block.eyebrow}</span><h2>{block.heading}</h2><div className="builder-preview-card-grid"><article><strong>★★★★★</strong><p>Testimonios conectados desde el CMS.</p></article><article><strong>★★★★★</strong><p>Vista de ejemplo.</p></article></div></section>
  if (block.blockType === 'beforeAfter') return <section className="builder-preview-section"><span>{block.eyebrow}</span><h2>{block.heading}</h2><p>{block.description}</p><div className="builder-preview-before-after"><i>Antes</i><i>Después</i></div></section>
  if (block.blockType === 'cta') return <section className="builder-preview-cta"><div><span>{block.eyebrow}</span><h2>{block.heading}</h2><p>{block.description}</p></div><button>{block.button?.label || 'Acción'}</button></section>
  if (block.blockType === 'contactForm') return <section className="builder-preview-section builder-preview-form"><div><span>{block.eyebrow}</span><h2>{block.heading}</h2><p>{block.description}</p></div><div><input placeholder="Nombre" readOnly /><input placeholder="Correo" readOnly /><textarea placeholder="Proyecto" readOnly /><button>Enviar</button></div></section>
  if (block.blockType === 'reusableComponent') {
    const component = componentForBlock(block, components)
    if (!component) return <div className="builder-preview-placeholder">Componente no encontrado</div>
    return <section className={`builder-preview-reusable background-${block.background || 'inherit'}`}><header><Blocks size={14} /> {component.name} · v{component.version || 1}</header>{(component.layout || []).map((child, index) => <div key={child.id || index}>{renderPreviewBlock(child, components, depth + 1)}</div>)}</section>
  }
  return <div className="builder-preview-placeholder">Bloque {block.blockType}</div>
}

function escapeHTML(value: unknown) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] || character)
}

function blockToHTML(block: BuilderBlock): string {
  const heading = escapeHTML(block.heading)
  const description = escapeHTML(block.description || block.intro)
  if (block.blockType === 'hero') return `<section class="hero"><span>${escapeHTML(block.eyebrow)}</span><h1>${heading}<em>${escapeHTML(block.highlight)}</em></h1><p>${description}</p></section>`
  if (block.blockType === 'content') return `<section class="content"><h2>${heading}</h2><p>${escapeHTML(richTextToPlain(block.content))}</p></section>`
  if (block.blockType === 'stats') return `<section class="stats"><h2>${heading}</h2>${(block.items || []).map((item: any) => `<article><strong>${escapeHTML(item.value)}</strong><h3>${escapeHTML(item.label)}</h3><p>${escapeHTML(item.description)}</p></article>`).join('')}</section>`
  if (block.blockType === 'cta') return `<section class="cta"><h2>${heading}</h2><p>${description}</p><a href="${escapeHTML(block.button?.url)}">${escapeHTML(block.button?.label)}</a></section>`
  if (block.blockType === 'reusableComponent') return `<section data-reusable-component="${escapeHTML(relationID(block.component))}"></section>`
  return `<section class="${escapeHTML(block.blockType)}"><h2>${heading}</h2><p>${description}</p></section>`
}

function layoutToHTML(layout: BuilderBlock[]) {
  return `<main class="ai-page">\n${layout.map(blockToHTML).join('\n')}\n</main>`
}

function ArrayEditor({ block, onChange }: { block: BuilderBlock; onChange: (block: BuilderBlock) => void }) {
  const isHero = block.blockType === 'hero'
  const key = isHero ? 'stats' : 'items'
  if (!isHero && block.blockType !== 'stats') return null
  const items = Array.isArray(block[key]) ? block[key] : []
  const update = (index: number, field: string, value: string) => {
    const next = clone(block)
    next[key] = [...items]
    next[key][index] = { ...next[key][index], [field]: value }
    onChange(next)
  }
  const add = () => {
    const next = clone(block)
    next[key] = [...items, isHero ? { id: uid(), value: '100%', label: 'Indicador' } : { id: uid(), value: String(items.length + 1).padStart(2, '0'), label: 'Indicador', description: '' }]
    onChange(next)
  }
  const remove = (index: number) => {
    const next = clone(block)
    next[key] = items.filter((_: unknown, itemIndex: number) => itemIndex !== index)
    onChange(next)
  }
  return <div className="builder-array-editor"><div className="builder-inspector-title"><strong>{isHero ? 'Indicadores de portada' : 'Indicadores'}</strong><button type="button" onClick={add}><Plus size={14} /> Añadir</button></div>{items.map((item: any, index: number) => <div className="builder-array-row" key={item.id || index}><input value={item.value || ''} onChange={(event) => update(index, 'value', event.target.value)} placeholder="Valor" /><input value={item.label || ''} onChange={(event) => update(index, 'label', event.target.value)} placeholder="Etiqueta" />{!isHero && <textarea value={item.description || ''} onChange={(event) => update(index, 'description', event.target.value)} placeholder="Descripción" />}<button type="button" onClick={() => remove(index)}><X size={14} /></button></div>)}</div>
}

export default function VisualBuilder() {
  const [pages, setPages] = useState<PageSummary[]>([])
  const [page, setPage] = useState<PageDoc | null>(null)
  const [components, setComponents] = useState<ReusableComponent[]>([])
  const [changes, setChanges] = useState<AIChange[]>([])
  const [layout, setLayout] = useState<BuilderBlock[]>([])
  const [aiStyle, setAIStyle] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [device, setDevice] = useState<Device>('desktop')
  const [codeTab, setCodeTab] = useState<CodeTab>('layout')
  const [codeDraft, setCodeDraft] = useState('')
  const [codeError, setCodeError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [publish, setPublish] = useState(false)
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [componentName, setComponentName] = useState('')
  const [savingComponent, setSavingComponent] = useState(false)
  const [selectedChange, setSelectedChange] = useState('')
  const [selectedProposal, setSelectedProposal] = useState(0)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [past, setPast] = useState<BuilderBlock[][]>([])
  const [future, setFuture] = useState<BuilderBlock[][]>([])

  const selectedBlock = layout[selectedIndex]
  const selectedAIChange = useMemo(() => changes.find((change) => String(change.id) === selectedChange), [changes, selectedChange])

  const load = useCallback(async (pageId?: string | number) => {
    setLoading(true)
    setNotice(null)
    try {
      const query = pageId ? `?pageId=${encodeURIComponent(String(pageId))}` : ''
      const response = await fetch(`/api/ai/builder${query}`, { credentials: 'include', cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo abrir el editor.')
      setPages(data.pages || [])
      setComponents(data.components || [])
      setChanges(data.changes || [])
      setPage(data.page || null)
      setLayout(clone(data.page?.layout || []))
      setAIStyle(String(data.page?.aiStyle || ''))
      setSelectedIndex(0)
      setDirty(false)
      setPast([])
      setFuture([])
      setPublish(data.page?._status === 'published')
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo abrir el editor.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    setCodeDraft(codeTab === 'layout' ? JSON.stringify(layout, null, 2) : codeTab === 'css' ? aiStyle : layoutToHTML(layout))
    setCodeError('')
  }, [aiStyle, codeTab, layout])

  function commit(next: BuilderBlock[], select = selectedIndex) {
    setPast((current) => [...current.slice(-49), clone(layout)])
    setFuture([])
    setLayout(next)
    setSelectedIndex(Math.max(0, Math.min(select, next.length - 1)))
    setDirty(true)
  }

  function undo() {
    const previous = past.at(-1)
    if (!previous) return
    setFuture((current) => [clone(layout), ...current].slice(0, 50))
    setPast((current) => current.slice(0, -1))
    setLayout(clone(previous))
    setSelectedIndex((current) => Math.min(current, previous.length - 1))
    setDirty(true)
  }

  function redo() {
    const next = future[0]
    if (!next) return
    setPast((current) => [...current.slice(-49), clone(layout)])
    setFuture((current) => current.slice(1))
    setLayout(clone(next))
    setSelectedIndex((current) => Math.min(current, next.length - 1))
    setDirty(true)
  }

  function updateSelected(block: BuilderBlock) {
    const next = clone(layout)
    next[selectedIndex] = block
    commit(next, selectedIndex)
  }

  function updateField(path: string, value: unknown) {
    if (!selectedBlock) return
    const next = clone(selectedBlock)
    if (path === '__plainContent') next.content = plainToRichText(String(value))
    else setAtPath(next, path, value)
    updateSelected(next)
  }

  function moveBlock(from: number, to: number) {
    if (from === to || to < 0 || to >= layout.length) return
    const next = clone(layout)
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    commit(next, to)
  }

  function duplicateBlock(index: number) {
    const next = clone(layout)
    next.splice(index + 1, 0, { ...clone(next[index]), id: uid() })
    commit(next, index + 1)
  }

  function deleteBlock(index: number) {
    if (layout.length <= 1) return setNotice({ type: 'error', text: 'La página debe conservar al menos un bloque.' })
    commit(layout.filter((_, itemIndex) => itemIndex !== index), Math.max(0, index - 1))
  }

  function handleDrop(event: DragEvent<HTMLElement>, targetIndex: number) {
    event.preventDefault()
    if (draggingIndex !== null) moveBlock(draggingIndex, targetIndex)
    setDraggingIndex(null)
  }

  function addBlock(type: string) {
    const next = [...clone(layout), defaultBlock(type)]
    commit(next, next.length - 1)
    setLibraryOpen(false)
  }

  function addComponent(component: ReusableComponent) {
    const next = [...clone(layout), { id: uid(), blockType: 'reusableComponent', component: component.id, background: 'inherit', spacing: 'normal' }]
    commit(next, next.length - 1)
    setLibraryOpen(false)
  }

  function applyCodeDraft() {
    try {
      if (codeTab === 'layout') {
        const parsed = JSON.parse(codeDraft)
        if (!Array.isArray(parsed)) throw new Error('El layout debe ser una lista de bloques.')
        commit(parsed, 0)
      } else if (codeTab === 'css') {
        setAIStyle(codeDraft)
        setDirty(true)
      }
      setCodeError('')
    } catch (error) {
      setCodeError(error instanceof Error ? error.message : 'Código inválido.')
    }
  }

  function loadProposal() {
    const proposal = selectedAIChange?.proposals?.[selectedProposal]
    if (!proposal?.layout?.length) return setNotice({ type: 'error', text: 'La propuesta no contiene bloques.' })
    setPast((current) => [...current.slice(-49), clone(layout)])
    setFuture([])
    setLayout(clone(proposal.layout))
    setAIStyle(String(proposal.css || ''))
    setSelectedIndex(0)
    setDirty(true)
    setNotice({ type: 'success', text: `Propuesta “${proposal.title || selectedAIChange?.title}” cargada sin guardar.` })
  }

  async function savePage() {
    if (!page || saving) return
    setSaving(true)
    setNotice(null)
    try {
      const response = await fetch('/api/ai/builder', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pageId: page.id, layout, aiStyle, publish, title: `Editor visual: ${page.title}` }) })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar.')
      setNotice({ type: 'success', text: `Página guardada como ${publish ? 'publicada' : 'borrador'}. Snapshot ${data.changeId} creado.` })
      await load(page.id)
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar.' })
    } finally {
      setSaving(false)
    }
  }

  async function saveComponent() {
    if (!selectedBlock || !componentName.trim() || savingComponent) return
    setSavingComponent(true)
    try {
      const response = await fetch('/api/ai/components', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: componentName.trim(), description: `Componente creado desde ${page?.title || 'FabrickBuild'}.`, category: 'section', status: 'active', source: selectedAIChange ? 'ai' : 'manual', layout: [selectedBlock], styles: '', previewHTML: blockToHTML(selectedBlock), tags: [selectedBlock.blockType] }) })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar el componente.')
      setComponents((current) => [...current, data.component].sort((a, b) => a.name.localeCompare(b.name)))
      setComponentName('')
      setNotice({ type: 'success', text: `Componente “${data.component.name}” listo para reutilizar.` })
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar el componente.' })
    } finally {
      setSavingComponent(false)
    }
  }

  const fieldDefinitions = selectedBlock ? FIELDS[selectedBlock.blockType] || [] : []

  return (
    <main className="studio-page builder-page">
      <div className="studio-page-head builder-page-head"><div><p className="studio-kicker">Canvas en vivo / Bloques / Componentes</p><h1>Edita la página antes de guardarla.</h1><p>Selecciona, modifica, mueve, duplica o elimina cualquier bloque. El canvas y el código cambian antes de escribir en PostgreSQL.</p></div><div className="studio-toolbar"><span className={`studio-pill ${dirty ? 'studio-pill-error' : 'studio-pill-ok'}`}>{dirty ? 'Cambios sin guardar' : 'Sincronizado'}</span><button className="studio-button" type="button" onClick={undo} disabled={!past.length}><Undo2 size={15} /> Deshacer</button><button className="studio-button" type="button" onClick={redo} disabled={!future.length}><Redo2 size={15} /> Rehacer</button><button className="studio-button studio-button-primary" type="button" onClick={() => void savePage()} disabled={!page || saving || !dirty}>{saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Guardar</button></div></div>
      {notice && <div className={`studio-notice studio-notice-${notice.type}`} style={{ marginBottom: 16 }}>{notice.text}</div>}
      <section className="builder-topbar studio-card"><div className="studio-field"><label>Página</label><select className="studio-select" value={String(page?.id || '')} onChange={(event) => void load(event.target.value)}>{pages.map((item) => <option key={item.id} value={String(item.id)}>{item.title} · /{item.slug === 'home' ? '' : item.slug}</option>)}</select></div><div className="studio-field builder-ai-source"><label>Importar propuesta de IA</label><div><select className="studio-select" value={selectedChange} onChange={(event) => { setSelectedChange(event.target.value); setSelectedProposal(0) }}><option value="">Seleccionar propuesta</option>{changes.filter((change) => change.proposals?.length).map((change) => <option key={change.id} value={String(change.id)}>{change.title}</option>)}</select>{selectedAIChange && <select className="studio-select" value={selectedProposal} onChange={(event) => setSelectedProposal(Number(event.target.value))}>{(selectedAIChange.proposals || []).map((proposal, index) => <option key={proposal.id || index} value={index}>{proposal.title || `Opción ${index + 1}`}</option>)}</select>}<button className="studio-button studio-button-violet" type="button" onClick={loadProposal} disabled={!selectedAIChange}><Sparkles size={15} /> Cargar</button></div></div><label className="ai-checkbox builder-publish-toggle"><input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} /> Publicar al guardar</label></section>
      {loading ? <div className="studio-skeleton" style={{ minHeight: 600 }} /> : <div className="builder-workspace">
        <aside className="studio-card builder-outline"><div className="studio-card-head"><div><h2>Estructura</h2><p>{layout.length} bloques.</p></div><button className="studio-button" type="button" onClick={() => setLibraryOpen((current) => !current)}><Plus size={15} /> Añadir</button></div>{libraryOpen && <div className="builder-library studio-enter"><strong>Bloques base</strong><div className="builder-library-grid">{Object.keys(BLOCK_LABELS).filter((type) => type !== 'reusableComponent').map((type) => <button type="button" key={type} onClick={() => addBlock(type)}>{BLOCK_ICONS[type]}<span>{BLOCK_LABELS[type]}</span></button>)}</div><strong>Componentes guardados</strong>{components.length ? <div className="builder-component-list">{components.filter((component) => component.status === 'active').map((component) => <button type="button" key={component.id} onClick={() => addComponent(component)}><Blocks size={15} /><span><b>{component.name}</b><small>v{component.version || 1}</small></span></button>)}</div> : <p className="builder-muted">Sin componentes guardados.</p>}</div>}<div className="builder-outline-list">{layout.map((block, index) => <button type="button" key={block.id || index} className={selectedIndex === index ? 'selected' : ''} onClick={() => setSelectedIndex(index)} draggable onDragStart={() => setDraggingIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, index)}><GripVertical size={15} /><span>{BLOCK_ICONS[block.blockType]}<b>{BLOCK_LABELS[block.blockType] || block.blockType}</b><small>{block.heading || block.title || BLOCK_LABELS[block.blockType]}</small></span><em>{String(index + 1).padStart(2, '0')}</em></button>)}</div></aside>
        <section className="studio-card builder-canvas-card"><div className="studio-card-head builder-canvas-head"><div><h2>Preview en vivo</h2><p>Selecciona un bloque para editarlo.</p></div><div className="builder-device-switcher"><button type="button" className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')}><Smartphone size={16} /></button><button type="button" className={device === 'tablet' ? 'active' : ''} onClick={() => setDevice('tablet')}><Tablet size={16} /></button><button type="button" className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')}><Laptop size={16} /></button><button type="button" className={device === 'wide' ? 'active' : ''} onClick={() => setDevice('wide')}><Monitor size={16} /></button></div></div><div className="builder-canvas-scroll"><div className={`builder-canvas builder-device-${device}`}><style>{aiStyle}</style><div className="ai-page builder-preview-page">{layout.map((block, index) => <div key={block.id || index} className={`builder-preview-block ${selectedIndex === index ? 'selected' : ''}`} onClick={() => setSelectedIndex(index)} draggable onDragStart={() => setDraggingIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, index)}><div className="builder-block-floating-tools"><span><GripVertical size={13} /> {BLOCK_LABELS[block.blockType]}</span><button type="button" onClick={(event) => { event.stopPropagation(); moveBlock(index, index - 1) }} disabled={index === 0}><ArrowUp size={13} /></button><button type="button" onClick={(event) => { event.stopPropagation(); moveBlock(index, index + 1) }} disabled={index === layout.length - 1}><ArrowDown size={13} /></button><button type="button" onClick={(event) => { event.stopPropagation(); duplicateBlock(index) }}><Copy size={13} /></button><button type="button" onClick={(event) => { event.stopPropagation(); deleteBlock(index) }}><Trash2 size={13} /></button></div>{renderPreviewBlock(block, components)}</div>)}</div></div></div></section>
        <aside className="studio-card builder-inspector"><div className="studio-card-head"><div><h2>Inspector</h2><p>{selectedBlock ? BLOCK_LABELS[selectedBlock.blockType] : 'Selecciona un bloque'}</p></div>{selectedBlock && <span className="studio-pill">#{selectedIndex + 1}</span>}</div>{selectedBlock ? <div className="builder-inspector-body"><div className="builder-inspector-actions"><button type="button" onClick={() => moveBlock(selectedIndex, selectedIndex - 1)} disabled={selectedIndex === 0}><ArrowUp size={14} /> Subir</button><button type="button" onClick={() => moveBlock(selectedIndex, selectedIndex + 1)} disabled={selectedIndex === layout.length - 1}><ArrowDown size={14} /> Bajar</button><button type="button" onClick={() => duplicateBlock(selectedIndex)}><Copy size={14} /> Duplicar</button><button type="button" className="danger" onClick={() => deleteBlock(selectedIndex)}><Trash2 size={14} /> Eliminar</button></div>{selectedBlock.blockType === 'reusableComponent' && <div className="studio-field"><label>Componente</label><select className="studio-select" value={String(relationID(selectedBlock.component))} onChange={(event) => updateField('component', event.target.value)}>{components.map((component) => <option key={component.id} value={String(component.id)}>{component.name} · v{component.version || 1}</option>)}</select></div>}{fieldDefinitions.map((field) => { const value = field.path === '__plainContent' ? richTextToPlain(selectedBlock.content) : getAtPath(selectedBlock, field.path); return <div className="studio-field" key={field.path}><label>{field.label}</label>{field.type === 'select' ? <select className="studio-select" value={String(value || '')} onChange={(event) => updateField(field.path, event.target.value)}>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea className="studio-textarea" value={String(value || '')} onChange={(event) => updateField(field.path, event.target.value)} /> : <input className="studio-input" type={field.type === 'number' ? 'number' : 'text'} value={value ?? ''} onChange={(event) => updateField(field.path, field.type === 'number' ? Number(event.target.value) : event.target.value)} />}</div> })}<ArrayEditor block={selectedBlock} onChange={updateSelected} /><div className="builder-save-component"><div className="builder-inspector-title"><strong>Guardar en componentes</strong><span className="studio-pill"><Blocks size={12} /> Reutilizable</span></div><input className="studio-input" value={componentName} onChange={(event) => setComponentName(event.target.value)} placeholder="Nombre del componente" /><button className="studio-button studio-button-violet" type="button" onClick={() => void saveComponent()} disabled={!componentName.trim() || savingComponent}>{savingComponent ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Guardar bloque</button></div></div> : <div className="builder-empty-inspector"><MousePointer2 size={28} /><p>Selecciona un bloque.</p></div>}</aside>
      </div>}
      <section className="studio-card builder-code-panel"><div className="studio-card-head"><div><h2>Código sincronizado</h2><p>Edita JSON o CSS y aplícalo antes de guardar.</p></div><div className="ai-code-tabs"><button type="button" className={codeTab === 'layout' ? 'active' : ''} onClick={() => setCodeTab('layout')}>Bloques JSON</button><button type="button" className={codeTab === 'css' ? 'active' : ''} onClick={() => setCodeTab('css')}>CSS</button><button type="button" className={codeTab === 'html' ? 'active' : ''} onClick={() => setCodeTab('html')}>HTML preview</button></div></div><div className="builder-code-body"><textarea value={codeDraft} onChange={(event) => setCodeDraft(event.target.value)} readOnly={codeTab === 'html'} spellCheck={false} /><div className="builder-code-actions">{codeError && <span className="studio-notice studio-notice-error">{codeError}</span>}<button className="studio-button studio-button-primary" type="button" onClick={applyCodeDraft} disabled={codeTab === 'html'}><Code2 size={15} /> Aplicar al canvas</button></div></div></section>
    </main>
  )
}
