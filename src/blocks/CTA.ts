import type { Block } from 'payload'

export const CTA: Block = {
  slug: 'cta',
  interfaceName: 'CTABlock',
  labels: { singular: 'Llamado a la acción', plural: 'Llamados a la acción' },
  fields: [
    { name: 'eyebrow', type: 'text', defaultValue: 'Hablemos de tu proyecto' },
    { name: 'heading', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'button',
      type: 'group',
      fields: [
        { name: 'label', type: 'text', defaultValue: 'Cotizar ahora' },
        { name: 'url', type: 'text', defaultValue: '#contacto' }
      ]
    }
  ]
}
