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
  ProjectsGrid,
  ReusableComponent,
  ServicesGrid,
  Stats,
  Testimonials,
} from '@/blocks'

const getServerURL = () =>
  process.env.NEXT_PUBLIC_SERVER_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

const pagePath = (data: Record<string, unknown>) => {
  const slug = typeof data.slug === 'string' ? data.slug : 'home'
  return slug === 'home' ? '/' : `/${slug}`
}

const getLivePreviewURL = ({ data }: { data: Record<string, unknown> }) =>
  `${getServerURL()}${pagePath(data)}`

const getPreviewURL = (data: Record<string, unknown>) => {
  const slug = typeof data.slug === 'string' ? data.slug : 'home'
  const params = new URLSearchParams({
    collection: 'pages',
    slug,
    secret: process.env.PREVIEW_SECRET || '',
  })
  return `${getServerURL()}/preview?${params.toString()}`
}

const pageBlocks = [
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
    description:
      'Edita contenido, colores, fondos, imágenes, responsive y animaciones desde el mismo documento. Usa la vista previa Móvil antes de publicar.',
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
                  'Cada bloque incluye su propio panel Apariencia y responsive. Evita repetir títulos o imágenes con el mismo objetivo comercial.',
              },
            },
          ],
        },
        {
          label: 'Diseño de página',
          fields: [
            appearanceField('pageAppearance', 'Apariencia general de la página'),
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
                description: 'Usa video MP4 o WebM corto, sin audio y con poster de respaldo.',
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
                description: 'Selecciona una secuencia, imagen o URL preparada en Multimedia.',
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
