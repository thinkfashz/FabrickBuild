'use client'

import {
  ArrowDown,
  ArrowUp,
  Blocks,
  Code2,
  Copy,
  GripVertical,
  ImagePlus,
  Laptop,
  Loader2,
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
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties, DragEvent, ReactNode } from 'react'

type Block = Record<string, any> & { blockType: string; id?: string }
type Page = { id: string | number; title: string; slug: string; _status?: string; layout?: Block[]; aiStyle?: string }
type ComponentDoc = { id: string | number; name: string; slug: string; status?: string; category?: string; version?: number; layout?: Block[] }
type MediaDoc = { id: string | number; alt?: string; filename?: string; url?: string; mimeType?: string; category?: string }
type BackgroundDoc = { id: string | number; name: string; slug?: string; kind?: string; status?: string; poster?: MediaDoc; image?: MediaDoc; externalURL?: string; desktopFrames?: MediaDoc[]; mobileFrames?: MediaDoc[] }
type Proposal = { id?: string; title?: string; css?: string; layout?: Block[] }
type Change = { id: string | number; title: string; proposals?: Proposal[] }
type Device = 'mobile' | 'tablet' | 'desktop' | 'wide'
type CodeTab = 'layout' | 'css' | 'html'
type Field = { path: string; label: string; kind?: 'text' | 'textarea' | 'number' | 'select'; options?: string[] }

