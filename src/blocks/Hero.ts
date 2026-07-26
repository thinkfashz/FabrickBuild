import type { Block } from 'payload'

export const Hero: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: { singular: 'Portada principal', plural: 'Portadas principales' },
  fields: [
    {
      name: 'theme',
      type: 'select',
      defaultValue: 'dark',
      options: [
        { label: 'Oscuro', value: 'dark' },
        { label: 'Claro', value: 'light' },
        { label: 'Amarillo', value: 'yellow' }
      ]
    },
    { name: 'eyebrow', type: 'text', label: 'Texto superior' },
    { name: 'heading', type: 'text', required: true, label: 'Título principal' },
    { name: 'highlight', type: 'text', label: 'Texto destacado' },
    { name: 'description', type: 'textarea', required: true },
    { name: 'media', type: 'upload', relationTo: 'media' },
    {
      name: 'primaryCTA',
      type: 'group',
      label: 'Botón principal',
      fields: [
        { name: 'label', type: 'text', defaultValue: 'Solicitar cotización' },
        { name: 'url', type: 'text', defaultValue: '#contacto' }
      ]
    },
    {
      name: 'secondaryCTA',
      type: 'group',
      label: 'Botón secundario',
      fields: [
        { name: 'label', type: 'text', defaultValue: 'Ver proyectos' },
        { name: 'url', type: 'text', defaultValue: '/proyectos' }
      ]
    },
    {
      name: 'stats',
      type: 'array',
      maxRows: 4,
      labels: { singular: 'Indicador', plural: 'Indicadores' },
      fields: [
        { name: 'value', type: 'text', required: true },
        { name: 'label', type: 'text', required: true }
      ]
    }
  ]
}
