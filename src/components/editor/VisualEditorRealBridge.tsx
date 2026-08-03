'use client'

import { useEffect } from 'react'

import { appearanceProps } from '@/lib/appearance'
import { getAtPath, type EditorBlock, type EditorPage } from '@/lib/visual-editor'

type Props = {
  effectiveLayout: EditorBlock[]
}

type EditorMessage = {
  type?: string
  page?: EditorPage
  selectedBlockId?: string | null
}

type FieldMap = Record<string, HTMLElement | null>

const editorStyle = `
html[data-visual-editor="true"] { scroll-behavior: auto !important; }
html[data-visual-editor="true"] *,
html[data-visual-editor="true"] *::before,
html[data-visual-editor="true"] *::after {
  animation-duration: .001ms !important;
  animation-iteration-count: 1 !important;
  scroll-behavior: auto !important;
  transition-duration: .001ms !important;
}
html[data-visual-editor="true"] .site-loader,
html[data-visual-editor="true"] [class*="audio" i],
html[data-visual-editor="true"] [class*="consent" i] {
  display: none !important;
}
.visual-editor-real-page [data-editor-block-index] {
  position: relative;
  isolation: isolate;
  cursor: pointer;
  outline: 2px solid transparent;
  outline-offset: -3px;
}
.visual-editor-real-page [data-editor-block-index]:hover {
  outline-color: rgba(244, 200, 75, .66);
}
.visual-editor-real-page [data-editor-selected="true"] {
  z-index: 20;
  outline: 3px solid #f4c84b !important;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.55);
}
.visual-editor-real-page [data-editor-field] {
  cursor: text;
  outline: 1px dashed transparent;
  outline-offset: 4px;
}
.visual-editor-real-page [data-editor-field]:hover {
  outline-color: rgba(244, 200, 75, .82);
}
.visual-editor-real-page a,
.visual-editor-real-page button,
.visual-editor-real-page input,
.visual-editor-real-page textarea,
.visual-editor-real-page select {
  pointer-events: auto;
}
#fabrick-editor-status {
  position: fixed;
  z-index: 2147483646;
  right: 10px;
  bottom: 10px;
  max-width: min(330px, calc(100vw - 20px));
  padding: 8px 11px;
  color: #17140e;
  border-radius: 999px;
  background: #f4c84b;
  box-shadow: 0 12px 36px rgba(0,0,0,.3);
  font: 800 10px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace;
  pointer-events: none;
}
`

function queryFirst(root: ParentNode, selectors: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(selectors)
}

function rootBlocks() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>([
    '.ai-page--preview.portfolio-factory-page > .portfolio-showcase',
    '.ai-page--preview > .portfolio-showcase',
    '.ai-page--preview > .cms-surface',
    '.ai-page--preview > section',
  ].join(',')))
  return candidates.filter((item, index) => candidates.indexOf(item) === index)
}

function ownText(element: HTMLElement, value: unknown) {
  const text = value == null ? '' : String(value)
  const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE)
  if (textNode) {
    textNode.textContent = text
    return
  }
  element.insertBefore(document.createTextNode(text), element.firstChild)
}

