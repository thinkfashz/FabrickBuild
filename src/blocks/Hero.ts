import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'

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
        { label: 'Amarillo', value: 'yellow' },
      ],
    },
    appearanceField,
    { name: 'eyebrow', type: 'text', label: 'Texto superior' },
    { name: 'heading', type: 'text', required: true, label: 'Título principal' },
    { name: 'highlight', type: 'text', label: 'Texto destacado' },
    { name: 'description', type: 'textarea', required: true },
    {
      name: 'backgroundSource',
      type: 'radio',
      defaultValue: 'upload',
      label: 'Origen del background',
      options: [
        { label: 'Subir o seleccionar imagen', value: 'upload' },
        { label: 'Pegar una URL', value: 'url' },
        { label: 'Usar background guardado', value: 'saved' },
      ],
      admin: {
        description:
          'Puedes usar una imagen normal, una URL externa o una secuencia de frames creada en Multimedia → Backgrounds multimedia.',
      },
    },
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      label: 'Imagen del hero',
      admin: {
        condition: (_, siblingData) => !siblingData?.backgroundSource || siblingData?.backgroundSource === 'upload',
      },
    },
    {
      name: 'backgroundURL',
      type: 'text',
      label: 'URL del background',
      validate: (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
        if (siblingData?.backgroundSource !== 'url') return true
        if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) {
          return 'Ingresa una URL completa que comience por http:// o https://'
        }
        return true
      },
      admin: {
        condition: (_, siblingData) => siblingData?.backgroundSource === 'url',
      },
    },
    {
      name: 'savedBackground',
      type: 'relationship',
      relationTo: 'backgrounds',
      label: 'Background guardado',
      filterOptions: {
        status: { equals: 'ready' },
      },
      admin: {
        condition: (_, siblingData) => siblingData?.backgroundSource === 'saved',
        description: 'Selecciona una imagen, URL o secuencia de frames previamente organizada.',
      },
    },
    {
      name: 'primaryCTA',
      type: 'group',
      label: 'Botón principal',
      fields: [
        { name: 'label', type: 'text', defaultValue: 'Solicitar cotización' },
        { name: 'url', type: 'text', defaultValue: '#contacto' },
      ],
    },
    {
      name: 'secondaryCTA',
      type: 'group',
      label: 'Botón secundario',
      fields: [
        { name: 'label', type: 'text', defaultValue: 'Ver proyectos' },
        { name: 'url', type: 'text', defaultValue: '/proyectos' },
      ],
    },
    {
      name: 'stats',
      type: 'array',
      maxRows: 4,
      labels: { singular: 'Indicador', plural: 'Indicadores' },
      fields: [
        { name: 'value', type: 'text', required: true },
        { name: 'label', type: 'text', required: true },
      ],
    },
  ],
}
