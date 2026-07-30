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
    delete: authenticated,
  },
  admin: {
    group: 'Multimedia',
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'category', 'device', 'frameOrder', 'updatedAt'],
    description:
      'Las imágenes nuevas se convierten a WebP y generan variantes thumbnail, card y hero. Para secuencias usa nombres correlativos como frame_001, frame_002.',
  },
  upload: {
    staticDir: 'media',
    bulkUpload: true,
    displayPreview: true,
    mimeTypes: ['image/*', 'application/pdf', 'video/mp4', 'video/webm'],
    ...(imageProcessingEnabled
      ? {
          adminThumbnail: 'thumbnail',
          focalPoint: true,
          formatOptions: {
            format: 'webp' as const,
            options: { quality: 82, effort: 5 },
          },
          imageSizes: [
            { name: 'thumbnail', width: 480, height: 320, position: 'centre' as const, withoutEnlargement: true },
            { name: 'card', width: 960, height: 720, position: 'centre' as const, withoutEnlargement: true },
            { name: 'hero', width: 1920, position: 'centre' as const, withoutEnlargement: true },
          ],
        }
      : {
          crop: false,
          focalPoint: false,
        }),
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
        { label: 'Hero / portada', value: 'hero' },
        { label: 'Frame de secuencia', value: 'frame' },
        { label: 'Background', value: 'background' },
        { label: 'Equipo', value: 'equipo' },
        { label: 'Documento', value: 'documento' },
        { label: 'Otro', value: 'otro' },
      ],
    },
    {
      name: 'device',
      type: 'select',
      defaultValue: 'universal',
      label: 'Formato objetivo',
      options: [
        { label: 'Universal', value: 'universal' },
        { label: 'Web / escritorio', value: 'desktop' },
        { label: 'Móvil vertical', value: 'mobile' },
      ],
      admin: {
        description: 'Marca los frames como Web o Móvil para cargar solo la secuencia adecuada en cada dispositivo.',
      },
    },
    {
      name: 'frameOrder',
      type: 'number',
      min: 1,
      label: 'Orden del frame',
      admin: {
        condition: (_, siblingData) => siblingData?.category === 'frame',
        description: 'Número correlativo de la secuencia. Ejemplo: 1, 2, 3…',
      },
    },
    {
      name: 'collectionKey',
      type: 'text',
      label: 'Grupo o secuencia',
      index: true,
      admin: {
        condition: (_, siblingData) => siblingData?.category === 'frame',
        description: 'Usa el mismo nombre para todos los frames del grupo, por ejemplo casa-lujo-01.',
      },
    },
    { name: 'caption', type: 'textarea', label: 'Descripción o crédito' },
  ],
}