function plainText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  const parts: string[] = []
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    if (typeof record.text === 'string') parts.push(record.text)
    if (Array.isArray(record.children)) record.children.forEach(walk)
    if (record.root) walk(record.root)
  }
  walk(value)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function fieldsFor(root: HTMLElement, block: EditorBlock): FieldMap {
  const firstHeading = queryFirst(root, '[class*="heroCopy"] h1, .hero-copy h1, .section-heading h2, .cta-inner h2, .contact-grid h2, .stats-section h2, h1, h2')
  const firstParagraph = queryFirst(root, '[class*="heroCopy"] > p, .hero-copy > p, .section-heading > p, .cta-inner p, .contact-grid > div:first-child > p, .content-split > div:first-child > p, p')
  const actions = Array.from(root.querySelectorAll<HTMLElement>('[class*="actions"] a, .hero-actions a, .button, .round-link'))
  const map: FieldMap = {
    eyebrow: queryFirst(root, '.eyebrow'),
    heading: firstHeading,
    highlight: firstHeading?.querySelector<HTMLElement>('em') || null,
    description: firstParagraph,
    intro: queryFirst(root, '.section-heading > p') || firstParagraph,
    content: queryFirst(root, '.content-split > div:first-child > p') || firstParagraph,
    'primaryCTA.label': actions[0] || null,
    'secondaryCTA.label': actions[1] || null,
    'button.label': actions[0] || null,
  }

  if (block.blockType === 'portfolioShowcase') {
    map.eyebrow = queryFirst(root, '[class*="heroCopy"] .eyebrow')
    map.heading = queryFirst(root, '[class*="heroCopy"] h1')
    map.highlight = map.heading?.querySelector<HTMLElement>('em') || null
    map.description = queryFirst(root, '[class*="heroCopy"] > p')
    const portfolioActions = Array.from(root.querySelectorAll<HTMLElement>('[class*="actions"] a'))
    map['primaryCTA.label'] = portfolioActions[0] || null
    map['secondaryCTA.label'] = portfolioActions[1] || null
  }

  if (block.blockType === 'stats') map.heading = queryFirst(root, 'h2')
  return map
}

function markFields(root: HTMLElement, block: EditorBlock) {
  const map = fieldsFor(root, block)
  Object.entries(map).forEach(([path, element]) => {
    if (element) element.dataset.editorField = path
  })

  if (Array.isArray(block.stats)) {
    root.querySelectorAll<HTMLElement>('.hero-stats > div').forEach((item, index) => {
      const value = item.querySelector<HTMLElement>('strong')
      const label = item.querySelector<HTMLElement>('span')
      if (value) value.dataset.editorField = `stats.${index}.value`
      if (label) label.dataset.editorField = `stats.${index}.label`
    })
  }

  if (block.blockType === 'stats' && Array.isArray(block.items)) {
    root.querySelectorAll<HTMLElement>('.stats-grid > article').forEach((item, index) => {
      const value = item.querySelector<HTMLElement>('strong')
      const label = item.querySelector<HTMLElement>('h3')
      const description = item.querySelector<HTMLElement>('p')
      if (value) value.dataset.editorField = `items.${index}.value`
      if (label) label.dataset.editorField = `items.${index}.label`
      if (description) description.dataset.editorField = `items.${index}.description`
    })
  }
}

function applyAppearance(root: HTMLElement, block: EditorBlock) {
  const target = root.matches('.cms-surface,.portfolio-showcase')
    ? root
    : queryFirst(root, '.cms-surface,.portfolio-showcase') || root
  const props = appearanceProps(block.appearance)

  Object.entries(props.style).forEach(([key, value]) => {
    if (value == null) return
    if (key.startsWith('--')) target.style.setProperty(key, String(value))
    else (target.style as unknown as Record<string, string>)[key] = String(value)
  })
}

function applyBlock(root: HTMLElement, block: EditorBlock) {
  root.dataset.editorBlockId = String(block.id || '')
  root.dataset.editorBlockType = block.blockType
  markFields(root, block)
  applyAppearance(root, block)

  const fields = fieldsFor(root, block)
  Object.entries(fields).forEach(([path, element]) => {
    if (!element) return
    const value = getAtPath(block, path)
    if (path === 'content') ownText(element, plainText(value))
    else if (value != null) ownText(element, value)
  })

  if (Array.isArray(block.stats)) {
    root.querySelectorAll<HTMLElement>('.hero-stats > div').forEach((item, index) => {
      const data = block.stats?.[index]
      if (!data) return
      const value = item.querySelector<HTMLElement>('strong')
      const label = item.querySelector<HTMLElement>('span')
      if (value) ownText(value, data.value)
      if (label) ownText(label, data.label)
    })
  }

  if (block.blockType === 'stats' && Array.isArray(block.items)) {
    root.querySelectorAll<HTMLElement>('.stats-grid > article').forEach((item, index) => {
      const data = block.items?.[index]
      if (!data) return
      const value = item.querySelector<HTMLElement>('strong')
      const label = item.querySelector<HTMLElement>('h3')
      const description = item.querySelector<HTMLElement>('p')
      if (value) ownText(value, data.value)
      if (label) ownText(label, data.label)
      if (description) ownText(description, data.description)
    })
  }

  const appearance = block.appearance || {}
  if (typeof appearance.imageURL === 'string' && appearance.imageURL) {
    const image = queryFirst(root, '.content-media img, .before-after figure:first-child img') as HTMLImageElement | null
    if (image) image.src = appearance.imageURL
  }
  if (typeof appearance.secondaryImageURL === 'string' && appearance.secondaryImageURL) {
    const image = queryFirst(root, '.before-after figure:last-child img') as HTMLImageElement | null
    if (image) image.src = appearance.secondaryImageURL
  }
}

