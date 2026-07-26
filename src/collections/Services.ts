import type { CollectionConfig } from 'payload'
import { authenticated } from '@/access/authenticated'
import { publishedOrAuthenticated } from '@/access/publishedOrAuthenticated'
import { slugField } from '@/fields/slug'
import { seoFields } from '@/fields/seo'

const getServerURL = () =>
  process.env.NEXT_PUBLIC_SERVER_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

const getLivePreviewURL = ({ data }: { data: Record<string, unknown> }) =>
  `${getServerURL()}/servicios/${typeof data.slug === 'string' ? data.slug : ''}`

const getPreviewURL = ({ data }: { data: Record<string, unknown> }) => {
  const params = new URLSearchParams({
    collection: 'services',
    slug: typeof data.slug === 'string' ? data.slug : '',
    secret: process.env.PREVIEW_SECRET || ''
  })
  return `${getServerURL()}/preview?${params.toString()}`
}

export const Services: CollectionConfig = {
  slug: 'services',
  labels: { singular: 'Servicio', plural: 'Servicios' },
  access: {
    read: publishedOrAuthenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'featured', 'priceFrom', '_status'],
    livePreview: { url: getLivePreviewURL },
    preview: getPreviewURL
  },
  versions: {
    drafts: { autosave: true, schedulePublish: true },
    maxPerDoc: 30
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField(),
    { name: 'summary', type: 'textarea', required: true },
    { name: 'description', type: 'richText' },
    { name: 'cover', type: 'upload', relationTo: 'media' },
    {
      name: 'gallery',
      type: 'array',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', type: 'text' }
      ]
    },
    {
      name: 'benefits',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'textarea' }
      ]
    },
    {
      name: 'process',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'textarea' }
      ]
    },
    { name: 'priceFrom', type: 'number', min: 0, label: 'Precio desde (CLP)' },
    { name: 'duration', type: 'text', label: 'Duración aproximada' },
    { name: 'featured', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    seoFields
  ]
}
