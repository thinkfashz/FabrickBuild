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
    },
    {
      type: 'group',
      name: 'experience',
      label: 'Carga y privacidad',
      fields: [
        { name: 'loaderEnabled', type: 'checkbox', defaultValue: true, label: 'Mostrar pantalla de carga' },
        { name: 'loaderDuration', type: 'number', min: 0, max: 4, defaultValue: 4, label: 'Duración máxima de carga (segundos)' },
        { name: 'loaderTitle', type: 'text', defaultValue: 'FabrickBuild' },
        { name: 'loaderMessage', type: 'text', defaultValue: 'Preparando la experiencia' },
        { name: 'consentEnabled', type: 'checkbox', defaultValue: true, label: 'Mostrar aviso de privacidad y cookies' },
        { name: 'consentVersion', type: 'text', defaultValue: '2026-07', label: 'Versión del aviso de consentimiento' },
      ],
    }
  ]
}