const LABELS: Record<string, string> = {
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

const FIELDS: Record<string, Field[]> = {
  hero: [
    { path: 'theme', label: 'Tema', kind: 'select', options: ['dark', 'light', 'yellow'] },
    { path: 'eyebrow', label: 'Texto superior' },
    { path: 'heading', label: 'Título' },
    { path: 'highlight', label: 'Destacado' },
    { path: 'description', label: 'Descripción', kind: 'textarea' },
    { path: 'primaryCTA.label', label: 'Botón principal' },
    { path: 'primaryCTA.url', label: 'Ruta principal' },
    { path: 'secondaryCTA.label', label: 'Botón secundario' },
    { path: 'secondaryCTA.url', label: 'Ruta secundaria' },
  ],
  servicesGrid: [
    { path: 'eyebrow', label: 'Texto superior' },
    { path: 'heading', label: 'Título' },
    { path: 'intro', label: 'Introducción', kind: 'textarea' },
    { path: 'limit', label: 'Cantidad', kind: 'number' },
  ],
  projectsGrid: [
    { path: 'eyebrow', label: 'Texto superior' },
    { path: 'heading', label: 'Título' },
    { path: 'intro', label: 'Introducción', kind: 'textarea' },
    { path: 'limit', label: 'Cantidad', kind: 'number' },
  ],
  content: [
    { path: 'eyebrow', label: 'Texto superior' },
    { path: 'heading', label: 'Título' },
    { path: '__plainContent', label: 'Contenido', kind: 'textarea' },
    { path: 'mediaPosition', label: 'Posición', kind: 'select', options: ['right', 'left', 'top'] },
  ],
  stats: [{ path: 'heading', label: 'Título' }],
  testimonials: [{ path: 'eyebrow', label: 'Texto superior' }, { path: 'heading', label: 'Título' }],
  beforeAfter: [{ path: 'eyebrow', label: 'Texto superior' }, { path: 'heading', label: 'Título' }, { path: 'description', label: 'Descripción', kind: 'textarea' }],
  cta: [{ path: 'eyebrow', label: 'Texto superior' }, { path: 'heading', label: 'Título' }, { path: 'description', label: 'Descripción', kind: 'textarea' }, { path: 'button.label', label: 'Botón' }, { path: 'button.url', label: 'Ruta' }],
  contactForm: [{ path: 'eyebrow', label: 'Texto superior' }, { path: 'heading', label: 'Título' }, { path: 'description', label: 'Descripción', kind: 'textarea' }, { path: 'successMessage', label: 'Mensaje final', kind: 'textarea' }],
  reusableComponent: [
    { path: 'anchor', label: 'Ancla' },
    { path: 'background', label: 'Fondo', kind: 'select', options: ['inherit', 'light', 'dark', 'yellow'] },
    { path: 'spacing', label: 'Espaciado', kind: 'select', options: ['compact', 'normal', 'large'] },
  ],
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const uid = () => `builder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

function getPath(object: Record<string, any>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[key]
  }, object)
}

function setPath(object: Record<string, any>, path: string, value: unknown) {
  const keys = path.split('.')
  let current = object
  for (const key of keys.slice(0, -1)) {
    if (!current[key] || typeof current[key] !== 'object') current[key] = {}
    current = current[key]
  }
  current[keys[keys.length - 1]] = value
}

function relationID(value: unknown): string | number | '' {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return ''
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
      children: value.split(/\n{2,}/).filter(Boolean).map((text) => ({
        type: 'paragraph',
        children: [{ type: 'text', text, detail: 0, format: 0, mode: 'normal', style: '', version: 1 }],
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

function defaultBlock(type: string): Block {
  const id = uid()
  if (type === 'hero') return { id, blockType: type, theme: 'dark', eyebrow: 'Construcción inteligente', heading: 'Construimos con claridad.', highlight: 'Diseñamos para durar.', description: 'Describe la propuesta principal.', primaryCTA: { label: 'Solicitar cotización', url: '#contacto' }, secondaryCTA: { label: 'Ver proyectos', url: '/proyectos' }, stats: [{ value: '8+', label: 'años' }, { value: '100%', label: 'trazabilidad' }] }
  if (type === 'servicesGrid') return { id, blockType: type, eyebrow: 'Servicios', heading: 'Soluciones para cada etapa.', intro: 'Servicios conectados desde Payload.', limit: 6 }
  if (type === 'projectsGrid') return { id, blockType: type, eyebrow: 'Proyectos', heading: 'Obras que hablan por nosotros.', intro: 'Proyectos conectados desde Payload.', limit: 4 }
  if (type === 'content') return { id, blockType: type, eyebrow: 'Información', heading: 'Contenido', content: plainToRichText('Escribe aquí.'), mediaPosition: 'right' }
  if (type === 'stats') return { id, blockType: type, heading: 'Resultados medibles', items: [{ value: '01', label: 'Diagnóstico', description: 'Definimos el alcance.' }, { value: '02', label: 'Ejecución', description: 'Construimos con seguimiento.' }] }
  if (type === 'testimonials') return { id, blockType: type, eyebrow: 'Testimonios', heading: 'Confianza construida.' }
  if (type === 'beforeAfter') return { id, blockType: type, eyebrow: 'Transformación', heading: 'Antes y después', description: 'Selecciona imágenes en Payload.' }
  if (type === 'cta') return { id, blockType: type, eyebrow: 'Siguiente paso', heading: 'Hablemos de tu proyecto.', description: 'Recibe una evaluación inicial.', button: { label: 'Cotizar ahora', url: '#contacto' } }
  return { id, blockType: 'contactForm', eyebrow: 'Cotización', heading: 'Describe tu proyecto.', description: 'Completa los datos principales.', successMessage: 'Solicitud recibida.' }
}

function escapeHTML(value: unknown) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] || character)
}

function blockHTML(block: Block) {
  return `<section class="${escapeHTML(block.blockType)}"><h2>${escapeHTML(block.heading)}</h2><p>${escapeHTML(block.description || block.intro || richTextToPlain(block.content))}</p></section>`
}

function getAssetURL(value: unknown): string {
  if (value && typeof value === 'object' && 'url' in value && typeof (value as MediaDoc).url === 'string') return (value as MediaDoc).url || ''
  return ''
}

function previewAppearanceStyle(block: Block): CSSProperties {
  const appearance = block.appearance || {}
  const media = getAssetURL(appearance.backgroundMedia)
  const saved = appearance.savedBackground as BackgroundDoc | undefined
  const savedURL = saved?.kind === 'url' ? saved.externalURL : getAssetURL(saved?.image) || getAssetURL(saved?.poster) || getAssetURL(saved?.desktopFrames?.[0])
  const image = media || savedURL || appearance.backgroundURL
  const opacity = Math.max(0, Math.min(100, Number(appearance.surfaceOpacity ?? 100))) / 100
  const surface = typeof appearance.surfaceColor === 'string' ? appearance.surfaceColor : '#f7f5ef'
  const overlay = typeof appearance.overlayColor === 'string' ? appearance.overlayColor : '#000000'
  const overlayOpacity = Math.max(0, Math.min(100, Number(appearance.overlayOpacity ?? 0))) / 100
  const style: CSSProperties = {
    '--builder-preview-heading': appearance.headingColor || '#15130f',
    '--builder-preview-copy': appearance.bodyColor || '#4f493f',
    '--builder-preview-accent': appearance.buttonColor || '#f2b90c',
    backgroundColor: appearance.backgroundMode === 'none' ? undefined : `${surface}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
  } as CSSProperties
  if (appearance.backgroundMode === 'image' && image) {
    style.backgroundImage = `linear-gradient(${overlay}${Math.round(overlayOpacity * 255).toString(16).padStart(2, '0')}, ${overlay}${Math.round(overlayOpacity * 255).toString(16).padStart(2, '0')}), url(${JSON.stringify(image)})`
    style.backgroundSize = appearance.backgroundFit === 'contain' ? 'contain' : 'cover'
    style.backgroundPosition = appearance.backgroundPosition || 'center'
  }
  return style
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="builder-color-control">
      <span>{label}</span>
      <input aria-label={label} type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'} onChange={(event) => onChange(event.target.value)} />
      <input className="studio-input" value={value} maxLength={7} onChange={(event) => onChange(event.target.value)} placeholder="#FFFFFF" />
    </label>
  )
}

