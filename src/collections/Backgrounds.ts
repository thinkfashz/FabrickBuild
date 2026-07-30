import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook, CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'

type MediaLike = {
  id: string | number
  filename?: string | null
  frameOrder?: number | null
}

const idOf = (value: unknown): string | number | null => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' || typeof id === 'number' ? id : null
  }
  return null
}

const slugify = (value: unknown): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)

const createUniqueSlug: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data

  const base = slugify(data.slug || data.name) || `background-${Date.now()}`
  let candidate = base
  let suffix = 2
  const currentID = originalDoc?.id

  while (suffix < 1000) {
    const existing = await req.payload.find({
      collection: 'backgrounds',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: candidate } },
    })

    const match = existing.docs?.[0]
    if (!match || String(match.id) === String(currentID || '')) break
    candidate = `${base}-${suffix}`
    suffix += 1
  }

  return { ...data, slug: candidate }
}

const numberFromFilename = (filename?: string | null): number => {
  const matches = filename?.match(/\d+/g)
  const value = matches?.length ? Number(matches[matches.length - 1]) : Number.MAX_SAFE_INTEGER
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER
}

async function sortMediaIds(values: unknown, req: any): Promise<(string | number)[]> {
  const ids = Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map(idOf)
        .filter((id): id is string | number => id !== null)
        .map(String),
    ),
  )
  if (ids.length < 2) return ids

  const result = await req.payload.find({
    collection: 'media',
    depth: 0,
    limit: Math.min(ids.length, 500),
    overrideAccess: true,
    where: { id: { in: ids } },
  })

  return ((result.docs || []) as MediaLike[])
    .sort((a, b) => {
      const explicitA = typeof a.frameOrder === 'number' ? a.frameOrder : Number.MAX_SAFE_INTEGER
      const explicitB = typeof b.frameOrder === 'number' ? b.frameOrder : Number.MAX_SAFE_INTEGER
      if (explicitA !== explicitB) return explicitA - explicitB
      const fileA = numberFromFilename(a.filename)
      const fileB = numberFromFilename(b.filename)
      if (fileA !== fileB) return fileA - fileB
      return String(a.filename || '').localeCompare(String(b.filename || ''), 'es', { numeric: true, sensitivity: 'base' })
    })
    .map((doc) => doc.id)
}

const orderFrames: CollectionBeforeChangeHook = async ({ data, req }) => {
  if (!data || data.kind !== 'frames') return data
  const desktopFrames = await sortMediaIds(data.desktopFrames, req)
  const mobileFrames = await sortMediaIds(data.mobileFrames, req)
  return {
    ...data,
    desktopFrames,
    mobileFrames,
    frameCountDesktop: desktopFrames.length,
    frameCountMobile: mobileFrames.length,
    orderedAt: new Date().toISOString(),
  }
}

const imageFilter = { mimeType: { contains: 'image/' } }

