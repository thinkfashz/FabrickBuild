import type { GlobalConfig } from 'payload'
import { authenticated } from '@/access/authenticated'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Configuración general',
  access: {
    read: () => true,
    update: authenticated,
  },
  admin: {
    group: 'Diseño global',
    description: 'Identidad, experiencia de portada, loader, consentimiento, contacto, SEO y rendimiento general.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Marca',
          fields: [
            { name: 'brandName', type: 'text', defaultValue: 'FabrickBuild', required: true },
            { name: 'tagline', type: 'text', defaultValue: 'Construimos casas. Diseñamos soluciones.' },
            {
              type: 'row',
              fields: [
                { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo principal' },
                { name: 'mobileLogo', type: 'upload', relationTo: 'media', label: 'Logo móvil opcional' },
              ],
            },
            {
              name: 'homepageExperience',
              type: 'select',
              defaultValue: 'luxury',
              label: 'Experiencia de portada',
              options: [
                { label: 'Fabrick Signature — diseño de fábrica', value: 'luxury' },
                { label: 'Portada CMS tradicional', value: 'standard' },
                { label: 'Solo bloques de la página', value: 'blocks' },
              ],
              admin: {
                description: 'El preset de fábrica conserva el diseño aprobado y reproduce todos los frames del Background seleccionado mediante ScrollTrigger.',
              },
            },
            {
              name: 'hideFirstHeroWhenLuxury',
              type: 'checkbox',
              defaultValue: true,
              label: 'Ocultar la portada tradicional cuando se usa Fabrick Signature',
            },
          ],
        },
        {
          label: 'Loader',
          fields: [
            {
              name: 'loader',
              type: 'group',
              fields: [
                { name: 'enabled', type: 'checkbox', defaultValue: true, label: 'Activar loader global' },
                { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo del loader' },
                { name: 'text', type: 'text', defaultValue: 'Preparando tu experiencia' },
                {
                  name: 'animation',
                  type: 'select',
                  defaultValue: 'glow',
                  options: [
                    { label: 'Brillo premium', value: 'glow' },
                    { label: 'Pulso', value: 'pulse' },
                    { label: 'Entrada suave', value: 'fade' },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'backgroundColor', type: 'text', defaultValue: '#10110f', label: 'Color de fondo' },
                    { name: 'foregroundColor', type: 'text', defaultValue: '#f4c84b', label: 'Color principal' },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'minimumDuration', type: 'number', min: 0, max: 1200, defaultValue: 450, label: 'Duración mínima (ms)' },
                    { name: 'maximumDuration', type: 'number', min: 1000, max: 4000, defaultValue: 4000, label: 'Límite máximo (ms)' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Privacidad y cookies',
          fields: [
            {
              name: 'consent',
              type: 'group',
              fields: [
                { name: 'enabled', type: 'checkbox', defaultValue: true, label: 'Mostrar gestor de consentimiento' },
                { name: 'version', type: 'text', defaultValue: '2026-07', label: 'Versión del consentimiento' },
                { name: 'title', type: 'text', defaultValue: 'Tu privacidad importa' },
                {
                  name: 'message',
                  type: 'textarea',
                  defaultValue:
                    'Usamos datos necesarios para el funcionamiento del sitio. Las categorías de analítica, personalización y marketing permanecen desactivadas hasta que las autorices.',
                },
                { name: 'acceptAllLabel', type: 'text', defaultValue: 'Aceptar todo' },
                { name: 'rejectOptionalLabel', type: 'text', defaultValue: 'Solo necesarias' },
                { name: 'settingsLabel', type: 'text', defaultValue: 'Configurar' },
                { name: 'saveLabel', type: 'text', defaultValue: 'Guardar preferencias' },
                { name: 'privacyURL', type: 'text', defaultValue: '/privacidad' },
                { name: 'cookiesURL', type: 'text', defaultValue: '/cookies' },
                { name: 'termsURL', type: 'text', defaultValue: '/terminos' },
              ],
            },
          ],
        },
        {
          label: 'Contacto y SEO',
          fields: [
            {
              name: 'contact',
              type: 'group',
              fields: [
                { name: 'phone', type: 'text' },
                { name: 'whatsapp', type: 'text' },
                { name: 'email', type: 'email', defaultValue: 'contacto@solucionesfabrick.com' },
                { name: 'address', type: 'text', defaultValue: 'Santiago, Chile' },
              ],
            },
            {
              name: 'defaultSEO',
              type: 'group',
              fields: [
                { name: 'title', type: 'text', defaultValue: 'FabrickBuild | Construcción inteligente' },
                {
                  name: 'description',
                  type: 'textarea',
                  defaultValue: 'Construcción, remodelación y reparación con planificación, transparencia y calidad.',
                },
                { name: 'image', type: 'upload', relationTo: 'media' },
              ],
            },
          ],
        },
        {
          label: 'Rendimiento',
          fields: [
            {
              name: 'performance',
              type: 'group',
              fields: [
                { name: 'publicRevalidateSeconds', type: 'number', min: 30, max: 3600, defaultValue: 300, label: 'Caché pública (segundos)' },
                { name: 'initialFramePreload', type: 'number', min: 2, max: 12, defaultValue: 5, label: 'Frames iniciales a precargar' },
                { name: 'frameBatchSize', type: 'number', min: 2, max: 16, defaultValue: 6, label: 'Frames por lote' },
                { name: 'respectReducedMotion', type: 'checkbox', defaultValue: true, label: 'Respetar reducción de movimiento' },
                { name: 'respectSaveData', type: 'checkbox', defaultValue: true, label: 'Usar experiencia liviana con ahorro de datos' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
