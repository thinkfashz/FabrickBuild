export type DesignProposal = {
  id: string
  title: string
  summary: string
  html: string
  css: string
  layout: Record<string, unknown>[]
}

const MAX_TEXT = 12_000
const dangerousCSS = [
  /@import/i,
  /url\s*\(/i,
  /expression\s*\(/i,
  /javascript:/i,
  /behavior\s*:/i,
  /-moz-binding/i,
  /position\s*:\s*fixed/i,
  /<\/style/i,
]

function text(value: unknown, max = MAX_TEXT): string {
  return String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max)
}

function safeURL(value: unknown, fallback = '#contacto'): string {
  const url = text(value, 500).trim()
  if (!url) return fallback
  if (url.startsWith('/') || url.startsWith('#')) return url
  if (/^https:\/\//i.test(url)) return url
  return fallback
}

export function sanitizeCSS(value: unknown): string {
  const css = text(value, 80_000).trim()
  if (dangerousCSS.some((pattern) => pattern.test(css))) {
    throw new Error('La propuesta contiene CSS no permitido.')
  }

  const selectorBlocks = css.match(/([^{}]+)\{/g) || []
  for (const selectorBlock of selectorBlocks) {
    const selector = selectorBlock.slice(0, -1).trim()
    if (selector.startsWith('@media') || selector.startsWith('@supports') || selector.startsWith('@keyframes')) {
      continue
    }
    if (selector === 'from' || selector === 'to' || /^\d+%$/.test(selector)) continue
    const selectors = selector.split(',').map((item) => item.trim())
    if (selectors.some((item) => !item.startsWith('.ai-page'))) {
      throw new Error('Todo selector CSS debe comenzar con .ai-page para quedar aislado.')
    }
  }
  return css
}

export function sanitizePreviewHTML(value: unknown): string {
  return text(value, 120_000)
    .replace(/<\/?(?:script|iframe|object|embed|link|meta|base|form)[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

function sanitizeBlock(block: any): Record<string, unknown> | null {
  const blockType = text(block?.blockType, 50)

  if (blockType === 'hero') {
    return {
      blockType,
      theme: ['dark', 'light', 'yellow'].includes(block.theme) ? block.theme : 'dark',
      eyebrow: text(block.eyebrow, 160),
      heading: text(block.heading, 220) || 'FabrickBuild',
      highlight: text(block.highlight, 220),
      description: text(block.description, 1200) || 'Construcción, remodelación y soluciones integrales.',
      primaryCTA: {
        label: text(block.primaryCTA?.label, 80) || 'Solicitar cotización',
        url: safeURL(block.primaryCTA?.url),
      },
      secondaryCTA: {
        label: text(block.secondaryCTA?.label, 80) || 'Ver proyectos',
        url: safeURL(block.secondaryCTA?.url, '/proyectos'),
      },
      stats: (Array.isArray(block.stats) ? block.stats : []).slice(0, 4).map((item: any) => ({
        value: text(item?.value, 40),
        label: text(item?.label, 100),
      })),
    }
  }

  if (blockType === 'stats') {
    const items = (Array.isArray(block.items) ? block.items : []).slice(0, 6).map((item: any) => ({
      value: text(item?.value, 40) || '01',
      label: text(item?.label, 120) || 'Etapa',
      description: text(item?.description, 500),
    }))
    if (items.length < 2) return null
    return { blockType, heading: text(block.heading, 220), items }
  }

  if (blockType === 'servicesGrid' || blockType === 'projectsGrid') {
    return {
      blockType,
      eyebrow: text(block.eyebrow, 120),
      heading: text(block.heading, 220) || (blockType === 'servicesGrid' ? 'Nuestros servicios' : 'Proyectos'),
      intro: text(block.intro, 800),
      limit: Math.max(1, Math.min(12, Number(block.limit || 6))),
    }
  }

  if (blockType === 'cta') {
    return {
      blockType,
      eyebrow: text(block.eyebrow, 120),
      heading: text(block.heading, 220) || 'Hablemos de tu proyecto',
      description: text(block.description, 800),
      button: {
        label: text(block.button?.label, 80) || 'Cotizar ahora',
        url: safeURL(block.button?.url),
      },
    }
  }

  if (blockType === 'contactForm') {
    return {
      blockType,
      eyebrow: text(block.eyebrow, 120) || 'Cotización',
      heading: text(block.heading, 220) || 'Describe tu proyecto',
      description: text(block.description, 800),
      successMessage: text(block.successMessage, 500),
    }
  }

  return null
}

export function sanitizeLayout(value: unknown): Record<string, unknown>[] {
  const layout = (Array.isArray(value) ? value : [])
    .slice(0, 14)
    .map(sanitizeBlock)
    .filter(Boolean) as Record<string, unknown>[]

  if (!layout.length) throw new Error('La propuesta no contiene bloques compatibles con FabrickBuild.')
  return layout
}

export function buildProposalPrompt(args: {
  request: string
  pageTitle: string
  pageSlug: string
  currentLayout: unknown
}) {
  return `Eres un director de diseño y desarrollador senior. Devuelve SOLO JSON válido, sin markdown.
Crea exactamente dos propuestas diferentes para mejorar una página de FabrickBuild.

OBJETIVO DEL USUARIO:
${text(args.request, 8_000)}

PÁGINA:
Título: ${text(args.pageTitle, 300)}
Slug: ${text(args.pageSlug, 200)}
Layout actual: ${JSON.stringify(args.currentLayout).slice(0, 40_000)}

FORMATO OBLIGATORIO:
{
  "proposals": [
    {
      "id": "a",
      "title": "...",
      "summary": "...",
      "html": "HTML visual completo para preview",
      "css": "CSS completo y aislado",
      "layout": ["bloques Payload"]
    },
    {
      "id": "b",
      "title": "...",
      "summary": "...",
      "html": "...",
      "css": "...",
      "layout": ["..."]
    }
  ]
}

REGLAS DE SEGURIDAD Y COMPATIBILIDAD:
- No uses scripts, iframes, formularios HTML, onClick ni recursos externos.
- Todo selector CSS debe comenzar con .ai-page.
- No uses @import, url(), position:fixed ni javascript:.
- El HTML se mostrará dentro de <main class="ai-page">.
- El layout solo puede usar estos blockType: hero, stats, servicesGrid, projectsGrid, cta, contactForm.
- hero: theme dark|light|yellow, eyebrow, heading, highlight, description, primaryCTA {label,url}, secondaryCTA {label,url}, stats [{value,label}].
- stats: heading, items de 2 a 6 con {value,label,description}.
- servicesGrid/projectsGrid: eyebrow, heading, intro, limit de 1 a 12.
- cta: eyebrow, heading, description, button {label,url}.
- contactForm: eyebrow, heading, description, successMessage.
- No inventes IDs de servicios, proyectos o imágenes.
- Las dos opciones deben ser claramente diferentes y totalmente responsivas.`
}

function extractJSON(raw: string): string {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('La IA no devolvió JSON válido.')
  return trimmed.slice(start, end + 1)
}

export function parseProposalResponse(raw: string): DesignProposal[] {
  const parsed = JSON.parse(extractJSON(raw)) as { proposals?: unknown[] }
  const proposals = (Array.isArray(parsed.proposals) ? parsed.proposals : []).slice(0, 2).map((item: any, index) => ({
    id: text(item?.id, 40) || (index === 0 ? 'a' : 'b'),
    title: text(item?.title, 200) || `Propuesta ${index + 1}`,
    summary: text(item?.summary, 1000),
    html: sanitizePreviewHTML(item?.html),
    css: sanitizeCSS(item?.css),
    layout: sanitizeLayout(item?.layout),
  }))

  if (proposals.length !== 2) throw new Error('La IA debe devolver exactamente dos propuestas.')
  return proposals
}
