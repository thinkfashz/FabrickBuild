import { sanitizeCSS, sanitizePreviewHTML } from './proposals'

export type BuilderBlock = Record<string, any> & { blockType: string; id?: string }

const MAX_LAYOUT_BLOCKS = 40
const MAX_RICH_TEXT_BYTES = 120_000

function text(value: unknown, max = 12_000): string {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .slice(0, max)
}

function optionalText(value: unknown, max = 12_000): string | undefined {
  const result = text(value, max).trim()
  return result || undefined
}

function number(value: unknown, min: number, max: number, fallback: number) {
  const result = Number(value)
  if (!Number.isFinite(result)) return fallback
  return Math.min(max, Math.max(min, result))
}

function relationID(value: unknown): string | number | undefined {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return undefined
}

function relationIDs(value: unknown, max = 30) {
  return (Array.isArray(value) ? value : [])
    .map(relationID)
    .filter((id): id is string | number => id !== undefined)
    .slice(0, max)
}

function safeURL(value: unknown, fallback = '#contacto'): string {
  const url = text(value, 500).trim()
  if (!url) return fallback
  if (url.startsWith('/') || url.startsWith('#')) return url
  if (/^https:\/\//i.test(url)) return url
  return fallback
}

function safeID(value: unknown): string | undefined {
  const id = text(value, 100).replace(/[^a-zA-Z0-9_-]/g, '')
  return id || undefined
}

function stripPrototypeKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, 300).map(stripPrototypeKeys)
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? text(value, 30_000) : value
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !['__proto__', 'prototype', 'constructor'].includes(key))
      .slice(0, 300)
      .map(([key, item]) => [key, stripPrototypeKeys(item)]),
  )
}

