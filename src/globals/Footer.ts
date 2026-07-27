import type { GlobalConfig } from 'payload'
import { authenticated } from '@/access/authenticated'

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'Pie de página',
  access: {
    read: () => true,
    update: authenticated
  },
  fields: [
    {
      name: 'description',
      type: 'textarea',
      defaultValue: 'Construimos casas, transformamos espacios y resolvemos cada detalle.'
    },
    {
      name: 'links',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true }
      ]
    },
    {
      name: 'social',
      type: 'array',
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'url', type: 'text', required: true }
      ]
    }
  ]
}
