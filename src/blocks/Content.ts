import type { Block } from 'payload'

export const Content: Block = {
  slug: 'content',
  interfaceName: 'ContentBlock',
  labels: { singular: 'Contenido', plural: 'Contenidos' },
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'heading', type: 'text' },
    { name: 'content', type: 'richText', required: true },
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
    }
  ]
}
