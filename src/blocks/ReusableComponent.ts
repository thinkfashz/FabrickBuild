import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'

export const ReusableComponent: Block = {
  slug: 'reusableComponent',
  interfaceName: 'ReusableComponentBlock',
  labels: { singular: 'Componente reutilizable', plural: 'Componentes reutilizables' },
  fields: [
    {
      name: 'component',
      type: 'relationship',
      relationTo: 'reusable-components',
      required: true,
      filterOptions: { status: { equals: 'active' } },
    },
    appearanceField,
    { name: 'anchor', type: 'text', label: 'ID o ancla opcional' },
    {
      name: 'background',
      type: 'select',
      defaultValue: 'inherit',
      options: [
        { label: 'Heredado', value: 'inherit' },
        { label: 'Claro', value: 'light' },
        { label: 'Oscuro', value: 'dark' },
        { label: 'Amarillo', value: 'yellow' },
      ],
    },
    {
      name: 'spacing',
      type: 'select',
      defaultValue: 'normal',
      options: [
        { label: 'Compacto', value: 'compact' },
        { label: 'Normal', value: 'normal' },
        { label: 'Amplio', value: 'large' },
      ],
    },
  ],
}
