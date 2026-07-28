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
      'Carga imágenes individuales o en grupo. Para secuencias usa nombres correlativos como frame_001, frame_002 y luego crea un Background multimedia.',
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
            { name: 'hero', width: 1920, height: 1080, position: 'centre' as const },
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
        description: 'Marca los frames como Web o Móvil para filtrarlos fácilmente al crear un background.',
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
