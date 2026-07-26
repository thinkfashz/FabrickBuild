import type { CollectionConfig } from 'payload'
import { authenticated } from '@/access/authenticated'

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
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    mimeTypes: ['image/*', 'application/pdf', 'video/mp4'],
    imageSizes: [
      { name: 'thumbnail', width: 480, height: 320, position: 'centre' },
      { name: 'card', width: 900, height: 650, position: 'centre' },
      { name: 'hero', width: 1920, height: 1080, position: 'centre' }
    ]
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