function richText(value: unknown) {
  try {
    const serialized = JSON.stringify(value || {})
    if (Buffer.byteLength(serialized, 'utf8') > MAX_RICH_TEXT_BYTES) {
      throw new Error('El contenido enriquecido excede el tamaño permitido.')
    }
    return stripPrototypeKeys(JSON.parse(serialized))
  } catch (error) {
    if (error instanceof Error && error.message.includes('excede')) throw error
    return {
      root: {
        type: 'root',
        children: [],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    }
  }
}

function base(block: BuilderBlock) {
  return {
    ...(safeID(block.id) ? { id: safeID(block.id) } : {}),
    blockType: block.blockType,
  }
}

function sanitizeBlock(input: unknown): BuilderBlock {
  const block = (input && typeof input === 'object' ? input : {}) as BuilderBlock
  const blockType = text(block.blockType, 60)

  if (blockType === 'hero') {
    return {
      ...base({ ...block, blockType }),
      theme: ['dark', 'light', 'yellow'].includes(block.theme) ? block.theme : 'dark',
      eyebrow: optionalText(block.eyebrow, 180),
      heading: text(block.heading, 260) || 'FabrickBuild',
      highlight: optionalText(block.highlight, 260),
      description: text(block.description, 1600) || 'Construcción y soluciones integrales.',
      ...(relationID(block.media) !== undefined ? { media: relationID(block.media) } : {}),
      primaryCTA: {
        label: text(block.primaryCTA?.label, 100) || 'Solicitar cotización',
        url: safeURL(block.primaryCTA?.url),
      },
      secondaryCTA: {
        label: text(block.secondaryCTA?.label, 100) || 'Ver proyectos',
        url: safeURL(block.secondaryCTA?.url, '/proyectos'),
      },
      stats: (Array.isArray(block.stats) ? block.stats : []).slice(0, 4).map((item: any) => ({
        ...(safeID(item?.id) ? { id: safeID(item.id) } : {}),
        value: text(item?.value, 60),
        label: text(item?.label, 140),
      })),
    }
  }

  if (blockType === 'servicesGrid' || blockType === 'projectsGrid') {
    const relationName = blockType === 'servicesGrid' ? 'services' : 'projects'
    const selected = relationIDs(block[relationName], 12)
    return {
      ...base({ ...block, blockType }),
      eyebrow: optionalText(block.eyebrow, 160),
      heading: text(block.heading, 260) || (blockType === 'servicesGrid' ? 'Nuestros servicios' : 'Proyectos'),
      intro: optionalText(block.intro, 1200),
      limit: number(block.limit, 1, 12, 6),
      ...(selected.length ? { [relationName]: selected } : {}),
    }
  }

  if (blockType === 'content') {
    return {
      ...base({ ...block, blockType }),
      eyebrow: optionalText(block.eyebrow, 160),
      heading: optionalText(block.heading, 260),
      content: richText(block.content),
      ...(relationID(block.media) !== undefined ? { media: relationID(block.media) } : {}),
      mediaPosition: ['right', 'left', 'top'].includes(block.mediaPosition) ? block.mediaPosition : 'right',
    }
  }

  if (blockType === 'stats') {
    const items: Array<{
      id?: string
      value: string
      label: string
      description?: string
    }> = (Array.isArray(block.items) ? block.items : []).slice(0, 6).map((item: any) => ({
      ...(safeID(item?.id) ? { id: safeID(item.id) } : {}),
      value: text(item?.value, 60) || '01',
      label: text(item?.label, 160) || 'Indicador',
      description: optionalText(item?.description, 700),
    }))
    while (items.length < 2) {
      items.push({
        value: String(items.length + 1).padStart(2, '0'),
        label: 'Indicador',
        description: undefined,
      })
    }
    return {
      ...base({ ...block, blockType }),
      heading: optionalText(block.heading, 260),
      items,
    }
  }

  if (blockType === 'testimonials') {
    const items = relationIDs(block.items, 12)
    return {
      ...base({ ...block, blockType }),
      eyebrow: optionalText(block.eyebrow, 160),
      heading: text(block.heading, 260) || 'Lo que dicen nuestros clientes',
      ...(items.length ? { items } : {}),
    }
  }

  if (blockType === 'beforeAfter') {
    return {
      ...base({ ...block, blockType }),
      eyebrow: optionalText(block.eyebrow, 160),
      heading: text(block.heading, 260) || 'Antes y después',
      description: optionalText(block.description, 1000),
      ...(relationID(block.before) !== undefined ? { before: relationID(block.before) } : {}),
      ...(relationID(block.after) !== undefined ? { after: relationID(block.after) } : {}),
    }
  }

  if (blockType === 'cta') {
    return {
      ...base({ ...block, blockType }),
      eyebrow: optionalText(block.eyebrow, 160),
      heading: text(block.heading, 260) || 'Hablemos de tu proyecto',
      description: optionalText(block.description, 1000),
      button: {
        label: text(block.button?.label, 100) || 'Cotizar ahora',
        url: safeURL(block.button?.url),
      },
    }
  }

  if (blockType === 'contactForm') {
    const services = relationIDs(block.services, 30)
    return {
      ...base({ ...block, blockType }),
      eyebrow: optionalText(block.eyebrow, 160) || 'Cotización',
      heading: text(block.heading, 260) || 'Describe tu proyecto',
      description: optionalText(block.description, 1200),
      successMessage: optionalText(block.successMessage, 700),
      ...(services.length ? { services } : {}),
    }
  }

  if (blockType === 'reusableComponent') {
    const component = relationID(block.component)
    if (component === undefined) throw new Error('El componente reutilizable no tiene una referencia válida.')
    return {
      ...base({ ...block, blockType }),
      component,
      anchor: safeID(block.anchor),
      background: ['inherit', 'light', 'dark', 'yellow'].includes(block.background) ? block.background : 'inherit',
      spacing: ['compact', 'normal', 'large'].includes(block.spacing) ? block.spacing : 'normal',
    }
  }

  throw new Error(`El bloque ${blockType || 'desconocido'} no está registrado en FabrickBuild.`)
}

export function sanitizeBuilderLayout(value: unknown): BuilderBlock[] {
  const blocks = (Array.isArray(value) ? value : []).slice(0, MAX_LAYOUT_BLOCKS).map(sanitizeBlock)
  if (!blocks.length) throw new Error('La página debe contener al menos un bloque.')
  return blocks
}

export function sanitizePageStyles(value: unknown) {
  if (!value) return ''
  return sanitizeCSS(value)
}

export function slugifyComponentName(value: unknown) {
  const slug = text(value, 120)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
  return slug || `componente-${Date.now()}`
}

export function sanitizeComponentStyles(value: unknown, componentSlug: string) {
  const css = text(value, 80_000).trim()
  if (!css) return ''
  const requiredPrefix = `.generated-component[data-component="${componentSlug}"]`
  const forbidden = [
    /@import/i,
    /url\s*\(/i,
    /expression\s*\(/i,
    /javascript:/i,
    /behavior\s*:/i,
    /-moz-binding/i,
    /position\s*:\s*fixed/i,
    /<\/style/i,
    /<script/i,
  ]
  if (forbidden.some((pattern) => pattern.test(css))) {
    throw new Error('El CSS del componente contiene una regla no permitida.')
  }

  const selectorBlocks = css.match(/([^{}]+)\{/g) || []
  for (const selectorBlock of selectorBlocks) {
    const selector = selectorBlock.slice(0, -1).trim()
    if (selector.startsWith('@media') || selector.startsWith('@supports') || selector.startsWith('@keyframes')) continue
    if (selector === 'from' || selector === 'to' || /^\d+%$/.test(selector)) continue
    const selectors = selector.split(',').map((item) => item.trim())
    if (selectors.some((item) => !item.startsWith(requiredPrefix))) {
      throw new Error(`Todo selector del componente debe comenzar con ${requiredPrefix}.`)
    }
  }
  return css
}

export function sanitizeComponentPreview(value: unknown) {
  return sanitizePreviewHTML(value)
}