function structuralSignature(layout: EditorBlock[]) {
  return layout.map((block) => block.blockType).join('|')
}

function showStatus(message: string) {
  let status = document.getElementById('fabrick-editor-status')
  if (!status) {
    status = document.createElement('div')
    status.id = 'fabrick-editor-status'
    document.body.appendChild(status)
  }
  status.textContent = message
}

export default function VisualEditorRealBridge({ effectiveLayout }: Props) {
  useEffect(() => {
    document.documentElement.dataset.visualEditor = 'true'
    const style = document.createElement('style')
    style.dataset.visualEditorStyle = 'true'
    style.textContent = editorStyle
    document.head.appendChild(style)

    let roots = rootBlocks()
    roots.forEach((root, index) => {
      root.dataset.editorBlockIndex = String(index)
      const block = effectiveLayout[index]
      if (block) applyBlock(root, block)
    })

    const initialSignature = structuralSignature(effectiveLayout)
    let reloadTimer = 0

    const setSelected = (selectedID?: string | null, selectedIndex?: number) => {
      roots.forEach((root, index) => {
        const selected = selectedID
          ? root.dataset.editorBlockId === String(selectedID)
          : index === selectedIndex
        root.dataset.editorSelected = selected ? 'true' : 'false'
      })
    }

    const onMessage = (event: MessageEvent<EditorMessage>) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'fabrick-editor:update' || !event.data.page) return

      const layout = Array.isArray(event.data.page.layout) ? event.data.page.layout : []
      roots = rootBlocks()
      roots.forEach((root, index) => {
        root.dataset.editorBlockIndex = String(index)
        const block = layout[index]
        if (block) applyBlock(root, block)
      })
      setSelected(event.data.selectedBlockId)

      const nextSignature = structuralSignature(layout)
      if (nextSignature !== initialSignature || roots.length !== layout.length) {
        window.clearTimeout(reloadTimer)
        showStatus('Guardando estructura… la vista real se recargará una vez.')
        reloadTimer = window.setTimeout(() => {
          const key = `fabrick-editor-reload:${nextSignature}`
          const attempts = Number(sessionStorage.getItem(key) || 0)
          if (attempts < 2) {
            sessionStorage.setItem(key, String(attempts + 1))
            window.location.reload()
          } else {
            showStatus('Estructura guardada. Recarga manualmente la vista si aún no aparece.')
          }
        }, 2600)
      }
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (!target) return
      if (target.closest('a,button,input,textarea,select,form')) event.preventDefault()

      const root = roots.find((candidate) => candidate === target || candidate.contains(target))
      if (!root) return

      event.preventDefault()
      event.stopPropagation()
      const index = Number(root.dataset.editorBlockIndex || 0)
      const field = target.closest<HTMLElement>('[data-editor-field]')?.dataset.editorField
      window.parent.postMessage({
        type: 'fabrick-editor:select',
        blockId: root.dataset.editorBlockId || undefined,
        blockIndex: index,
        fieldPath: field,
      }, window.location.origin)
      setSelected(root.dataset.editorBlockId, index)
    }

    window.addEventListener('message', onMessage)
    document.addEventListener('click', onClick, true)
    showStatus('Vista real conectada · pulsa un texto o bloque')
    window.parent.postMessage({ type: 'fabrick-editor:ready' }, window.location.origin)

    return () => {
      window.clearTimeout(reloadTimer)
      window.removeEventListener('message', onMessage)
      document.removeEventListener('click', onClick, true)
      style.remove()
      document.getElementById('fabrick-editor-status')?.remove()
      delete document.documentElement.dataset.visualEditor
    }
  }, [effectiveLayout])

  return null
}
