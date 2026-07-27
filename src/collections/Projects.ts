import type { CollectionConfig } from 'payload'
import { authenticated } from '@/access/authenticated'
import { publishedOrAuthenticated } from '@/access/publishedOrAuthenticated'
import { slugField } from '@/fields/slug'
import { seoFields } from '@/fields/seo'

const getServerURL = () =>
  process.env.NEXT_PUBLIC_SERVER_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

const getLivePreviewURL = ({ data }: { data: Record<string, unknown> }) =>
  `${getServerURL()}/proyectos/${typeof data.slug === 'string' ? data.slug : ''}`

const getPreviewURL = (data: Record<string, unknown>) => {
  const params = new URLSearchParams({
    collection: 'projects',
    slug: typeof data.slug === 'string' ? data.slug : '',
    secret: process.env.PREVIEW_SECRET || '',
  })
  return `${getServerURL()}/preview?${params.toString()}`
}

export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: { singular: 'Proyecto', plural: 'Proyectos' },
  access: {
    read: publishedOrAuthenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'projectStatus', 'featured', '_status'],
    livePreview: { url: getLivePreviewURL },
    preview: (data) => getPreviewURL(data),
  },
  versions: {
    drafts: { autosave: true, schedulePublish: true },
    maxPerDoc: 30,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField(),
    { name: 'summary', type: 'textarea', required: true },
    { name: 'content', type: 'richText' },
    { name: 'service', type: 'relationship', relationTo: 'services' },
    { name: 'cover', type: 'upload', relationTo: 'media' },
    {
      name: 'gallery',
      type: 'array',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', type: 'text' },
      ],
    },
    {
      name: 'beforeAfter',
      type: 'group',
      fields: [
        { name: 'before', type: 'upload', relationTo: 'media' },
        { name: 'after', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'details',
      type: 'group',
      fields: [
        { name: 'location', type: 'text', label: 'Ubicación' },
        { name: 'area', type: 'number', min: 0, label: 'Superficie (m²)' },
        { name: 'duration', type: 'text', label: 'Duración' },
        { name: 'completionDate', type: 'date', label: 'Fecha de entrega' },
      ],
    },
    {
      name: 'projectStatus',
      label: 'Estado de la obra',
      type: 'select',
      defaultValue: 'completed',
      options: [
        { label: 'Planificación', value: 'planning' },
        { label: 'En construcción', value: 'building' },
        { label: 'Finalizado', value: 'completed' },
      ],
    },
    { name: 'featured', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    seoFields,
  ],
}
