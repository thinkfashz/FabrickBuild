import type { GlobalConfig } from 'payload'
import { authenticated } from '@/access/authenticated'
import { appearanceField } from '@/fields/appearance'

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'Footer y enlaces legales',
  access: {
    read: () => true,
    update: authenticated,
  },
  admin: {
    group: 'Diseño global',
    description:
      'Configura contenido, enlaces, fondo sólido o translúcido, imagen, colores y accesos permanentes a privacidad y cookies.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Contenido',
          fields: [
            { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo opcional del footer' },
            {
              name: 'description',
              type: 'textarea',
              defaultValue: 'Construimos casas, transformamos espacios y resolvemos cada detalle.',
            },
            {
              name: 'links',
              type: 'array',
              label: 'Enlaces principales',
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'url', type: 'text', required: true },
              ],
            },
            {
              name: 'legalLinks',
              type: 'array',
              label: 'Enlaces legales',
              defaultValue: [
                { label: 'Privacidad', url: '/privacidad' },
                { label: 'Cookies', url: '/cookies' },
                { label: 'Términos', url: '/terminos' },
              ],
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'url', type: 'text', required: true },
              ],
            },
            {
              name: 'social',
              type: 'array',
              fields: [
                { name: 'platform', type: 'text', required: true },
                { name: 'url', type: 'text', required: true },
              ],
            },
            {
              name: 'copyrightText',
              type: 'text',
              defaultValue: 'FabrickBuild. Todos los derechos reservados.',
            },
            {
              name: 'showPrivacySettings',
              type: 'checkbox',
              defaultValue: true,
              label: 'Mostrar botón para cambiar preferencias de privacidad',
            },
          ],
        },
        {
          label: 'Diseño',
          fields: [
            appearanceField(),
            { name: 'backgroundMedia', type: 'upload', relationTo: 'media', label: 'Imagen o textura de fondo opcional' },
          ],
        },
      ],
    },
  ],
}
