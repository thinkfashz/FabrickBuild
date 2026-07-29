import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'

export const ContactForm: Block = {
  slug: 'contactForm',
  interfaceName: 'ContactFormBlock',
  labels: { singular: 'Formulario de cotización', plural: 'Formularios de cotización' },
  fields: [
    { name: 'eyebrow', type: 'text', defaultValue: 'Cotización' },
    { name: 'heading', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'services',
      type: 'relationship',
      relationTo: 'services',
      hasMany: true,
      admin: { description: 'Servicios que aparecerán en el selector.' }
    },
    {
      name: 'successMessage',
      type: 'text',
      defaultValue: 'Recibimos tu solicitud. Te contactaremos pronto.'
    },
    appearanceField,
  ]
}
