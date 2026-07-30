import type { GlobalConfig } from 'payload'
import { authenticated } from '@/access/authenticated'
import { chromeAppearanceField } from '@/fields/appearance'

export const Header: GlobalConfig = {
  slug: 'header',
  label: 'Navegación',
  access: {
    read: () => true,
    update: authenticated
  },
  fields: [
    chromeAppearanceField('Apariencia de la barra de navegación'),
    {
      name: 'navItems',
      type: 'array',
      maxRows: 8,
      defaultValue: [
        { label: 'Servicios', url: '/servicios' },
        { label: 'Proyectos', url: '/proyectos' },
        { label: 'Nosotros', url: '/nosotros' }
      ],
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true }
      ]
    },
    {
      name: 'cta',
      type: 'group',
      fields: [
        { name: 'label', type: 'text', defaultValue: 'Cotizar proyecto' },
        { name: 'url', type: 'text', defaultValue: '/#contacto' }
      ]
    }
  ]
}
