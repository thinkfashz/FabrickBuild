import type { CollectionConfig } from 'payload'
import { authenticated } from '@/access/authenticated'
import { publishedOrAuthenticated } from '@/access/publishedOrAuthenticated'
import { slugField } from '@/fields/slug'
import { seoFields } from '@/fields/seo'
import { appearanceField, withAppearance } from '@/fields/appearance'
import { normalizeLegacyBlockIDs } from '@/hooks/normalizeBlockIDs'
import { revalidatePage, revalidatePageDelete } from '@/hooks/revalidateContent'
import {
  BeforeAfter,
  ContactForm,
  Content,
  CTA,
  Hero,
  PortfolioShowcase,
  ProjectsGrid,
  ReusableComponent,
  ServicesGrid,
  Stats,
  Testimonials,
} from '@/blocks'

const pagePath = (data: Record<string, unknown>) => {
  const slug = typeof data.slug === 'string' ? data.slug : 'home'
  return slug === 'home' ? '/' : `/${slug}`
}

const getLivePreviewURL = ({ data }: { data: Record<string, unknown> }) => pagePath(data)

const getPreviewURL = (data: Record<string, unknown>) => {
  const slug = typeof data.slug === 'string' ? data.slug : 'home'
  const params = new URLSearchParams({
    secret: process.env.PREVIEW_SECRET || '',
  })
  return `/preview-page/${encodeURIComponent(slug)}?${params.toString()}`
}

