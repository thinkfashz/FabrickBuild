import type { Block } from 'payload'

export const Testimonials: Block = {
  slug: 'testimonials',
  interfaceName: 'TestimonialsBlock',
  labels: { singular: 'Testimonios', plural: 'Testimonios' },
  fields: [
    { name: 'eyebrow', type: 'text', defaultValue: 'Clientes' },
    { name: 'heading', type: 'text', required: true },
    {
      name: 'items',
      type: 'relationship',
      relationTo: 'testimonials',
      hasMany: true,
      admin: { description: 'Vacío muestra todos los testimonios publicados.' }
    }
  ]
}