function MediaSelect({ label, value, media, onChange }: { label: string; value: unknown; media: MediaDoc[]; onChange: (value: MediaDoc | undefined) => void }) {
  const selected = relationID(value)
  return (
    <label className="studio-field">
      <span>{label}</span>
      <select className="studio-select" value={String(selected)} onChange={(event) => onChange(media.find((item) => String(item.id) === event.target.value))}>
        <option value="">Sin imagen</option>
        {media.map((item) => <option key={item.id} value={String(item.id)}>{item.alt || item.filename || `Archivo ${item.id}`}</option>)}
      </select>
    </label>
  )
}

function AppearanceEditor({ block, media, backgrounds, uploading, onChange, onUpload }: {
  block: Block
  media: MediaDoc[]
  backgrounds: BackgroundDoc[]
  uploading: boolean
  onChange: (block: Block) => void
  onUpload: (file: File) => Promise<void>
}) {
  const appearance = block.appearance || {}
  const setAppearance = (path: string, value: unknown) => {
    const next = clone(block)
    next.appearance = { ...(next.appearance || {}) }
    setPath(next.appearance, path, value)
    onChange(next)
  }
  const setMedia = (path: string, value: MediaDoc | undefined) => {
    const next = clone(block)
    setPath(next, path, value || undefined)
    onChange(next)
  }

  return (
    <section className="builder-appearance-editor">
      <div className="builder-inspector-title"><strong>Diseño del bloque</strong><small>Colores, fondo y multimedia</small></div>
      <label className="studio-field"><span>Fondo</span><select className="studio-select" value={appearance.backgroundMode || 'none'} onChange={(event) => setAppearance('backgroundMode', event.target.value)}><option value="none">Sin fondo / transparente</option><option value="color">Color translúcido</option><option value="image">Imagen o multimedia</option></select></label>
      {appearance.backgroundMode !== 'none' && <><ColorControl label="Color de superficie" value={appearance.surfaceColor || '#ffffff'} onChange={(value) => setAppearance('surfaceColor', value)} /><label className="studio-field"><span>Opacidad del fondo · {Number(appearance.surfaceOpacity ?? 100)}%</span><input type="range" min="0" max="100" value={Number(appearance.surfaceOpacity ?? 100)} onChange={(event) => setAppearance('surfaceOpacity', Number(event.target.value))} /></label></>}
      {appearance.backgroundMode === 'image' && <>
        <MediaSelect label="Imagen desde la biblioteca" value={appearance.backgroundMedia} media={media} onChange={(value) => setAppearance('backgroundMedia', value)} />
        <label className="studio-field"><span>Background multimedia guardado</span><select className="studio-select" value={String(relationID(appearance.savedBackground))} onChange={(event) => setAppearance('savedBackground', backgrounds.find((item) => String(item.id) === event.target.value))}><option value="">No usar background guardado</option>{backgrounds.map((item) => <option key={item.id} value={String(item.id)}>{item.name} · {item.kind}</option>)}</select></label>
        <label className="studio-field"><span>URL externa HTTPS</span><input className="studio-input" value={appearance.backgroundURL || ''} onChange={(event) => setAppearance('backgroundURL', event.target.value)} placeholder="https://..." /></label>
        <div className="builder-upload-inline"><label className="studio-button studio-button-violet"><ImagePlus size={15} /> {uploading ? 'Subiendo…' : 'Subir imagen'}<input type="file" accept="image/*" hidden disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUpload(file); event.currentTarget.value = '' }} /></label><small>Se guarda de forma permanente en Vercel Blob y la biblioteca multimedia.</small></div>
        <label className="studio-field"><span>Ajuste de imagen</span><select className="studio-select" value={appearance.backgroundFit || 'cover'} onChange={(event) => setAppearance('backgroundFit', event.target.value)}><option value="cover">Cubrir</option><option value="contain">Contener</option></select></label>
        <label className="studio-field"><span>Posición</span><select className="studio-select" value={appearance.backgroundPosition || 'center'} onChange={(event) => setAppearance('backgroundPosition', event.target.value)}><option value="center">Centro</option><option value="top">Arriba</option><option value="bottom">Abajo</option><option value="left">Izquierda</option><option value="right">Derecha</option></select></label>
        <ColorControl label="Color de capa" value={appearance.overlayColor || '#000000'} onChange={(value) => setAppearance('overlayColor', value)} />
        <label className="studio-field"><span>Opacidad de capa · {Number(appearance.overlayOpacity ?? 0)}%</span><input type="range" min="0" max="90" value={Number(appearance.overlayOpacity ?? 0)} onChange={(event) => setAppearance('overlayOpacity', Number(event.target.value))} /></label>
      </>}
      <div className="builder-color-grid"><ColorControl label="Texto superior" value={appearance.eyebrowColor || '#c98d00'} onChange={(value) => setAppearance('eyebrowColor', value)} /><ColorControl label="Títulos" value={appearance.headingColor || '#15130f'} onChange={(value) => setAppearance('headingColor', value)} /><ColorControl label="Párrafos" value={appearance.bodyColor || '#4f493f'} onChange={(value) => setAppearance('bodyColor', value)} /><ColorControl label="Botones" value={appearance.buttonColor || '#f2b90c'} onChange={(value) => setAppearance('buttonColor', value)} /><ColorControl label="Texto botón" value={appearance.buttonTextColor || '#15130f'} onChange={(value) => setAppearance('buttonTextColor', value)} /></div>
      {block.blockType === 'content' && <MediaSelect label="Imagen de contenido" value={block.media} media={media} onChange={(value) => setMedia('media', value)} />}
      {block.blockType === 'beforeAfter' && <><MediaSelect label="Imagen antes" value={block.before} media={media} onChange={(value) => setMedia('before', value)} /><MediaSelect label="Imagen después" value={block.after} media={media} onChange={(value) => setMedia('after', value)} /></>}
    </section>
  )
}

