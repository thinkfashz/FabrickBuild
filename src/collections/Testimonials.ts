import type { CollectionConfig } from 'payload'
import { authenticated } from '@/access/authenticated'
import { publishedOrAuthenticated } from '@/access/publishedOrAuthenticated'

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  labels: { singular: 'Testimonio', plural: 'Testimonios' },
  access: {
    read: publishedOrAuthenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'rating', 'project', '_status']
  },
  versions: {
    drafts: true,
    maxPerDoc: 20
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'role', type: 'text', label: 'Cargo, empresa o comuna' },
    { name: 'quote', type: 'textarea', required: true },
    { name: 'rating', type: 'number', min: 1, max: 5, defaultValue: 5 },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    { name: 'project', type: 'relationship', relationTo: 'projects' }
  ]
}