export const Backgrounds: CollectionConfig = {
  slug: 'backgrounds',
  labels: { singular: 'Background multimedia', plural: 'Backgrounds multimedia' },
  access: { read: () => true, create: authenticated, update: authenticated, delete: authenticated },
  hooks: { beforeValidate: [createUniqueSlug], beforeChange: [orderFrames] },
  admin: {
    group: 'Multimedia',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'kind', 'device', 'status', 'frameCountDesktop', 'frameCountMobile'],
    description: 'Sube una carpeta completa, varias imágenes o reutiliza archivos. El slug y el orden se generan automáticamente.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Configuración',
          fields: [
            { name: 'name', type: 'text', required: true, label: 'Nombre del background' },
            {
              name: 'slug', type: 'text', unique: true, index: true, label: 'Identificador automático',
              admin: { readOnly: true, description: 'Se genera desde el nombre y añade un número cuando ya existe.' },
            },
            {
              name: 'kind', type: 'radio', required: true, defaultValue: 'frames', label: 'Tipo de background',
              options: [
                { label: 'Secuencia cinematográfica de frames', value: 'frames' },
                { label: 'Imagen única', value: 'image' },
                { label: 'URL externa', value: 'url' },
              ],
            },
            {
              name: 'device', type: 'radio', required: true, defaultValue: 'responsive', label: 'Destino',
              options: [
                { label: 'Web / escritorio', value: 'desktop' },
                { label: 'Móvil vertical', value: 'mobile' },
                { label: 'Responsive: web + móvil', value: 'responsive' },
              ],
            },
            {
              name: 'status', type: 'select', required: true, defaultValue: 'draft',
              options: [
                { label: 'Borrador', value: 'draft' }, { label: 'Procesando', value: 'processing' },
                { label: 'Listo para usar', value: 'ready' }, { label: 'Archivado', value: 'archived' },
              ],
            },
          ],
        },
        {
          label: 'Frames',
          fields: [
            {
              name: 'frameUploader', type: 'ui',
              admin: { condition: (_, siblingData) => siblingData?.kind === 'frames', components: { Field: '@/components/admin/FrameFolderUploader' } },
            },
            {
              name: 'desktopFrames', type: 'relationship', relationTo: 'media', hasMany: true,
              label: 'Frames web / escritorio', filterOptions: imageFilter,
              admin: {
                condition: (_, siblingData) => siblingData?.kind === 'frames' && ['desktop', 'responsive'].includes(siblingData?.device),
                description: 'La secuencia usa los primeros 60 frames ordenados. Puedes subir una carpeta o seleccionar imágenes; se ordenan automáticamente al guardar.',
              },
            },
            {
              name: 'mobileFrames', type: 'relationship', relationTo: 'media', hasMany: true,
              label: 'Frames móvil vertical', filterOptions: imageFilter,
              admin: {
                condition: (_, siblingData) => siblingData?.kind === 'frames' && ['mobile', 'responsive'].includes(siblingData?.device),
                description: 'La secuencia móvil usa los primeros 60 frames ordenados de forma independiente.',
              },
            },
            { name: 'poster', type: 'upload', relationTo: 'media', label: 'Portada mientras cargan los frames', admin: { condition: (_, siblingData) => siblingData?.kind === 'frames' } },
            { name: 'frameCountDesktop', type: 'number', admin: { readOnly: true, position: 'sidebar' } },
            { name: 'frameCountMobile', type: 'number', admin: { readOnly: true, position: 'sidebar' } },
            { name: 'orderedAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
          ],
        },
        {
          label: 'Animación cinematográfica',
          fields: [
            {
              name: 'backgroundPreview', type: 'ui',
              admin: { components: { Field: '@/components/admin/BackgroundPreviewPanel' } },
            },
            {
              name: 'engine', type: 'select', defaultValue: 'gsap-three', required: true,
              options: [
                { label: 'GSAP ScrollTrigger + Three.js', value: 'gsap-three' },
                { label: 'GSAP ScrollTrigger + Canvas 2D', value: 'gsap-canvas' },
                { label: 'Canvas ligero', value: 'canvas' },
              ],
            },
            {
              name: 'playback', type: 'group', label: 'Comportamiento', admin: { condition: (_, siblingData) => siblingData?.kind === 'frames' },
              fields: [
                { name: 'trigger', type: 'select', defaultValue: 'scroll', options: [{ label: 'ScrollTrigger cinematográfico', value: 'scroll' }, { label: 'Automático', value: 'autoplay' }, { label: 'Bucle', value: 'loop' }] },
                { name: 'scrub', type: 'number', defaultValue: 0.35, min: 0, max: 3 },
                { name: 'pin', type: 'checkbox', defaultValue: true },
                { name: 'snap', type: 'checkbox', defaultValue: false },
                { name: 'scrollLength', type: 'number', defaultValue: 500, min: 100, max: 1500 },
                { name: 'parallax', type: 'number', defaultValue: 12, min: 0, max: 100 },
                { name: 'fit', type: 'select', defaultValue: 'cover', options: [{ label: 'Cubrir', value: 'cover' }, { label: 'Contener', value: 'contain' }] },
                { name: 'overlayOpacity', type: 'number', defaultValue: 20, min: 0, max: 90 },
              ],
            },
          ],
        },
        {
          label: 'Imagen o URL',
          fields: [
            { name: 'image', type: 'upload', relationTo: 'media', label: 'Imagen principal', admin: { condition: (_, siblingData) => siblingData?.kind === 'image' } },
            {
              name: 'externalURL', type: 'text', label: 'URL del background',
              validate: (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
                if (siblingData?.kind !== 'url') return true
                return typeof value === 'string' && /^https?:\/\//i.test(value) ? true : 'Ingresa una URL http:// o https:// válida.'
              },
              admin: { condition: (_, siblingData) => siblingData?.kind === 'url' },
            },
          ],
        },
        {
          label: 'Organización',
          fields: [
            {
              name: 'category', type: 'select', defaultValue: 'hero',
              options: [
                { label: 'Hero / portada', value: 'hero' }, { label: 'Página', value: 'page' },
                { label: 'Colección', value: 'collection' }, { label: 'Servicio', value: 'service' },
                { label: 'Proyecto', value: 'project' }, { label: 'Campaña', value: 'campaign' },
              ],
            },
            { name: 'tags', type: 'array', fields: [{ name: 'value', type: 'text', required: true }] },
            { name: 'notes', type: 'textarea', label: 'Notas internas' },
          ],
        },
      ],
    },
  ],
}
