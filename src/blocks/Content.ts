import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'

export const Content: Block = {
  slug: 'content',
  interfaceName: 'ContentBlock',
  labels: { singular: 'Contenido', plural: 'Contenidos' },
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'heading', type: 'text' },
    {
      name: 'content', type: 'richText', required: true, label: 'Texto con formato',
      admin: { description: 'Selecciona una parte del texto para cambiar solo ese fragmento de color desde la barra flotante. Títulos y párrafos completos se controlan en Apariencia visual.' },
    },
    { name: 'media', type: 'upload', relationTo: 'media' },
    {
      name: 'mediaPosition',
      type: 'select',
      defaultValue: 'right',
      options: [
        { label: 'Derecha', value: 'right' },
        { label: 'Izquierda', value: 'left' },
        { label: 'Arriba', value: 'top' }
      ]
    },
    appearanceField,
  ]
}