function Preview({ block, components, depth = 0 }: { block: Block; components: ComponentDoc[]; depth?: number }): ReactNode {
  if (depth > 3) return <div className="builder-preview-placeholder">Límite de anidación</div>
  if (block.blockType === 'hero') return <section className={`builder-preview-hero builder-preview-hero-${block.theme || 'dark'}`}><span>{block.eyebrow}</span><h1>{block.heading}<em>{block.highlight}</em></h1><p>{block.description}</p><div className="builder-preview-actions"><button>{block.primaryCTA?.label}</button><button>{block.secondaryCTA?.label}</button></div><div className="builder-preview-stats">{(block.stats || []).map((item: any, index: number) => <div key={index}><strong>{item.value}</strong><small>{item.label}</small></div>)}</div></section>
  if (['servicesGrid', 'projectsGrid', 'testimonials'].includes(block.blockType)) return <section className={`builder-preview-section ${block.blockType === 'projectsGrid' ? 'dark' : ''}`}><span>{block.eyebrow}</span><h2>{block.heading}</h2><p>{block.intro}</p><div className="builder-preview-card-grid">{Array.from({ length: block.blockType === 'testimonials' ? 2 : Math.min(Number(block.limit || 4), 6) }).map((_, index) => <article key={index}><i /><small>{LABELS[block.blockType]}</small><strong>Contenido {index + 1}</strong></article>)}</div></section>
  if (block.blockType === 'content') return <section className="builder-preview-section builder-preview-content"><div><span>{block.eyebrow}</span><h2>{block.heading}</h2><p>{richTextToPlain(block.content)}</p></div><i className="builder-preview-media">Media</i></section>
  if (block.blockType === 'stats') return <section className="builder-preview-section builder-preview-stat-section"><h2>{block.heading}</h2><div>{(block.items || []).map((item: any, index: number) => <article key={index}><strong>{item.value}</strong><h3>{item.label}</h3><p>{item.description}</p></article>)}</div></section>
  if (block.blockType === 'beforeAfter') return <section className="builder-preview-section"><span>{block.eyebrow}</span><h2>{block.heading}</h2><p>{block.description}</p><div className="builder-preview-before-after"><i>Antes</i><i>Después</i></div></section>
  if (block.blockType === 'cta') return <section className="builder-preview-cta"><div><span>{block.eyebrow}</span><h2>{block.heading}</h2><p>{block.description}</p></div><button>{block.button?.label}</button></section>
  if (block.blockType === 'contactForm') return <section className="builder-preview-section builder-preview-form"><div><span>{block.eyebrow}</span><h2>{block.heading}</h2><p>{block.description}</p></div><div><input placeholder="Nombre" readOnly /><input placeholder="Correo" readOnly /><textarea placeholder="Proyecto" readOnly /><button>Enviar</button></div></section>
  if (block.blockType === 'reusableComponent') {
    const component = components.find((item) => String(item.id) === String(relationID(block.component))) || (typeof block.component === 'object' ? block.component as ComponentDoc : undefined)
    if (!component) return <div className="builder-preview-placeholder">Componente no encontrado</div>
    if (component.slug === 'core-signature-experience') return <section className="builder-preview-reusable builder-preview-signature"><header><Blocks size={14} /> Recorrido Signature Home</header><div><strong>Experiencia cinematográfica</strong><span>Secuencia, calculadora y terminaciones movibles como un bloque de portada.</span></div></section>
    return <section className="builder-preview-reusable"><header><Blocks size={14} /> {component.name} · v{component.version || 1}</header>{(component.layout || []).map((child, index) => <Preview key={child.id || index} block={child} components={components} depth={depth + 1} />)}</section>
  }
  return <div className="builder-preview-placeholder">{block.blockType}</div>
}

