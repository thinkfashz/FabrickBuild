'use client'

import {
  Braces,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Expand,
  FileJson,
  Image as ImageIcon,
  Layers3,
  Monitor,
  Paintbrush,
  PanelRight,
  Plus,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react'
import type { ChangeEvent, CSSProperties, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { defaultAppearance, type AppearanceValue } from '@/fields/appearance'
import {
  blockStorageKey,
  cloneEditorValue,
  createEditorBlock,
  editorBlockLabels,
  editorTextFields,
  fallbackEditorPage,
  getAtPath,
  normalizeEditorPage,
  plainToRichText,
  richTextToPlain,
  setAtPath,
  type EditorBlock,
  type EditorFieldDefinition,
  type EditorPage,
} from '@/lib/visual-editor'
import styles from './VisualEditorShell.module.css'

type Props = {
  mode: 'payload' | 'local'
  page: EditorPage
  onChange: (page: EditorPage) => void
}

type InspectorTab = 'content' | 'design' | 'media' | 'code'
type MobilePanel = 'blocks' | 'canvas' | 'inspector'
type Device = 'mobile' | 'tablet' | 'desktop'
type MediaTarget = 'background' | 'primary' | 'secondary'

type PreviewMessage = {
  type?: string
  blockId?: string
  blockIndex?: number
  fieldPath?: string
}

const deviceWidths: Record<Device, number> = {
  mobile: 390,
  tablet: 768,
  desktop: 1440,
}

const palettes = [
  { name: 'Grafito', surfaceColor: '#111111', headingColor: '#ffffff', bodyColor: '#d6d4ce', accentColor: '#f4c84b' },
  { name: 'Arena', surfaceColor: '#f4f0e8', headingColor: '#1a1916', bodyColor: '#5a554c', accentColor: '#aa5c20' },
  { name: 'Noche', surfaceColor: '#0d1b2a', headingColor: '#f5fbff', bodyColor: '#c2d3e3', accentColor: '#62d0ff' },
  { name: 'Bosque', surfaceColor: '#173d32', headingColor: '#f4fff7', bodyColor: '#c8e4d6', accentColor: '#a4e454' },
  { name: 'Racing', surfaceColor: '#090305', headingColor: '#fff7f8', bodyColor: '#dfc6cc', accentColor: '#ff1f35' },
]

const blockOptions = [
  'portfolioShowcase',
  'hero',
  'servicesGrid',
  'projectsGrid',
  'content',
  'stats',
  'testimonials',
  'beforeAfter',
  'cta',
  'contactForm',
]

const asText = (value: unknown) => value == null ? '' : String(value)
const safeIndex = (index: number, length: number) => Math.max(0, Math.min(index, Math.max(0, length - 1)))

function Field({ label, children, fieldPath }: { label: string; children: ReactNode; fieldPath?: string }) {
  return <label className={styles.field} data-editor-field={fieldPath}><span>{label}</span>{children}</label>
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const color = /^#[0-9a-f]{6}$/i.test(value) ? value : '#151515'
  return (
    <Field label={label}>
      <div className={styles.colorField}>
        <input type="color" value={color} onChange={(event) => onChange(event.target.value)} />
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </Field>
  )
}

function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}) {
  const safe = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min
  return (
    <label className={`${styles.field} ${styles.rangeField}`}>
      <span>{label}<b>{safe}{suffix}</b></span>
      <input type="range" min={min} max={max} step={step} value={safe} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ label: string; value: string }>
  onChange: (value: string) => void
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
    </Field>
  )
}

function fileToDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function VisualEditorShell({ mode, page: pageProp, onChange }: Props) {
  const page = useMemo(() => normalizeEditorPage(pageProp), [pageProp])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<InspectorTab>('content')
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('canvas')
  const [device, setDevice] = useState<Device>('desktop')
  const [expanded, setExpanded] = useState(false)
  const [addType, setAddType] = useState('content')
  const [mediaTarget, setMediaTarget] = useState<MediaTarget>('primary')
  const [codeDraft, setCodeDraft] = useState('')
  const [notice, setNotice] = useState('')
  const [uploading, setUploading] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const mediaRef = useRef<HTMLInputElement>(null)
  const selected = page.layout[safeIndex(selectedIndex, page.layout.length)] || null

  useEffect(() => {
    setSelectedIndex((current) => safeIndex(current, page.layout.length))
  }, [page.layout.length])

  useEffect(() => {
    setCodeDraft(selected ? JSON.stringify(selected, null, 2) : '')
  }, [selected])

  useEffect(() => {
    if (!expanded) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [expanded])

  const flash = useCallback((message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 1800)
  }, [])

  const emitPreview = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: 'fabrick-editor:update',
        page,
        selectedBlockId: selected?.id || null,
      },
      '*',
    )
  }, [page, selected?.id])

  useEffect(() => {
    const timer = window.setTimeout(emitPreview, 40)
    return () => window.clearTimeout(timer)
  }, [emitPreview])

  useEffect(() => {
    const onMessage = (event: MessageEvent<PreviewMessage>) => {
      if (!event.data) return
      if (event.data.type === 'fabrick-editor:ready') {
        emitPreview()
        return
      }
      if (event.data.type !== 'fabrick-editor:select') return
      const index = page.layout.findIndex((block, blockIndex) =>
        (event.data.blockId && block.id === event.data.blockId) || blockIndex === event.data.blockIndex,
      )
      if (index < 0) return
      setSelectedIndex(index)
      const fieldPath = event.data.fieldPath || ''
      if (/image|media|background|before|after/i.test(fieldPath)) setActiveTab('media')
      else setActiveTab('content')
      setMobilePanel('inspector')
      if (fieldPath) {
        window.setTimeout(() => {
          const escaped = fieldPath.replace(/"/g, '\\"')
          document.querySelector(`[data-editor-field="${escaped}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          const input = document.querySelector(`[data-editor-field="${escaped}"] input, [data-editor-field="${escaped}"] textarea`) as HTMLElement | null
          input?.focus()
        }, 80)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [emitPreview, page.layout])

  const commit = useCallback((next: EditorPage) => onChange(normalizeEditorPage(next)), [onChange])

  const updatePage = useCallback((patch: Partial<EditorPage>) => {
    commit({ ...cloneEditorValue(page), ...patch })
  }, [commit, page])

  const replaceSelected = useCallback((nextBlock: EditorBlock) => {
    if (!selected) return
    const next = cloneEditorValue(page)
    next.layout[selectedIndex] = nextBlock
    commit(next)
  }, [commit, page, selected, selectedIndex])

  const updateSelectedPath = useCallback((path: string, value: unknown) => {
    if (!selected) return
    const nextBlock = cloneEditorValue(selected)
    setAtPath(nextBlock, path, value)
    replaceSelected(nextBlock)
  }, [replaceSelected, selected])

  const updateAppearance = useCallback((patch: Partial<AppearanceValue>) => {
    if (!selected) return
    replaceSelected({
      ...selected,
      appearance: { ...defaultAppearance, ...(selected.appearance || {}), ...patch },
    })
  }, [replaceSelected, selected])

  const updateArrayItem = useCallback((arrayPath: string, index: number, key: string, value: unknown) => {
    if (!selected) return
    const nextBlock = cloneEditorValue(selected)
    const current = getAtPath(nextBlock, arrayPath)
    const array = Array.isArray(current) ? current : []
    if (!array[index] || typeof array[index] !== 'object') array[index] = {}
    array[index][key] = value
    setAtPath(nextBlock, arrayPath, array)
    replaceSelected(nextBlock)
  }, [replaceSelected, selected])

  const addArrayItem = useCallback((arrayPath: string, item: Record<string, unknown>) => {
    if (!selected) return
    const nextBlock = cloneEditorValue(selected)
    const current = getAtPath(nextBlock, arrayPath)
    setAtPath(nextBlock, arrayPath, [...(Array.isArray(current) ? current : []), item])
    replaceSelected(nextBlock)
  }, [replaceSelected, selected])

  const removeArrayItem = useCallback((arrayPath: string, index: number) => {
    if (!selected) return
    const nextBlock = cloneEditorValue(selected)
    const current = getAtPath(nextBlock, arrayPath)
    if (!Array.isArray(current)) return
    setAtPath(nextBlock, arrayPath, current.filter((_, itemIndex) => itemIndex !== index))
    replaceSelected(nextBlock)
  }, [replaceSelected, selected])

  const addBlock = () => {
    const next = cloneEditorValue(page)
    next.layout.push(createEditorBlock(addType))
    commit(next)
    setSelectedIndex(next.layout.length - 1)
    setMobilePanel('inspector')
    setActiveTab('content')
    flash('Bloque añadido')
  }

  const moveBlock = (direction: -1 | 1) => {
    if (!selected) return
    const target = selectedIndex + direction
    if (target < 0 || target >= page.layout.length) return
    const next = cloneEditorValue(page)
    const [block] = next.layout.splice(selectedIndex, 1)
    next.layout.splice(target, 0, block)
    commit(next)
    setSelectedIndex(target)
  }

  const duplicateBlock = () => {
    if (!selected) return
    const next = cloneEditorValue(page)
    const copy = cloneEditorValue(selected)
    copy.id = `copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    next.layout.splice(selectedIndex + 1, 0, copy)
    commit(next)
    setSelectedIndex(selectedIndex + 1)
    flash('Bloque duplicado')
  }

  const deleteBlock = () => {
    if (!selected || page.layout.length <= 1) return
    const next = cloneEditorValue(page)
    next.layout.splice(selectedIndex, 1)
    commit(next)
    setSelectedIndex(safeIndex(selectedIndex, next.layout.length))
    flash('Bloque eliminado')
  }

  const saveLocal = () => {
    localStorage.setItem(blockStorageKey(page.slug), JSON.stringify(page))
    flash('Copia local guardada')
  }

  const restoreLocal = () => {
    const raw = localStorage.getItem(blockStorageKey(page.slug))
    if (!raw) return flash('No existe una copia local')
    try {
      commit(normalizeEditorPage(JSON.parse(raw)))
      flash('Copia local recuperada')
    } catch {
      flash('La copia local no es válida')
    }
  }

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(page, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${page.slug || 'pagina'}-payload.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importJSON = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      commit(normalizeEditorPage(data))
      setSelectedIndex(0)
      flash('Diseño importado')
    } catch {
      flash('El JSON no es válido')
    }
  }

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selected) return
    setUploading(true)
    try {
      let url = ''
      if (mode === 'payload') {
        try {
          const form = new FormData()
          form.append('file', file)
          form.append('_payload', JSON.stringify({
            alt: file.name.replace(/\.[^.]+$/, ''),
            category: mediaTarget === 'background' ? 'background' : 'content',
            device: 'universal',
            storageFolder: 'visual-editor',
          }))
          const response = await fetch('/api/media', { method: 'POST', body: form, credentials: 'include' })
          const result = await response.json().catch(() => null)
          if (response.ok && result?.doc?.url) url = result.doc.url
        } catch {
          url = ''
        }
      }
      if (!url) url = await fileToDataURL(file)
      if (mediaTarget === 'background') updateAppearance({ backgroundURL: url, surfaceMode: 'image' })
      if (mediaTarget === 'primary') updateAppearance({ imageURL: url })
      if (mediaTarget === 'secondary') updateAppearance({ secondaryImageURL: url })
      flash(mode === 'payload' && !url.startsWith('data:') ? 'Imagen subida a Multimedia' : 'Imagen guardada en el diseño local')
    } finally {
      setUploading(false)
    }
  }

  const applyCode = () => {
    if (!selected) return
    try {
      const parsed = JSON.parse(codeDraft) as EditorBlock
      if (!parsed.blockType) throw new Error('blockType requerido')
      replaceSelected({ ...parsed, id: parsed.id || selected.id })
      flash('Código aplicado')
    } catch {
      flash('El JSON del bloque contiene un error')
    }
  }

  const renderTextField = (definition: EditorFieldDefinition) => {
    if (!selected) return null
    const raw = getAtPath(selected, definition.path)
    const value = definition.kind === 'richText' ? richTextToPlain(raw) : asText(raw)
    const onFieldChange = (nextValue: string) => {
      if (definition.kind === 'richText') return updateSelectedPath(definition.path, plainToRichText(nextValue))
      if (definition.kind === 'number') return updateSelectedPath(definition.path, Number(nextValue))
      updateSelectedPath(definition.path, nextValue)
    }

    return (
      <Field label={definition.label} fieldPath={definition.path} key={definition.path}>
        {definition.kind === 'textarea' || definition.kind === 'richText' ? (
          <textarea rows={definition.kind === 'richText' ? 7 : 4} value={value} placeholder={definition.placeholder} onChange={(event) => onFieldChange(event.target.value)} />
        ) : (
          <input type={definition.kind === 'number' ? 'number' : 'text'} inputMode={definition.kind === 'url' ? 'url' : undefined} value={value} placeholder={definition.placeholder} onChange={(event) => onFieldChange(event.target.value)} />
        )}
      </Field>
    )
  }

  const appearance = { ...defaultAppearance, ...(selected?.appearance || {}) }
  const blockID = selected?.id || `layout.${selectedIndex}`
  const editorClassName = [styles.editor, expanded ? styles.expanded : '', mode === 'local' ? styles.localMode : ''].filter(Boolean).join(' ')

  return (
    <section className={editorClassName} aria-label="Editor visual global de páginas">
      {notice ? <div className={styles.notice}>{notice}</div> : null}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span><Layers3 size={20} /></span>
          <div><small>EDITOR GLOBAL · PAYLOAD</small><strong>{page.title}<i>{page.slug === 'home' ? '/' : `/${page.slug}`}</i></strong></div>
        </div>
        <div className={styles.status}>
          <span className={mode === 'payload' ? styles.statusPayload : styles.statusLocal}>
            {mode === 'payload' ? 'PAYLOAD + AUTOSAVE' : 'MODO LOCAL'}
          </span>
          <small>{mode === 'payload' ? 'Publica con base de datos; diseña también con copia local.' : 'No consulta PostgreSQL ni necesita sesión.'}</small>
        </div>
        <div className={styles.topActions}>
          <button type="button" onClick={saveLocal} title="Guardar copia en este dispositivo"><Save size={15} /><span>Guardar local</span></button>
          <button type="button" onClick={restoreLocal} title="Recuperar copia local"><RotateCcw size={15} /><span>Recuperar</span></button>
          <button type="button" onClick={exportJSON} title="Descargar JSON"><Download size={15} /><span>Exportar</span></button>
          <button type="button" onClick={() => importRef.current?.click()} title="Importar JSON"><Upload size={15} /><span>Importar</span></button>
          <button type="button" onClick={() => setExpanded((value) => !value)} title={expanded ? 'Salir de pantalla completa' : 'Pantalla completa'}>{expanded ? <X size={16} /> : <Expand size={16} />}</button>
          <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importJSON(event)} />
        </div>
      </header>

      <nav className={styles.mobileSwitcher} aria-label="Secciones del editor">
        <button className={mobilePanel === 'blocks' ? styles.active : ''} type="button" onClick={() => setMobilePanel('blocks')}><Layers3 size={16} /> Bloques</button>
        <button className={mobilePanel === 'canvas' ? styles.active : ''} type="button" onClick={() => setMobilePanel('canvas')}><Monitor size={16} /> Vista</button>
        <button className={mobilePanel === 'inspector' ? styles.active : ''} type="button" onClick={() => setMobilePanel('inspector')}><PanelRight size={16} /> Editar</button>
      </nav>

      <div className={styles.workspace}>
        <aside className={`${styles.blocksPanel} ${mobilePanel === 'blocks' ? styles.mobileVisible : ''}`}>
          <div className={styles.panelTitle}><span><Layers3 size={14} /> Estructura</span><b>{page.layout.length} bloques</b></div>
          <div className={styles.blockList}>
            {page.layout.map((block, index) => (
              <button
                type="button"
                className={`${styles.blockItem} ${index === selectedIndex ? styles.selected : ''}`}
                key={block.id || `${block.blockType}-${index}`}
                onClick={() => { setSelectedIndex(index); setMobilePanel('inspector') }}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{block.blockName || editorBlockLabels[block.blockType] || block.blockType}</strong><small>{block.id || `layout.${index}`}</small></div>
              </button>
            ))}
          </div>
          <div className={styles.addBlock}>
            <select value={addType} onChange={(event) => setAddType(event.target.value)}>
              {blockOptions.map((blockType) => <option value={blockType} key={blockType}>{editorBlockLabels[blockType]}</option>)}
            </select>
            <button type="button" onClick={addBlock}><Plus size={15} /> Añadir bloque</button>
          </div>
          <button type="button" className={styles.resetButton} onClick={() => { commit(cloneEditorValue(fallbackEditorPage)); setSelectedIndex(0); flash('Plantilla restablecida') }}><RotateCcw size={14} /> Usar plantilla base</button>
          {mode === 'payload' ? <a className={styles.localLink} href="/editor-local" target="_blank" rel="noreferrer">Abrir editor sin base de datos</a> : null}
        </aside>

        <section className={`${styles.canvasPanel} ${mobilePanel === 'canvas' ? styles.mobileVisible : ''}`}>
          <div className={styles.canvasToolbar}>
            <div className={styles.devices}>
              <button className={device === 'mobile' ? styles.active : ''} type="button" onClick={() => setDevice('mobile')} title="Móvil"><Smartphone size={15} /></button>
              <button className={device === 'tablet' ? styles.active : ''} type="button" onClick={() => setDevice('tablet')} title="Tablet"><Tablet size={15} /></button>
              <button className={device === 'desktop' ? styles.active : ''} type="button" onClick={() => setDevice('desktop')} title="Escritorio"><Monitor size={15} /></button>
            </div>
            <p>Pulsa cualquier texto, botón o bloque dentro de la página para editarlo.</p>
            <code>{deviceWidths[device]} px</code>
          </div>
          <div className={styles.canvasStage}>
            <div className={styles.deviceFrame} style={{ '--editor-device-width': `${deviceWidths[device]}px` } as CSSProperties}>
              <iframe ref={iframeRef} src="/visual-editor-preview" title="Vista previa interactiva" onLoad={emitPreview} />
            </div>
          </div>
        </section>

        <aside className={`${styles.inspector} ${mobilePanel === 'inspector' ? styles.mobileVisible : ''}`}>
          <header className={styles.inspectorHead}>
            <div><small>{blockID}</small><strong>{selected ? editorBlockLabels[selected.blockType] || selected.blockType : 'Sin bloque'}</strong></div>
            <div className={styles.blockActions}>
              <button type="button" onClick={() => moveBlock(-1)} disabled={selectedIndex === 0} title="Subir"><ChevronUp size={14} /></button>
              <button type="button" onClick={() => moveBlock(1)} disabled={selectedIndex >= page.layout.length - 1} title="Bajar"><ChevronDown size={14} /></button>
              <button type="button" onClick={duplicateBlock} title="Duplicar"><Copy size={14} /></button>
              <button type="button" onClick={deleteBlock} disabled={page.layout.length <= 1} title="Eliminar"><Trash2 size={14} /></button>
            </div>
          </header>
          <div className={styles.inspectorTabs}>
            <button className={activeTab === 'content' ? styles.active : ''} type="button" onClick={() => setActiveTab('content')}><Type size={14} /> Contenido</button>
            <button className={activeTab === 'design' ? styles.active : ''} type="button" onClick={() => setActiveTab('design')}><Paintbrush size={14} /> Diseño</button>
            <button className={activeTab === 'media' ? styles.active : ''} type="button" onClick={() => setActiveTab('media')}><ImageIcon size={14} /> Imagen</button>
            <button className={activeTab === 'code' ? styles.active : ''} type="button" onClick={() => setActiveTab('code')}><Braces size={14} /> Código</button>
          </div>

          <div className={styles.inspectorBody}>
            {activeTab === 'content' && selected ? (
              <div>
                <div className={styles.pageIdentity}>
                  <Field label="Nombre de la página"><input value={page.title} onChange={(event) => updatePage({ title: event.target.value })} /></Field>
                  <Field label="Ruta / slug"><input value={page.slug} onChange={(event) => updatePage({ slug: event.target.value.replace(/^\/+/, '').replace(/\s+/g, '-').toLowerCase() || 'home' })} /></Field>
                  <Field label="Nombre interno del bloque"><input value={selected.blockName || ''} placeholder={editorBlockLabels[selected.blockType]} onChange={(event) => updateSelectedPath('blockName', event.target.value)} /></Field>
                </div>
                {(editorTextFields[selected.blockType] || []).map(renderTextField)}

                {Array.isArray(selected.stats) ? (
                  <details className={styles.arrayEditor} open>
                    <summary>Indicadores del bloque</summary>
                    {selected.stats.map((item: Doc, index: number) => (
                      <div className={styles.arrayRow} key={item.id || index}>
                        <input value={asText(item.value)} placeholder="Valor" onChange={(event) => updateArrayItem('stats', index, 'value', event.target.value)} />
                        <input value={asText(item.label)} placeholder="Etiqueta" onChange={(event) => updateArrayItem('stats', index, 'label', event.target.value)} />
                        <button type="button" onClick={() => removeArrayItem('stats', index)}>Eliminar</button>
                      </div>
                    ))}
                    <div className={styles.arrayRow}><button type="button" onClick={() => addArrayItem('stats', { value: '100%', label: 'Nuevo indicador' })}>+ Añadir indicador</button></div>
                  </details>
                ) : null}

                {selected.blockType === 'stats' && Array.isArray(selected.items) ? (
                  <details className={styles.arrayEditor} open>
                    <summary>Tarjetas de indicadores</summary>
                    {selected.items.map((item: Doc, index: number) => (
                      <div className={styles.arrayRow} key={item.id || index}>
                        <input value={asText(item.value)} placeholder="Valor" onChange={(event) => updateArrayItem('items', index, 'value', event.target.value)} />
                        <input value={asText(item.label)} placeholder="Título" onChange={(event) => updateArrayItem('items', index, 'label', event.target.value)} />
                        <textarea rows={2} value={asText(item.description)} placeholder="Descripción" onChange={(event) => updateArrayItem('items', index, 'description', event.target.value)} />
                        <button type="button" onClick={() => removeArrayItem('items', index)}>Eliminar</button>
                      </div>
                    ))}
                    <div className={styles.arrayRow}><button type="button" onClick={() => addArrayItem('items', { value: '01', label: 'Nuevo resultado', description: 'Descripción' })}>+ Añadir tarjeta</button></div>
                  </details>
                ) : null}

                {selected.blockType === 'portfolioShowcase' && Array.isArray(selected.projects) ? (
                  <details className={styles.arrayEditor} open>
                    <summary>Casos del portfolio</summary>
                    {selected.projects.map((item: Doc, index: number) => (
                      <div className={styles.arrayRow} key={item.id || index}>
                        <input value={asText(item.title)} placeholder="Título" onChange={(event) => updateArrayItem('projects', index, 'title', event.target.value)} />
                        <input value={asText(item.type)} placeholder="Categoría" onChange={(event) => updateArrayItem('projects', index, 'type', event.target.value)} />
                        <textarea rows={3} value={asText(item.description)} placeholder="Descripción" onChange={(event) => updateArrayItem('projects', index, 'description', event.target.value)} />
                        <input value={asText(item.imageURL)} placeholder="URL de imagen" onChange={(event) => updateArrayItem('projects', index, 'imageURL', event.target.value)} />
                        <input value={asText(item.url)} placeholder="Enlace" onChange={(event) => updateArrayItem('projects', index, 'url', event.target.value)} />
                        <button type="button" onClick={() => removeArrayItem('projects', index)}>Eliminar</button>
                      </div>
                    ))}
                    <div className={styles.arrayRow}><button type="button" onClick={() => addArrayItem('projects', { title: 'Nuevo caso', type: 'Proyecto', description: 'Descripción', url: '#contacto' })}>+ Añadir caso</button></div>
                  </details>
                ) : null}
              </div>
            ) : null}

            {activeTab === 'design' && selected ? (
              <div className={styles.appearancePanel}>
                <div className={styles.paletteRow}>
                  {palettes.map((palette) => (
                    <button type="button" key={palette.name} onClick={() => updateAppearance({ ...palette, surfaceMode: 'solid', buttonColor: palette.accentColor, buttonBorderColor: palette.accentColor, buttonTextColor: '#111111' })}>
                      <i style={{ background: palette.surfaceColor }} /><i style={{ background: palette.headingColor }} /><i style={{ background: palette.accentColor }} /><span>{palette.name}</span>
                    </button>
                  ))}
                </div>

                <details open>
                  <summary>Fondo, opacidad y borde</summary>
                  <div className={styles.formGrid}>
                    <SelectField label="Superficie" value={appearance.surfaceMode || 'transparent'} options={[
                      { label: 'Transparente', value: 'transparent' }, { label: 'Glass', value: 'glass' }, { label: 'Sólida', value: 'solid' }, { label: 'Imagen', value: 'image' },
                    ]} onChange={(value) => updateAppearance({ surfaceMode: value as AppearanceValue['surfaceMode'] })} />
                    <ColorField label="Color de fondo" value={appearance.surfaceColor || '#ffffff'} onChange={(value) => updateAppearance({ surfaceColor: value })} />
                    <RangeField label="Opacidad" value={Number(appearance.surfaceOpacity)} min={0} max={100} suffix="%" onChange={(value) => updateAppearance({ surfaceOpacity: value })} />
                    <RangeField label="Difuminado" value={Number(appearance.backdropBlur)} min={0} max={48} suffix="px" onChange={(value) => updateAppearance({ backdropBlur: value })} />
                    <ColorField label="Color de overlay" value={appearance.overlayColor || '#10110f'} onChange={(value) => updateAppearance({ overlayColor: value })} />
                    <RangeField label="Overlay" value={Number(appearance.overlayOpacity)} min={0} max={90} suffix="%" onChange={(value) => updateAppearance({ overlayOpacity: value })} />
                    <ColorField label="Color del borde" value={appearance.borderColor || '#ffffff'} onChange={(value) => updateAppearance({ borderColor: value })} />
                    <RangeField label="Grosor del borde" value={Number(appearance.borderWidth)} min={0} max={8} suffix="px" onChange={(value) => updateAppearance({ borderWidth: value })} />
                    <RangeField label="Radio de esquinas" value={Number(appearance.cornerRadius)} min={0} max={72} suffix="px" onChange={(value) => updateAppearance({ cornerRadius: value })} />
                  </div>
                </details>

                <details open>
                  <summary>Texto y tipografía</summary>
                  <div className={styles.formGrid}>
                    <SelectField label="Tipografía" value={appearance.fontFamily || 'sans'} options={[
                      { label: 'Moderna / sans', value: 'sans' }, { label: 'Editorial / serif', value: 'serif' }, { label: 'Display', value: 'display' }, { label: 'Técnica / mono', value: 'mono' },
                    ]} onChange={(value) => updateAppearance({ fontFamily: value as AppearanceValue['fontFamily'] })} />
                    <ColorField label="Color de títulos" value={appearance.headingColor || '#151515'} onChange={(value) => updateAppearance({ headingColor: value })} />
                    <ColorField label="Color de párrafos" value={appearance.bodyColor || '#4b4b4b'} onChange={(value) => updateAppearance({ bodyColor: value })} />
                    <ColorField label="Color de acento" value={appearance.accentColor || '#f4c84b'} onChange={(value) => updateAppearance({ accentColor: value })} />
                    <RangeField label="Escala tipográfica" value={Number(appearance.fontScale)} min={70} max={160} suffix="%" onChange={(value) => updateAppearance({ fontScale: value })} />
                    <RangeField label="Brillo del texto" value={Number(appearance.textGlow)} min={0} max={100} suffix="%" onChange={(value) => updateAppearance({ textGlow: value })} />
                    <SelectField label="Alineación" value={appearance.textAlign || 'left'} options={[
                      { label: 'Izquierda', value: 'left' }, { label: 'Centro', value: 'center' }, { label: 'Derecha', value: 'right' },
                    ]} onChange={(value) => updateAppearance({ textAlign: value as AppearanceValue['textAlign'] })} />
                    <SelectField label="Ancho del contenido" value={appearance.contentWidth || 'normal'} options={[
                      { label: 'Estrecho', value: 'narrow' }, { label: 'Normal', value: 'normal' }, { label: 'Amplio', value: 'wide' }, { label: 'Completo', value: 'full' },
                    ]} onChange={(value) => updateAppearance({ contentWidth: value as AppearanceValue['contentWidth'] })} />
                  </div>
                </details>

                <details>
                  <summary>Botones</summary>
                  <div className={styles.formGrid}>
                    <ColorField label="Color del botón" value={appearance.buttonColor || '#f4c84b'} onChange={(value) => updateAppearance({ buttonColor: value })} />
                    <ColorField label="Color del texto" value={appearance.buttonTextColor || '#15130f'} onChange={(value) => updateAppearance({ buttonTextColor: value })} />
                    <ColorField label="Color del borde" value={appearance.buttonBorderColor || '#f4c84b'} onChange={(value) => updateAppearance({ buttonBorderColor: value })} />
                    <RangeField label="Borde del botón" value={Number(appearance.buttonBorderWidth)} min={0} max={6} suffix="px" onChange={(value) => updateAppearance({ buttonBorderWidth: value })} />
                    <RangeField label="Radio del botón" value={Number(appearance.buttonRadius)} min={0} max={999} suffix="px" onChange={(value) => updateAppearance({ buttonRadius: value })} />
                    <SelectField label="Tamaño" value={appearance.buttonSize || 'medium'} options={[
                      { label: 'Pequeño', value: 'small' }, { label: 'Mediano', value: 'medium' }, { label: 'Grande', value: 'large' },
                    ]} onChange={(value) => updateAppearance({ buttonSize: value as AppearanceValue['buttonSize'] })} />
                  </div>
                </details>

                <details>
                  <summary>Espaciado y móvil</summary>
                  <div className={styles.formGrid}>
                    <RangeField label="Espacio superior" value={Number(appearance.paddingTop)} min={0} max={260} suffix="px" onChange={(value) => updateAppearance({ paddingTop: value })} />
                    <RangeField label="Espacio inferior" value={Number(appearance.paddingBottom)} min={0} max={260} suffix="px" onChange={(value) => updateAppearance({ paddingBottom: value })} />
                    <SelectField label="Composición móvil" value={appearance.mobileLayout || 'stack'} options={[
                      { label: 'Apilada', value: 'stack' }, { label: 'Horizontal', value: 'horizontal' }, { label: 'Compacta', value: 'compact' },
                    ]} onChange={(value) => updateAppearance({ mobileLayout: value as AppearanceValue['mobileLayout'] })} />
                    <SelectField label="Alineación móvil" value={appearance.mobileTextAlign || 'left'} options={[
                      { label: 'Izquierda', value: 'left' }, { label: 'Centro', value: 'center' }, { label: 'Derecha', value: 'right' },
                    ]} onChange={(value) => updateAppearance({ mobileTextAlign: value as AppearanceValue['mobileTextAlign'] })} />
                    <RangeField label="Margen interno móvil" value={Number(appearance.mobilePadding)} min={12} max={48} suffix="px" onChange={(value) => updateAppearance({ mobilePadding: value })} />
                    <RangeField label="Escala de título móvil" value={Number(appearance.mobileHeadingScale)} min={55} max={130} suffix="%" onChange={(value) => updateAppearance({ mobileHeadingScale: value })} />
                    <Field label="Visibilidad"><label><input type="checkbox" checked={Boolean(appearance.hideOnMobile)} onChange={(event) => updateAppearance({ hideOnMobile: event.target.checked })} /> Ocultar en móvil</label></Field>
                  </div>
                </details>

                <details>
                  <summary>Animación</summary>
                  <div className={styles.formGrid}>
                    <SelectField label="Entrada" value={appearance.animationPreset || 'fade-up'} options={[
                      { label: 'Sin animación', value: 'none' }, { label: 'Subir y aparecer', value: 'fade-up' }, { label: 'Aparecer', value: 'fade' }, { label: 'Escala', value: 'scale' }, { label: 'Desde la izquierda', value: 'slide-left' }, { label: 'Desde la derecha', value: 'slide-right' },
                    ]} onChange={(value) => updateAppearance({ animationPreset: value as AppearanceValue['animationPreset'] })} />
                    <RangeField label="Duración" value={Number(appearance.animationDuration)} min={150} max={1800} step={50} suffix="ms" onChange={(value) => updateAppearance({ animationDuration: value })} />
                    <RangeField label="Retraso" value={Number(appearance.animationDelay)} min={0} max={1200} step={50} suffix="ms" onChange={(value) => updateAppearance({ animationDelay: value })} />
                  </div>
                </details>
              </div>
            ) : null}

            {activeTab === 'media' && selected ? (
              <div className={styles.mediaPanel}>
                <p className={styles.hint}>Puedes subir o pegar imágenes sin salir del bloque. En Payload se intenta guardar primero en Multimedia; si no hay base de datos, queda como recurso local dentro del JSON exportable.</p>
                <SelectField label="Destino" value={mediaTarget} options={[
                  { label: 'Fondo del bloque', value: 'background' }, { label: 'Imagen principal', value: 'primary' }, { label: 'Segunda imagen / después', value: 'secondary' },
                ]} onChange={(value) => setMediaTarget(value as MediaTarget)} />
                <button type="button" className={styles.uploadButton} disabled={uploading} onClick={() => mediaRef.current?.click()}><Upload size={15} /> {uploading ? 'Procesando…' : 'Subir imagen'}</button>
                <input ref={mediaRef} hidden type="file" accept="image/*" onChange={(event) => void uploadImage(event)} />
                <Field label="URL del fondo" fieldPath="appearance.backgroundURL"><input value={appearance.backgroundURL || ''} placeholder="https://… o /media/…" onChange={(event) => updateAppearance({ backgroundURL: event.target.value, surfaceMode: event.target.value ? 'image' : appearance.surfaceMode })} /></Field>
                <Field label="URL de imagen principal" fieldPath="appearance.imageURL"><input value={appearance.imageURL || ''} placeholder="https://…" onChange={(event) => updateAppearance({ imageURL: event.target.value })} /></Field>
                <Field label="URL de segunda imagen" fieldPath="appearance.secondaryImageURL"><input value={appearance.secondaryImageURL || ''} placeholder="https://…" onChange={(event) => updateAppearance({ secondaryImageURL: event.target.value })} /></Field>
                <SelectField label="Encuadre" value={appearance.imageFit || 'cover'} options={[{ label: 'Cubrir', value: 'cover' }, { label: 'Contener', value: 'contain' }]} onChange={(value) => updateAppearance({ imageFit: value as AppearanceValue['imageFit'] })} />
                <RangeField label="Opacidad de imagen" value={Number(appearance.imageOpacity)} min={0} max={100} suffix="%" onChange={(value) => updateAppearance({ imageOpacity: value })} />
              </div>
            ) : null}

            {activeTab === 'code' && selected ? (
              <div className={styles.codePanel}>
                <div className={styles.codeIdentity}>
                  <span><FileJson size={13} /> Ruta del bloque</span>
                  <code>layout.{selectedIndex} · {selected.id || 'sin-id'} · {selected.blockType}</code>
                </div>
                <p className={styles.hint}>Este es el JSON real que Payload guarda en el campo <code>layout</code>. Puedes corregir propiedades avanzadas y aplicarlas al canvas al instante.</p>
                <textarea spellCheck={false} value={codeDraft} onChange={(event) => setCodeDraft(event.target.value)} />
                <button type="button" onClick={applyCode}><Braces size={15} /> Aplicar JSON al bloque</button>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <footer className={styles.footer}>
        <div><span className={mode === 'payload' ? styles.dotPayload : styles.dotLocal} /><strong>{mode === 'payload' ? 'Cambios conectados al borrador de Payload' : 'Cambios guardables sin base de datos'}</strong><small>{mode === 'payload' ? 'Usa Guardar borrador o Publicar en la barra de Payload.' : 'Guarda localmente o exporta el JSON para importarlo después.'}</small></div>
        <button type="button" onClick={() => setMobilePanel('canvas')}><Monitor size={14} /> Ver resultado</button>
      </footer>
    </section>
  )
}

type Doc = Record<string, any>
