import type { CollectionConfig } from 'payload'
import { authenticated } from '@/access/authenticated'

const imageProcessingEnabled = process.platform !== 'android'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Archivo', plural: 'Biblioteca multimedia' },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated
  },
  admin: {
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'category', 'updatedAt']
  },
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*', 'application/pdf', 'video/mp4'],
    ...(imageProcessingEnabled
      ? {
          adminThumbnail: 'thumbnail',
          focalPoint: true,
          imageSizes: [
            { name: 'thumbnail', width: 480, height: 320, position: 'centre' as const },
            { name: 'card', width: 900, height: 650, position: 'centre' as const },
            { name: 'hero', width: 1920, height: 1080, position: 'centre' as const }
          ]
        }
      : {
          crop: false,
          focalPoint: false
        })
  },
  fields: [
    { name: 'alt', type: 'text', required: true, label: 'Texto alternativo' },
    {
      name: 'category',
      type: 'select',
      defaultValue: 'obra',
      options: [
        { label: 'Obra', value: 'obra' },
        { label: 'Servicio', value: 'servicio' },
        { label: 'Equipo', value: 'equipo' },
        { label: 'Documento', value: 'documento' },
        { label: 'Otro', value: 'otro' }
      ]
    },
    { name: 'caption', type: 'textarea', label: 'Descripción o crédito' }
  ]
}