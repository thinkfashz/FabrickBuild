import type { CollectionConfig } from 'payload'
import { authenticated } from '@/access/authenticated'
import { publishedOrAuthenticated } from '@/access/publishedOrAuthenticated'
import { pageAppearanceField } from '@/fields/appearance'
import { slugField } from '@/fields/slug'
import { seoFields } from '@/fields/seo'
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

const getServerURL = () =>
  process.env.NEXT_PUBLIC_SERVER_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

const pagePath = (data: Record<string, unknown>) => {
  const slug = typeof data.slug === 'string' ? data.slug : 'home'
  return slug === 'home' ? '/' : `/${slug}`
}

// A relative URL keeps Payload's iframe on the exact Vercel preview deployment
// currently being edited instead of accidentally pointing to production.
const getLivePreviewURL = ({ data }: { data: Record<string, unknown> }) => pagePath(data)

const getPreviewURL = (data: Record<string, unknown>) => {
  const slug = typeof data.slug === 'string' ? data.slug : 'home'
  const params = new URLSearchParams({
    collection: 'pages',
    slug,
    secret: process.env.PREVIEW_SECRET || '',
  })
  return `${getServerURL()}/preview?${params.toString()}`
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Página', plural: 'Páginas' },
  access: {
    read: publishedOrAuthenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    livePreview: { url: getLivePreviewURL },
    preview: (data) => getPreviewURL(data),
  },
  versions: {
    drafts: {
      autosave: { interval: 800 },
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
              blocks: [
                Hero,
                PortfolioShowcase,
                ServicesGrid,
                ProjectsGrid,
                Content,
                Stats,
                Testimonials,
                BeforeAfter,
                CTA,
                ContactForm,
                ReusableComponent,
              ],
            },
          ],
        },
        {
          label: 'Diseño y vista previa',
          description: 'Personaliza la página completa y usa el botón “Live Preview” de Payload para editarla en vivo.',
          fields: [
            {
              type: 'collapsible',
              label: 'Lienzo de la página',
              admin: { initCollapsed: false },
              fields: [pageAppearanceField],
            },
            {
              type: 'ui',
              name: 'pageEditingGuide',
              admin: {
                components: {
                  Field: '@/components/admin/PageEditingGuide',
                },
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
      name: 'homeTemplateVersion',
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
