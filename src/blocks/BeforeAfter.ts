import type { Block } from 'payload'

export const BeforeAfter: Block = {
  slug: 'beforeAfter',
  interfaceName: 'BeforeAfterBlock',
  labels: { singular: 'Antes y después', plural: 'Antes y después' },
  fields: [
    { name: 'eyebrow', type: 'text', defaultValue: 'Transformación' },
    { name: 'heading', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'before', type: 'upload', relationTo: 'media', required: true },
    { name: 'after', type: 'upload', relationTo: 'media', required: true }
  ]
}
