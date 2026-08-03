import { defaultAppearance, type AppearanceValue } from '@/fields/appearance'

export type EditorBlock = Record<string, any> & {
  id?: string
  blockName?: string
  blockType: string
  appearance?: AppearanceValue
}

export type EditorPage = {
  title: string
  slug: string
  layout: EditorBlock[]
  pageAppearance: AppearanceValue
}

export type EditorFieldDefinition = {
  label: string
  path: string
  kind?: 'text' | 'textarea' | 'number' | 'richText' | 'url'
  placeholder?: string
}

const uid = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export function cloneEditorValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function plainToRichText(value: string) {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)

  return {
    root: {
      type: 'root',
      children: paragraphs.map((paragraph) => ({
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: paragraph,
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            version: 1,
          },
        ],
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

export function richTextToPlain(value: unknown): string {
  const parts: string[] = []
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    if (typeof record.text === 'string') parts.push(record.text)
    if (Array.isArray(record.children)) {
      const children = record.children
      children.forEach((child, index) => {
        walk(child)
        const childRecord = child && typeof child === 'object' ? child as Record<string, unknown> : null
        if (index < children.length - 1 && childRecord?.type === 'paragraph') parts.push('\n\n')
      })
    }
    if (record.root) walk(record.root)
  }
  walk(value)
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim()
}

export const editorBlockLabels: Record<string, string> = {
  portfolioShowcase: 'Portfolio cinematográfico',
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

export const editorTextFields: Record<string, EditorFieldDefinition[]> = {
  portfolioShowcase: [
    { path: 'eyebrow', label: 'Texto superior' },
    { path: 'heading', label: 'Título principal' },
    { path: 'highlight', label: 'Texto destacado' },
    { path: 'description', label: 'Descripción', kind: 'textarea' },
    { path: 'primaryCTA.label', label: 'Botón principal' },
    { path: 'primaryCTA.url', label: 'Enlace principal', kind: 'url' },
    { path: 'secondaryCTA.label', label: 'Botón secundario' },
    { path: 'secondaryCTA.url', label: 'Enlace secundario', kind: 'url' },
  ],
  hero: [
    { path: 'eyebrow', label: 'Texto superior' },
    { path: 'heading', label: 'Título principal' },
    { path: 'highlight', label: 'Texto destacado' },
    { path: 'description', label: 'Descripción', kind: 'textarea' },
    { path: 'primaryCTA.label', label: 'Botón principal' },
    { path: 'primaryCTA.url', label: 'Enlace principal', kind: 'url' },
    { path: 'secondaryCTA.label', label: 'Botón secundario' },
    { path: 'secondaryCTA.url', label: 'Enlace secundario', kind: 'url' },
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
    { path: 'content', label: 'Contenido', kind: 'richText' },
  ],
  stats: [{ path: 'heading', label: 'Título' }],
  testimonials: [
    { path: 'eyebrow', label: 'Texto superior' },
    { path: 'heading', label: 'Título' },
  ],
  beforeAfter: [
    { path: 'eyebrow', label: 'Texto superior' },
    { path: 'heading', label: 'Título' },
    { path: 'description', label: 'Descripción', kind: 'textarea' },
  ],
  cta: [
    { path: 'eyebrow', label: 'Texto superior' },
    { path: 'heading', label: 'Título' },
    { path: 'description', label: 'Descripción', kind: 'textarea' },
    { path: 'button.label', label: 'Texto del botón' },
    { path: 'button.url', label: 'Enlace del botón', kind: 'url' },
  ],
  contactForm: [
    { path: 'eyebrow', label: 'Texto superior' },
    { path: 'heading', label: 'Título' },
    { path: 'description', label: 'Descripción', kind: 'textarea' },
    { path: 'successMessage', label: 'Mensaje de éxito', kind: 'textarea' },
  ],
  reusableComponent: [
    { path: 'anchor', label: 'Ancla' },
  ],
}

export function getAtPath(object: Record<string, any>, path: string): unknown {
  return path.split('.').reduce((current: any, key) => current?.[key], object)
}

export function setAtPath(object: Record<string, any>, path: string, value: unknown) {
  const keys = path.split('.')
  let current = object
  keys.slice(0, -1).forEach((key) => {
    if (!current[key] || typeof current[key] !== 'object') current[key] = {}
    current = current[key]
  })
  current[keys[keys.length - 1]] = value
}

export function createEditorBlock(blockType: string): EditorBlock {
  const appearance = cloneEditorValue(defaultAppearance)
  switch (blockType) {
    case 'portfolioShowcase':
      return {
        id: uid(),
        blockType,
        appearance,
        eyebrow: 'ESTUDIO DIGITAL INDEPENDIENTE',
        heading: 'Diseñamos experiencias que se sienten vivas.',
        highlight: 'Diseño · código · movimiento',
        description: 'Estrategia, identidad y producto digital para marcas que buscan una presencia imposible de ignorar.',
        primaryCTA: { label: 'Ver proyectos', url: '#proyectos' },
        secondaryCTA: { label: 'Hablemos', url: '#contacto' },
        techStack: [{ label: 'Next.js' }, { label: 'Payload CMS' }, { label: 'GSAP' }],
        projects: [
          {
            title: 'Marca en movimiento',
            type: 'Ecommerce / estrategia',
            description: 'Una identidad fluida convertida en una experiencia de compra con carácter.',
            imageURL: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1400&q=85',
            url: '#contacto',
          },
        ],
      }
    case 'hero':
      return {
        id: uid(),
        blockType,
        appearance,
        theme: 'dark',
        eyebrow: 'Construcción inteligente en Chile',
        heading: 'Construimos casas.',
        highlight: 'Dios construye hogares.',
        description: 'Planificamos, construimos y remodelamos con información clara, seguimiento real y terminaciones responsables.',
        backgroundSource: 'url',
        backgroundURL: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1800&q=85',
        primaryCTA: { label: 'Solicitar cotización', url: '#contacto' },
        secondaryCTA: { label: 'Ver proyectos', url: '/proyectos' },
        stats: [
          { value: '8+', label: 'años de experiencia' },
          { value: '360°', label: 'servicio integral' },
        ],
      }
    case 'servicesGrid':
      return {
        id: uid(),
        blockType,
        appearance,
        eyebrow: 'Servicios',
        heading: 'Una solución para cada etapa.',
        intro: 'Desde una reparación puntual hasta un proyecto completo.',
        limit: 6,
      }
    case 'projectsGrid':
      return {
        id: uid(),
        blockType,
        appearance: { ...appearance, surfaceMode: 'solid', surfaceColor: '#111111', headingColor: '#ffffff', bodyColor: '#d6d4ce' },
        eyebrow: 'Proyectos',
        heading: 'Obras que hablan por nosotros.',
        intro: 'Una selección de proyectos recientes.',
        limit: 4,
      }
    case 'content':
      return {
        id: uid(),
        blockType,
        appearance,
        eyebrow: 'Información',
        heading: 'Una sección de contenido',
        content: plainToRichText('Escribe aquí el contenido de esta sección.'),
        mediaPosition: 'right',
      }
    case 'stats':
      return {
        id: uid(),
        blockType,
        appearance,
        heading: 'Resultados medibles',
        items: [
          { value: '01', label: 'Diagnóstico', description: 'Definimos el alcance real.' },
          { value: '02', label: 'Ejecución', description: 'Construimos con seguimiento.' },
        ],
      }
    case 'testimonials':
      return {
        id: uid(),
        blockType,
        appearance,
        eyebrow: 'Testimonios',
        heading: 'Confianza construida en cada proyecto.',
      }
    case 'beforeAfter':
      return {
        id: uid(),
        blockType,
        appearance,
        eyebrow: 'Transformación',
        heading: 'Antes y después',
        description: 'Compara el punto de partida con el resultado final.',
      }
    case 'cta':
      return {
        id: uid(),
        blockType,
        appearance,
        eyebrow: 'Siguiente paso',
        heading: 'Hablemos de tu proyecto.',
        description: 'Recibe una evaluación inicial y un plan de trabajo claro.',
        button: { label: 'Cotizar ahora', url: '#contacto' },
      }
    case 'contactForm':
      return {
        id: uid(),
        blockType,
        appearance,
        eyebrow: 'Cotización',
        heading: 'Describe tu proyecto.',
        description: 'Completa los datos principales para revisar el alcance.',
        successMessage: 'Solicitud recibida correctamente.',
      }
    default:
      return {
        id: uid(),
        blockType: 'content',
        appearance,
        heading: 'Nuevo bloque',
        content: plainToRichText('Contenido'),
      }
  }
}

export const fallbackEditorPage: EditorPage = {
  title: 'Inicio',
  slug: 'home',
  pageAppearance: cloneEditorValue(defaultAppearance),
  layout: ['hero', 'servicesGrid', 'content', 'stats', 'cta', 'contactForm'].map((blockType, index) => ({
    ...createEditorBlock(blockType),
    id: `fallback-${index}-${blockType}`,
  })),
}

export function normalizeEditorPage(value: Partial<EditorPage> | null | undefined): EditorPage {
  const page = value || {}
  let layout: EditorBlock[]

  if (Array.isArray(page.layout) && page.layout.length) {
    let changed = false
    const normalized = page.layout.map((block, index) => {
      if (block.id && block.appearance && typeof block.appearance === 'object') return block
      changed = true
      return {
        ...block,
        id: block.id || `block-${index}-${block.blockType || 'content'}`,
        appearance: block.appearance && typeof block.appearance === 'object'
          ? block.appearance
          : cloneEditorValue(defaultAppearance),
      }
    })
    layout = changed ? normalized : page.layout
  } else {
    layout = cloneEditorValue(fallbackEditorPage.layout)
  }

  return {
    title: typeof page.title === 'string' && page.title.trim() ? page.title : 'Página sin título',
    slug: typeof page.slug === 'string' && page.slug.trim() ? page.slug : 'home',
    layout,
    pageAppearance: page.pageAppearance && typeof page.pageAppearance === 'object'
      ? page.pageAppearance
      : cloneEditorValue(defaultAppearance),
  }
}

export function blockStorageKey(slug?: string) {
  return `fabrick:global-visual-editor:${slug || 'home'}`
}