function ItemEditor({ block, onChange }: { block: Block; onChange: (block: Block) => void }) {
  const key = block.blockType === 'hero' ? 'stats' : 'items'
  if (!['hero', 'stats'].includes(block.blockType)) return null
  const items = Array.isArray(block[key]) ? block[key] : []
  const update = (index: number, field: string, value: string) => {
    const next = clone(block)
    next[key] = [...items]
    next[key][index] = { ...next[key][index], [field]: value }
    onChange(next)
  }
  return <div className="builder-array-editor"><div className="builder-inspector-title"><strong>Elementos</strong><button type="button" onClick={() => onChange({ ...clone(block), [key]: [...items, { value: '01', label: 'Indicador', description: '' }] })}><Plus size={14} /> Añadir</button></div>{items.map((item: any, index: number) => <div className="builder-array-row" key={index}><input value={String(item.value || '')} onChange={(event) => update(index, 'value', event.target.value)} /><input value={String(item.label || '')} onChange={(event) => update(index, 'label', event.target.value)} />{block.blockType === 'stats' && <textarea value={String(item.description || '')} onChange={(event) => update(index, 'description', event.target.value)} />}<button type="button" onClick={() => onChange({ ...clone(block), [key]: items.filter((_: unknown, itemIndex: number) => itemIndex !== index) })}><Trash2 size={14} /></button></div>)}</div>
}

