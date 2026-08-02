import type { GlobalConfig } from 'payload'
import { authenticated } from '@/access/authenticated'
import { appearanceField } from '@/fields/appearance'

export const Header: GlobalConfig = {
  slug: 'header',
  label: 'Navbar y navegación',
  access: {
    read: () => true,
    update: authenticated,
  },
  admin: {
    group: 'Diseño global',
    description:
      'Controla logo, tamaño, animación, navegación, fondo sólido o translúcido y comportamiento móvil de todas las páginas.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Contenido',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo navbar' },
                { name: 'mobileLogo', type: 'upload', relationTo: 'media', label: 'Logo móvil opcional' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'logoSizeDesktop', type: 'number', min: 28, max: 160, defaultValue: 54, label: 'Tamaño logo escritorio' },
                { name: 'logoSizeMobile', type: 'number', min: 28, max: 120, defaultValue: 48, label: 'Tamaño logo móvil' },
              ],
            },
            {
              name: 'logoAnimation',
              type: 'select',
              defaultValue: 'glow',
              label: 'Animación del logotipo',
              options: [
                { label: 'Sin animación', value: 'none' },
                { label: 'Entrada suave', value: 'fade' },
                { label: 'Brillo premium', value: 'glow' },
                { label: 'Flotación suave', value: 'float' },
              ],
            },
            {
              name: 'navItems',
              type: 'array',
              maxRows: 8,
              defaultValue: [
                { label: 'Servicios digitales', url: '/servicios' },
                { label: 'Proyectos', url: '/proyectos' },
                { label: 'Nuestro proceso', url: '/nosotros' },
              ],
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'url', type: 'text', required: true },
              ],
            },
            {
              name: 'cta',
              type: 'group',
              fields: [
                { name: 'label', type: 'text', defaultValue: 'Iniciar proyecto' },
                { name: 'url', type: 'text', defaultValue: '/#contacto' },
              ],
            },
          ],
        },
        {
          label: 'Diseño',
          fields: [
            appearanceField(),
            { name: 'backgroundMedia', type: 'upload', relationTo: 'media', label: 'Imagen o textura de fondo opcional' },
            {
              type: 'row',
              fields: [
                { name: 'sticky', type: 'checkbox', defaultValue: true, label: 'Mantener visible al desplazarse' },
                { name: 'centerLogoMobile', type: 'checkbox', defaultValue: true, label: 'Centrar logo exactamente en móvil' },
                { name: 'showCTAMobile', type: 'checkbox', defaultValue: false, label: 'Mostrar CTA fuera del menú móvil' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
