import type { Block } from 'payload'

export const ServicesGrid: Block = {
  slug: 'servicesGrid',
  interfaceName: 'ServicesGridBlock',
  labels: { singular: 'Grilla de servicios', plural: 'Grillas de servicios' },
  fields: [
    { name: 'eyebrow', type: 'text', defaultValue: 'Servicios' },
    { name: 'heading', type: 'text', required: true },
    { name: 'intro', type: 'textarea' },
    {
      name: 'services',
      type: 'relationship',
      relationTo: 'services',
      hasMany: true,
      admin: { description: 'Vacío muestra los servicios destacados.' }
    },
    { name: 'limit', type: 'number', defaultValue: 6, min: 1, max: 12 }
  ]
}
