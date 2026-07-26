import type { GlobalConfig } from 'payload'
import { authenticated } from '@/access/authenticated'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Configuración general',
  access: {
    read: () => true,
    update: authenticated
  },
  fields: [
    { name: 'brandName', type: 'text', defaultValue: 'FabrickBuild', required: true },
    {
      name: 'tagline',
      type: 'text',
      defaultValue: 'Construimos casas. Diseñamos soluciones.'
    },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'phone', type: 'text' },
        { name: 'whatsapp', type: 'text' },
        { name: 'email', type: 'email', defaultValue: 'contacto@solucionesfabrick.com' },
        { name: 'address', type: 'text', defaultValue: 'Santiago, Chile' }
      ]
    },
    {
      name: 'defaultSEO',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', defaultValue: 'FabrickBuild | Construcción inteligente' },
        {
          name: 'description',
          type: 'textarea',
          defaultValue: 'Construcción, remodelación y reparación con planificación, transparencia y calidad.'
        },
        { name: 'image', type: 'upload', relationTo: 'media' }
      ]
    }
  ]
}