const pageBlocks = [
  PortfolioShowcase,
  Hero,
  ServicesGrid,
  ProjectsGrid,
  Content,
  Stats,
  Testimonials,
  BeforeAfter,
  CTA,
  ContactForm,
  ReusableComponent,
].map(withAppearance)

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Página', plural: 'Páginas' },
  access: {
    read: publishedOrAuthenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: {
    beforeValidate: [normalizeLegacyBlockIDs],
    afterChange: [revalidatePage],
    afterDelete: [revalidatePageDelete],
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    livePreview: { url: getLivePreviewURL },
    preview: (data) => getPreviewURL(data),
    components: {
      beforeListTable: ['@/components/admin/PagesOverview'],
    },
    description:
      'Editor oficial de páginas. Usa las miniaturas reales de la colección o abre Live Preview para comprobar móvil, tablet y escritorio antes de publicar.',
  },
  versions: {
    drafts: {
      autosave: { interval: 1600 },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Contenido',
          fields: [
            { name: 'title', type: 'text', required: true },
            {
              name: 'layout',
              type: 'blocks',
              required: true,
              blocks: pageBlocks,
              admin: {
                initCollapsed: true,
                description:
                  'Portfolio cinematográfico es el preset de fábrica. Cada bloque conserva su propio panel de apariencia y responsive.',
              },
            },
          ],
        },
        {
          label: 'Diseño de página',
          fields: [
            appearanceField('pageAppearance', 'Apariencia general de la página'),
            {
              name: 'pageBackgroundQuickUpload',
              type: 'ui',
              admin: {
                components: { Field: '@/components/admin/PageBackgroundQuickUpload' },
              },
            },
            {
              name: 'backgroundExperiences',
              type: 'array',
              label: 'Fondos animados y videos publicados en esta página',
              minRows: 0,
              maxRows: 4,
              admin: {
                initCollapsed: true,
                description: 'Añade entre 1 y 4 fondos. Cada experiencia puede usar scroll vertical u horizontal y reproducirse normal o invertida.',
              },
              fields: [
                { name: 'label', type: 'text', label: 'Nombre interno', required: true },
                {
                  name: 'background',
                  type: 'relationship',
                  relationTo: 'backgrounds',
                  required: true,
                  filterOptions: { status: { equals: 'ready' } },
                  label: 'Background o video publicado',
                },
                { name: 'enabled', type: 'checkbox', defaultValue: true, label: 'Mostrar en la página' },
                {
                  name: 'scrollAxis',
                  type: 'radio',
                  defaultValue: 'vertical',
                  required: true,
                  label: 'Dirección del scroll',
                  options: [
                    { label: 'Vertical: arriba y abajo', value: 'vertical' },
                    { label: 'Horizontal: izquierda y derecha', value: 'horizontal' },
                  ],
                },
                {
                  name: 'playbackDirection',
                  type: 'radio',
                  defaultValue: 'forward',
                  required: true,
                  label: 'Dirección de reproducción',
                  options: [
                    { label: 'Normal: primer frame al último', value: 'forward' },
                    { label: 'Invertida: último frame al primero', value: 'reverse' },
                  ],
                },
                {
                  name: 'viewportLength',
                  type: 'number',
                  defaultValue: 3,
                  min: 1,
                  max: 8,
                  required: true,
                  label: 'Duración del recorrido en pantallas',
                  admin: { description: '1 es corto; 3 es cinematográfico; 6–8 es un recorrido largo.' },
                },
              ],
            },
            {
              name: 'backgroundSource',
              type: 'radio',
              defaultValue: 'color',
              label: 'Fondo general',
              options: [
                { label: 'Color o transparencia', value: 'color' },
                { label: 'Subir imagen', value: 'upload' },
                { label: 'Subir video', value: 'video' },
                { label: 'Pegar URL', value: 'url' },
                { label: 'Usar background organizado', value: 'saved' },
              ],
            },
            {
              name: 'backgroundMedia',
              type: 'upload',
              relationTo: 'media',
              label: 'Imagen de fondo',
              admin: {
                condition: (_, siblingData) => siblingData?.backgroundSource === 'upload',
                description: 'Sube o selecciona la imagen aquí, sin salir del editor de páginas.',
              },
            },
            {
              name: 'mobileBackgroundMedia',
              type: 'upload',
              relationTo: 'media',
              label: 'Imagen alternativa para móvil',
              admin: {
                condition: (_, siblingData) => siblingData?.backgroundSource === 'upload',
                description: 'Opcional. Usa una composición vertical y más liviana para teléfonos.',
              },
            },
            {
              name: 'backgroundVideo',
              type: 'upload',
              relationTo: 'media',
              label: 'Video de fondo',
              filterOptions: { mimeType: { contains: 'video/' } },
              admin: {
                condition: (_, siblingData) => siblingData?.backgroundSource === 'video',
                description: 'El video se procesa con la lógica de Multimedia para generar la cantidad de frames elegida.',
              },
            },
            {
              name: 'backgroundURL',
              type: 'text',
              label: 'URL de imagen o video',
              admin: { condition: (_, siblingData) => siblingData?.backgroundSource === 'url' },
              validate: (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
                if (siblingData?.backgroundSource !== 'url') return true
                return typeof value === 'string' && /^(https?:\/\/|\/)/i.test(value)
                  ? true
                  : 'Ingresa una URL http://, https:// o una ruta que comience con /.'
              },
            },
            {
              name: 'savedBackground',
              type: 'relationship',
              relationTo: 'backgrounds',
              label: 'Background multimedia',
              filterOptions: { status: { equals: 'ready' } },
              admin: {
                condition: (_, siblingData) => siblingData?.backgroundSource === 'saved',
                description: 'Selecciona la secuencia generada desde un video. Se reproducen todos sus frames, sin máximo fijo.',
              },
            },
          ],
        },
        {
          label: 'SEO',
          fields: [seoFields],
        },
      ],
    },
    slugField(),
    {
      name: 'aiStyle',
      type: 'textarea',
      admin: {
        hidden: true,
        description: 'CSS aislado generado y validado por FabrickBuild AI Studio.',
      },
    },
    {
      name: 'aiDesignVersion',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData?._status === 'published' && !value) return new Date()
            return value
          },
        ],
      },
    },
  ],
}
