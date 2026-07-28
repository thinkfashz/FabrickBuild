import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'

const deviceOptions = [
  { label: 'Web / escritorio', value: 'desktop' },
  { label: 'Móvil vertical', value: 'mobile' },
  { label: 'Responsive: web + móvil', value: 'responsive' },
]

export const Backgrounds: CollectionConfig = {
  slug: 'backgrounds',
  labels: {
    singular: 'Background multimedia',
    plural: 'Backgrounds multimedia',
  },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    group: 'Multimedia',
    useAsTitle: 'name',
    defaultColumns: ['name', 'kind', 'device', 'status', 'updatedAt'],
    description:
      'Crea fondos reutilizables para páginas, colecciones y héroes. Primero carga los archivos en Biblioteca multimedia y luego selecciónalos en grupo aquí.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Configuración',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
              label: 'Nombre del background',
            },
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              index: true,
              label: 'Identificador',
              admin: {
                description: 'Ejemplo: casa-lujo-portada. Se usa para llamarlo desde el frontend.',
              },
            },
            {
              name: 'kind',
              type: 'radio',
              required: true,
              defaultValue: 'frames',
              label: 'Tipo de background',
              options: [
                { label: 'Secuencia de frames por scroll', value: 'frames' },
                { label: 'Imagen única', value: 'image' },
                { label: 'URL externa', value: 'url' },
              ],
            },
            {
              name: 'device',
              type: 'radio',
              required: true,
              defaultValue: 'responsive',
              label: '¿Para dónde se usará?',
              options: deviceOptions,
              admin: {
                description:
                  'Elige Web, Móvil o Responsive antes de organizar los archivos. Responsive permite guardar ambas secuencias.',
              },
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
          label: 'Archivos',
          fields: [
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              label: 'Imagen principal',
              admin: {
                condition: (_, siblingData) => siblingData?.kind === 'image',
              },
            },
            {
              name: 'externalURL',
              type: 'text',
              label: 'URL del background',
              validate: (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
                if (siblingData?.kind !== 'url') return true
                if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) {
                  return 'Ingresa una URL completa que comience por http:// o https://'
                }
                return true
              },
              admin: {
                condition: (_, siblingData) => siblingData?.kind === 'url',
              },
            },
            {
              name: 'desktopFrames',
              type: 'relationship',
              relationTo: 'media',
              hasMany: true,
              label: 'Frames web / escritorio',
              filterOptions: {
                mimeType: { contains: 'image/' },
              },
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.kind === 'frames' &&
                  (siblingData?.device === 'desktop' || siblingData?.device === 'responsive'),
                description:
                  'Selecciona varias imágenes ya cargadas. Ordénalas por nombre: frame_001, frame_002, frame_003…',
              },
            },
            {
              name: 'mobileFrames',
              type: 'relationship',
              relationTo: 'media',
              hasMany: true,
              label: 'Frames móvil vertical',
              filterOptions: {
                mimeType: { contains: 'image/' },
              },
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.kind === 'frames' &&
                  (siblingData?.device === 'mobile' || siblingData?.device === 'responsive'),
                description:
                  'Selecciona la secuencia vertical. Usa nombres correlativos para mantener el orden correcto.',
              },
            },
            {
              name: 'poster',
              type: 'upload',
              relationTo: 'media',
              label: 'Portada mientras cargan los frames',
              admin: {
                condition: (_, siblingData) => siblingData?.kind === 'frames',
              },
            },
          ],
        },
        {
          label: 'Reproducción',
          fields: [
            {
              name: 'playback',
              type: 'group',
              label: 'Comportamiento de la secuencia',
              admin: {
                condition: (_, siblingData) => siblingData?.kind === 'frames',
              },
              fields: [
                {
                  name: 'trigger',
                  type: 'select',
                  defaultValue: 'scroll',
                  options: [
                    { label: 'Controlado por scroll', value: 'scroll' },
                    { label: 'Reproducción automática', value: 'autoplay' },
                    { label: 'Bucle continuo', value: 'loop' },
                  ],
                },
                {
                  name: 'duration',
                  type: 'number',
                  defaultValue: 8,
                  min: 1,
                  max: 60,
                  label: 'Duración referencial en segundos',
                },
                {
                  name: 'scrollLength',
                  type: 'number',
                  defaultValue: 500,
                  min: 100,
                  max: 1500,
                  label: 'Longitud del recorrido (% de pantalla)',
                },
                {
                  name: 'fit',
                  type: 'select',
                  defaultValue: 'cover',
                  options: [
                    { label: 'Cubrir todo el fondo', value: 'cover' },
                    { label: 'Contener imagen completa', value: 'contain' },
                  ],
                },
                {
                  name: 'overlayOpacity',
                  type: 'number',
                  defaultValue: 20,
                  min: 0,
                  max: 90,
                  label: 'Oscurecimiento del fondo (%)',
                },
              ],
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
            {
              name: 'tags',
              type: 'array',
              labels: { singular: 'Etiqueta', plural: 'Etiquetas' },
              fields: [{ name: 'value', type: 'text', required: true }],
            },
            {
              name: 'notes',
              type: 'textarea',
              label: 'Notas internas',
            },
          ],
        },
      ],
    },
  ],
}
