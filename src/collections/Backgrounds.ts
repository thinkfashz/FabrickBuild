import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

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

      return String(a.filename || '').localeCompare(String(b.filename || ''), 'es', {
        numeric: true,
        sensitivity: 'base',
      })
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
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: { beforeChange: [orderFrames] },
  admin: {
    group: 'Multimedia',
    useAsTitle: 'name',
    defaultColumns: ['name', 'kind', 'device', 'status', 'frameCountDesktop', 'frameCountMobile'],
    description:
      'Sube una carpeta completa, varias imágenes o reutiliza archivos de la biblioteca. El orden final se automatiza al guardar.',
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
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              index: true,
              label: 'Identificador',
              admin: { description: 'Ejemplo: casa-lujo-portada.' },
            },
            {
              name: 'kind',
              type: 'radio',
              required: true,
              defaultValue: 'frames',
              label: 'Tipo de background',
              options: [
                { label: 'Secuencia cinematográfica de frames', value: 'frames' },
                { label: 'Imagen única', value: 'image' },
                { label: 'URL externa', value: 'url' },
              ],
            },
            {
              name: 'device',
              type: 'radio',
              required: true,
              defaultValue: 'responsive',
              label: 'Destino',
              options: [
                { label: 'Web / escritorio', value: 'desktop' },
                { label: 'Móvil vertical', value: 'mobile' },
                { label: 'Responsive: web + móvil', value: 'responsive' },
              ],
            },
            {
              name: 'status',
              type: 'select',
              required: true,
              defaultValue: 'draft',
              options: [
                { label: 'Borrador', value: 'draft' },
                { label: 'Procesando', value: 'processing' },
                { label: 'Listo para usar', value: 'ready' },
                { label: 'Archivado', value: 'archived' },
              ],
            },
          ],
        },
        {
          label: 'Frames',
          fields: [
            {
              name: 'frameUploader',
              type: 'ui',
              admin: {
                condition: (_, siblingData) => siblingData?.kind === 'frames',
                components: { Field: '@/components/admin/FrameFolderUploader' },
              },
            },
            {
              name: 'desktopFrames',
              type: 'relationship',
              relationTo: 'media',
              hasMany: true,
              label: 'Frames web / escritorio',
              filterOptions: imageFilter,
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.kind === 'frames' &&
                  (siblingData?.device === 'desktop' || siblingData?.device === 'responsive'),
                description: 'También puedes seleccionar imágenes existentes. El orden se corrige al guardar.',
              },
            },
            {
              name: 'mobileFrames',
              type: 'relationship',
              relationTo: 'media',
              hasMany: true,
              label: 'Frames móvil vertical',
              filterOptions: imageFilter,
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.kind === 'frames' &&
                  (siblingData?.device === 'mobile' || siblingData?.device === 'responsive'),
                description: 'La secuencia móvil se ordena independientemente de la versión web.',
              },
            },
            {
              name: 'poster',
              type: 'upload',
              relationTo: 'media',
              label: 'Portada mientras cargan los frames',
              admin: { condition: (_, siblingData) => siblingData?.kind === 'frames' },
            },
            { name: 'frameCountDesktop', type: 'number', admin: { readOnly: true, position: 'sidebar' } },
            { name: 'frameCountMobile', type: 'number', admin: { readOnly: true, position: 'sidebar' } },
            { name: 'orderedAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
          ],
        },
        {
          label: 'Animación cinematográfica',
          fields: [
            {
              name: 'engine',
              type: 'select',
              defaultValue: 'gsap-three',
              required: true,
              options: [
                { label: 'GSAP ScrollTrigger + Three.js', value: 'gsap-three' },
                { label: 'GSAP ScrollTrigger + Canvas 2D', value: 'gsap-canvas' },
                { label: 'Canvas ligero', value: 'canvas' },
              ],
              admin: { description: 'GSAP + Three.js se mantiene como motor cinematográfico principal.' },
            },
            {
              name: 'playback',
              type: 'group',
              label: 'Comportamiento de la secuencia',
              admin: { condition: (_, siblingData) => siblingData?.kind === 'frames' },
              fields: [
                {
                  name: 'trigger',
                  type: 'select',
                  defaultValue: 'scroll',
                  options: [
                    { label: 'ScrollTrigger cinematográfico', value: 'scroll' },
                    { label: 'Reproducción automática', value: 'autoplay' },
                    { label: 'Bucle continuo', value: 'loop' },
                  ],
                },
                { name: 'scrub', type: 'number', defaultValue: 0.35, min: 0, max: 3, label: 'Suavidad del scrub' },
                { name: 'pin', type: 'checkbox', defaultValue: true, label: 'Fijar escena durante el recorrido' },
                { name: 'snap', type: 'checkbox', defaultValue: false, label: 'Ajustar al frame más cercano' },
                { name: 'scrollLength', type: 'number', defaultValue: 500, min: 100, max: 1500, label: 'Longitud del recorrido (% pantalla)' },
                { name: 'parallax', type: 'number', defaultValue: 12, min: 0, max: 100, label: 'Profundidad / parallax Three.js' },
                {
                  name: 'fit',
                  type: 'select',
                  defaultValue: 'cover',
                  options: [
                    { label: 'Cubrir todo el fondo', value: 'cover' },
                    { label: 'Contener imagen completa', value: 'contain' },
                  ],
                },
                { name: 'overlayOpacity', type: 'number', defaultValue: 20, min: 0, max: 90, label: 'Oscurecimiento (%)' },
              ],
            },
          ],
        },
        {
          label: 'Imagen o URL',
          fields: [
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              label: 'Imagen principal',
              admin: { condition: (_, siblingData) => siblingData?.kind === 'image' },
            },
            {
              name: 'externalURL',
              type: 'text',
              label: 'URL del background',
              validate: (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
                if (siblingData?.kind !== 'url') return true
                if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return 'Ingresa una URL http:// o https:// válida.'
                return true
              },
              admin: { condition: (_, siblingData) => siblingData?.kind === 'url' },
            },
          ],
        },
        {
          label: 'Organización',
          fields: [
            {
              name: 'category',
              type: 'select',
              defaultValue: 'hero',
              options: [
                { label: 'Hero / portada', value: 'hero' },
                { label: 'Página', value: 'page' },
                { label: 'Colección', value: 'collection' },
                { label: 'Servicio', value: 'service' },
                { label: 'Proyecto', value: 'project' },
                { label: 'Campaña', value: 'campaign' },
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