export default function VisualBuilder() {
  const [pages, setPages] = useState<Page[]>([])
  const [page, setPage] = useState<Page | null>(null)
  const [components, setComponents] = useState<ComponentDoc[]>([])
  const [media, setMedia] = useState<MediaDoc[]>([])
  const [backgrounds, setBackgrounds] = useState<BackgroundDoc[]>([])
  const [changes, setChanges] = useState<Change[]>([])
  const [layout, setLayout] = useState<Block[]>([])
  const [style, setStyle] = useState('')
  const [selected, setSelected] = useState(0)
  const [device, setDevice] = useState<Device>('desktop')
  const [codeTab, setCodeTab] = useState<CodeTab>('layout')
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [publish, setPublish] = useState(false)
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [library, setLibrary] = useState(false)
  const [componentName, setComponentName] = useState('')
  const [changeID, setChangeID] = useState('')
  const [proposalIndex, setProposalIndex] = useState(0)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [past, setPast] = useState<Block[][]>([])
  const [future, setFuture] = useState<Block[][]>([])

  const block = layout[selected]
  const aiChange = useMemo(() => changes.find((item) => String(item.id) === changeID), [changeID, changes])

  const load = useCallback(async (pageID?: string | number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/ai/builder${pageID ? `?pageId=${encodeURIComponent(String(pageID))}` : ''}`, { credentials: 'include', cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo abrir el editor.')
      setPages(data.pages || [])
      setPage(data.page || null)
      setComponents(data.components || [])
      setMedia(data.media || [])
      setBackgrounds(data.backgrounds || [])
      setChanges(data.changes || [])
      setLayout(clone(data.page?.layout || []))
      setStyle(String(data.page?.aiStyle || ''))
      setSelected(0)
      setPublish(data.page?._status === 'published')
      setDirty(false)
      setPast([])
      setFuture([])
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Error del editor.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    setCode(codeTab === 'layout' ? JSON.stringify(layout, null, 2) : codeTab === 'css' ? style : `<main class="ai-page">\n${layout.map(blockHTML).join('\n')}\n</main>`)
    setCodeError('')
  }, [codeTab, layout, style])

  function commit(next: Block[], nextSelected = selected) {
    setPast((current) => [...current.slice(-49), clone(layout)])
    setFuture([])
    setLayout(next)
    setSelected(Math.max(0, Math.min(nextSelected, next.length - 1)))
    setDirty(true)
  }

  function updateBlock(nextBlock: Block) {
    const next = clone(layout)
    next[selected] = nextBlock
    commit(next, selected)
  }

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= layout.length) return
    const next = clone(layout)
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    commit(next, to)
  }

  function drop(event: DragEvent<HTMLElement>, target: number) {
    event.preventDefault()
    if (dragIndex !== null) move(dragIndex, target)
    setDragIndex(null)
  }

  function editField(field: Field, value: unknown) {
    if (!block) return
    const next = clone(block)
    if (field.path === '__plainContent') next.content = plainToRichText(String(value))
    else setPath(next, field.path, value)
    updateBlock(next)
  }

  async function uploadBackground(file: File) {
    if (!block || uploading) return
    if (!file.type.startsWith('image/')) {
      setNotice({ type: 'error', text: 'Selecciona una imagen válida.' })
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'La imagen supera el límite de 25 MB.' })
      return
    }

    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('_payload', JSON.stringify({ alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), category: 'background', device: 'universal' }))
      const response = await fetch('/api/media', { method: 'POST', credentials: 'include', body: form })
      const result = await response.json().catch(() => null)
      const document = result?.doc as MediaDoc | undefined
      if (!response.ok || !document?.id) throw new Error(result?.errors?.[0]?.message || 'No se pudo guardar la imagen en la biblioteca.')
      setMedia((current) => [document, ...current.filter((item) => String(item.id) !== String(document.id))])
      const next = clone(block)
      next.appearance = { ...(next.appearance || {}), backgroundMode: 'image', backgroundMedia: document }
      updateBlock(next)
      setNotice({ type: 'success', text: `“${document.alt || file.name}” quedó guardada en la biblioteca multimedia.` })
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo subir la imagen.' })
    } finally {
      setUploading(false)
    }
  }

  async function savePage() {
    if (!page || saving) return
    setSaving(true)
    try {
      const response = await fetch('/api/ai/builder', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pageId: page.id, layout, aiStyle: style, publish, title: `Editor visual: ${page.title}` }) })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar.')
      setNotice({ type: 'success', text: `Página guardada. Snapshot ${data.changeId} creado.` })
      await load(page.id)
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar.' })
    } finally {
      setSaving(false)
    }
  }

  async function saveComponent() {
    if (!block || !componentName.trim()) return
    setSaving(true)
    try {
      const response = await fetch('/api/ai/components', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: componentName.trim(), category: 'section', status: 'active', source: aiChange ? 'ai' : 'manual', layout: [block], styles: '', previewHTML: blockHTML(block), tags: [block.blockType] }) })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar el componente.')
      setComponents((current) => [...current, data.component])
      setComponentName('')
      setNotice({ type: 'success', text: `Componente “${data.component.name}” guardado.` })
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="studio-page builder-page">
      <div className="studio-page-head builder-page-head"><div><p className="studio-kicker">Canvas en vivo / Bloques / Componentes</p><h1>Edita antes de guardar.</h1><p>Selecciona, mueve, modifica, duplica o elimina bloques. PostgreSQL solo cambia al pulsar Guardar.</p></div><div className="studio-toolbar"><span className={`studio-pill ${dirty ? 'studio-pill-error' : 'studio-pill-ok'}`}>{dirty ? 'Sin guardar' : 'Sincronizado'}</span><button className="studio-button" type="button" disabled={!past.length} onClick={() => { const previous = past[past.length - 1]; if (!previous) return; setFuture((current) => [clone(layout), ...current]); setPast((current) => current.slice(0, -1)); setLayout(previous); setDirty(true) }}><Undo2 size={15} /> Deshacer</button><button className="studio-button" type="button" disabled={!future.length} onClick={() => { const next = future[0]; if (!next) return; setPast((current) => [...current, clone(layout)]); setFuture((current) => current.slice(1)); setLayout(next); setDirty(true) }}><Redo2 size={15} /> Rehacer</button><button className="studio-button studio-button-primary" type="button" disabled={!dirty || saving} onClick={() => void savePage()}>{saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Guardar</button></div></div>
      {notice && <div className={`studio-notice studio-notice-${notice.type}`} style={{ marginBottom: 16 }}>{notice.text}</div>}
      <section className="builder-topbar studio-card"><div className="studio-field"><label>Página</label><select className="studio-select" value={String(page?.id || '')} onChange={(event) => void load(event.target.value)}>{pages.map((item) => <option key={item.id} value={String(item.id)}>{item.title} · /{item.slug === 'home' ? '' : item.slug}</option>)}</select></div><div className="studio-field builder-ai-source"><label>Propuesta de IA</label><div><select className="studio-select" value={changeID} onChange={(event) => { setChangeID(event.target.value); setProposalIndex(0) }}><option value="">Seleccionar</option>{changes.filter((item) => item.proposals?.length).map((item) => <option key={item.id} value={String(item.id)}>{item.title}</option>)}</select>{aiChange && <select className="studio-select" value={proposalIndex} onChange={(event) => setProposalIndex(Number(event.target.value))}>{(aiChange.proposals || []).map((proposal, index) => <option key={proposal.id || index} value={index}>{proposal.title || `Opción ${index + 1}`}</option>)}</select>}<button className="studio-button studio-button-violet" type="button" disabled={!aiChange} onClick={() => { const proposal = aiChange?.proposals?.[proposalIndex]; if (!proposal?.layout?.length) return; commit(clone(proposal.layout), 0); setStyle(String(proposal.css || '')); setNotice({ type: 'success', text: 'Propuesta cargada en el canvas sin guardar.' }) }}><Sparkles size={15} /> Cargar</button></div></div><label className="ai-checkbox builder-publish-toggle"><input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} /> Publicar</label></section>
      {loading ? <div className="studio-skeleton" style={{ minHeight: 620 }} /> : <div className="builder-workspace">
        <aside className="studio-card builder-outline"><div className="studio-card-head"><div><h2>Estructura</h2><p>{layout.length} bloques</p></div><button className="studio-button" type="button" onClick={() => setLibrary((current) => !current)}><Plus size={15} /> Añadir</button></div>{library && <div className="builder-library studio-enter"><strong>Bloques</strong><div className="builder-library-grid">{Object.keys(LABELS).filter((type) => type !== 'reusableComponent').map((type) => <button type="button" key={type} onClick={() => { const next = [...clone(layout), defaultBlock(type)]; commit(next, next.length - 1); setLibrary(false) }}><Blocks size={15} /><span>{LABELS[type]}</span></button>)}</div><strong>Componentes</strong><div className="builder-component-list">{components.filter((item) => item.status === 'active').map((item) => <button type="button" key={item.id} onClick={() => { const next = [...clone(layout), { id: uid(), blockType: 'reusableComponent', component: item.id, background: 'inherit', spacing: 'normal' }]; commit(next, next.length - 1); setLibrary(false) }}><Blocks size={15} /><span><b>{item.name}</b><small>v{item.version || 1}</small></span></button>)}</div></div>}<div className="builder-outline-list">{layout.map((item, index) => <button type="button" key={item.id || index} className={selected === index ? 'selected' : ''} onClick={() => setSelected(index)} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, index)}><GripVertical size={15} /><span><Blocks size={15} /><b>{LABELS[item.blockType] || item.blockType}</b><small>{String(item.heading || LABELS[item.blockType] || '')}</small></span><em>{index + 1}</em></button>)}</div></aside>
        <section className="studio-card builder-canvas-card"><div className="studio-card-head builder-canvas-head"><div><h2>Preview en vivo</h2><p>Haz clic para seleccionar.</p></div><div className="builder-device-switcher"><button type="button" className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')}><Smartphone size={16} /></button><button type="button" className={device === 'tablet' ? 'active' : ''} onClick={() => setDevice('tablet')}><Tablet size={16} /></button><button type="button" className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')}><Laptop size={16} /></button><button type="button" className={device === 'wide' ? 'active' : ''} onClick={() => setDevice('wide')}><Monitor size={16} /></button></div></div><div className="builder-canvas-scroll"><div className={`builder-canvas builder-device-${device}`}><style>{style}</style><div className="ai-page builder-preview-page">{layout.map((item, index) => <div key={item.id || index} className={`builder-preview-block ${selected === index ? 'selected' : ''}`} onClick={() => setSelected(index)} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, index)}><div className="builder-block-floating-tools"><span><GripVertical size={13} /> {LABELS[item.blockType]}</span><button type="button" disabled={index === 0} onClick={(event) => { event.stopPropagation(); move(index, index - 1) }}><ArrowUp size={13} /></button><button type="button" disabled={index === layout.length - 1} onClick={(event) => { event.stopPropagation(); move(index, index + 1) }}><ArrowDown size={13} /></button><button type="button" onClick={(event) => { event.stopPropagation(); const next = clone(layout); next.splice(index + 1, 0, { ...clone(item), id: uid() }); commit(next, index + 1) }}><Copy size={13} /></button><button type="button" onClick={(event) => { event.stopPropagation(); if (layout.length > 1) commit(layout.filter((_, itemIndex) => itemIndex !== index), Math.max(0, index - 1)) }}><Trash2 size={13} /></button></div><div className="builder-preview-appearance" style={previewAppearanceStyle(item)}><Preview block={item} components={components} /></div></div>)}</div></div></div></section>
        <aside className="studio-card builder-inspector"><div className="studio-card-head"><div><h2>Inspector</h2><p>{block ? LABELS[block.blockType] : 'Selecciona un bloque'}</p></div></div>{block ? <div className="builder-inspector-body"><div className="builder-inspector-actions"><button type="button" disabled={selected === 0} onClick={() => move(selected, selected - 1)}><ArrowUp size={14} /> Subir</button><button type="button" disabled={selected === layout.length - 1} onClick={() => move(selected, selected + 1)}><ArrowDown size={14} /> Bajar</button><button type="button" onClick={() => { const next = clone(layout); next.splice(selected + 1, 0, { ...clone(block), id: uid() }); commit(next, selected + 1) }}><Copy size={14} /> Duplicar</button><button type="button" className="danger" onClick={() => layout.length > 1 && commit(layout.filter((_, index) => index !== selected), Math.max(0, selected - 1))}><Trash2 size={14} /> Eliminar</button></div>{block.blockType === 'reusableComponent' && <div className="studio-field"><label>Componente</label><select className="studio-select" value={String(relationID(block.component))} onChange={(event) => { const next = clone(block); next.component = event.target.value; updateBlock(next) }}>{components.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}</select></div>}{(FIELDS[block.blockType] || []).map((field) => { const raw = field.path === '__plainContent' ? richTextToPlain(block.content) : getPath(block, field.path); const value: string | number = typeof raw === 'number' || typeof raw === 'string' ? raw : ''; return <div className="studio-field" key={field.path}><label>{field.label}</label>{field.kind === 'select' ? <select className="studio-select" value={String(value)} onChange={(event) => editField(field, event.target.value)}>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : field.kind === 'textarea' ? <textarea className="studio-textarea" value={String(value)} onChange={(event) => editField(field, event.target.value)} /> : <input className="studio-input" type={field.kind === 'number' ? 'number' : 'text'} value={value} onChange={(event) => editField(field, field.kind === 'number' ? Number(event.target.value) : event.target.value)} />}</div> })}<AppearanceEditor block={block} media={media} backgrounds={backgrounds} uploading={uploading} onChange={updateBlock} onUpload={uploadBackground} /><ItemEditor block={block} onChange={updateBlock} /><div className="builder-save-component"><strong>Guardar como componente</strong><input className="studio-input" value={componentName} onChange={(event) => setComponentName(event.target.value)} placeholder="Nombre" /><button className="studio-button studio-button-violet" type="button" disabled={!componentName.trim() || saving} onClick={() => void saveComponent()}><Save size={15} /> Guardar bloque</button></div></div> : <div className="builder-empty-inspector"><MousePointer2 size={28} /><p>Selecciona un bloque.</p></div>}</aside>
      </div>}
      <section className="studio-card builder-code-panel"><div className="studio-card-head"><div><h2>Código sincronizado</h2><p>JSON, CSS y HTML de referencia.</p></div><div className="ai-code-tabs"><button type="button" className={codeTab === 'layout' ? 'active' : ''} onClick={() => setCodeTab('layout')}>JSON</button><button type="button" className={codeTab === 'css' ? 'active' : ''} onClick={() => setCodeTab('css')}>CSS</button><button type="button" className={codeTab === 'html' ? 'active' : ''} onClick={() => setCodeTab('html')}>HTML</button></div></div><div className="builder-code-body"><textarea value={code} readOnly={codeTab === 'html'} onChange={(event) => setCode(event.target.value)} spellCheck={false} /><div className="builder-code-actions">{codeError && <span className="studio-notice studio-notice-error">{codeError}</span>}<button className="studio-button studio-button-primary" type="button" disabled={codeTab === 'html'} onClick={() => { try { if (codeTab === 'layout') { const parsed = JSON.parse(code); if (!Array.isArray(parsed)) throw new Error('El layout debe ser una lista.'); commit(parsed, 0) } else { setStyle(code); setDirty(true) } setCodeError('') } catch (error) { setCodeError(error instanceof Error ? error.message : 'Código inválido.') } }}><Code2 size={15} /> Aplicar al canvas</button></div></div></section>
    </main>
  )
}
