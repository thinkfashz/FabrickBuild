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
      'Configura el footer digital superpuesto, sus enlaces, redes sociales, colores, textura y accesos permanentes a privacidad y cookies.',
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
              defaultValue:
                'Diseñamos páginas web, e-commerce y sistemas digitales que unen estrategia, movimiento, automatización e inteligencia artificial.',
            },
            {
              name: 'links',
              type: 'array',
              label: 'Enlaces principales',
              defaultValue: [
                { label: 'Servicios digitales', url: '/servicios' },
                { label: 'Proyectos', url: '/proyectos' },
                { label: 'Nuestro proceso', url: '/nosotros' },
                { label: 'Iniciar proyecto', url: '/#contacto' },
              ],
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
              label: 'Redes sociales',
              defaultValue: [{ platform: 'GitHub', url: 'https://github.com/thinkfashz' }],
              admin: {
                description:
                  'Añade Instagram, GitHub, LinkedIn, YouTube, Facebook u otra red. WhatsApp y correo se agregan automáticamente desde Configuración general.',
              },
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
            {
              name: 'backgroundMedia',
              type: 'upload',
              relationTo: 'media',
              label: 'Textura opcional del footer',
              admin: {
                description:
                  'El footer conserva su transparencia para mostrar el último frame del Background. Usa esta imagen solo como textura secundaria.',
              },
            },
          ],
        },
      ],
    },
  ],
}
