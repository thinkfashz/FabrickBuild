import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'

export const ProjectsGrid: Block = {
  slug: 'projectsGrid',
  interfaceName: 'ProjectsGridBlock',
  labels: { singular: 'Grilla de proyectos', plural: 'Grillas de proyectos' },
  fields: [
    { name: 'eyebrow', type: 'text', defaultValue: 'Proyectos' },
    { name: 'heading', type: 'text', required: true },
    { name: 'intro', type: 'textarea' },
    {
      name: 'projects',
      type: 'relationship',
      relationTo: 'projects',
      hasMany: true,
      admin: { description: 'Vacío muestra los proyectos destacados.' }
    },
    { name: 'limit', type: 'number', defaultValue: 6, min: 1, max: 12 },
    appearanceField,
  ]
}
