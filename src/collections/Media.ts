import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { authenticated } from '@/access/authenticated'

const imageProcessingEnabled = process.platform !== 'android'

const slugify = (value: unknown) =>
  String(value || 'secuencia')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'secuencia'

const organizeFrameMetadata: CollectionBeforeValidateHook = ({ data }) => {
  if (!data || data.category !== 'frame') return data
  return { ...data, collectionKey: slugify(data.collectionKey || 'secuencia') }
}

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Archivo', plural: 'Biblioteca multimedia' },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: { beforeValidate: [organizeFrameMetadata] },
  admin: {
    group: 'Multimedia',
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'category', 'collectionKey', 'device', 'frameOrder', 'updatedAt'],
    description:
      'Las imágenes se optimizan y los frames se agrupan como carpetas virtuales mediante Grupo o secuencia. Filtra por collectionKey para revisar una animación completa.',
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
            options: { quality: 80, effort: 4 },
          },
          imageSizes: [
            { name: 'thumbnail', width: 420, height: 280, position: 'centre' as const, withoutEnlargement: true },
            { name: 'card', width: 900, height: 675, position: 'centre' as const, withoutEnlargement: true },
            { name: 'hero', width: 1600, position: 'centre' as const, withoutEnlargement: true },
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
      label: 'Carpeta virtual / secuencia',
      index: true,
      admin: {
        condition: (_, siblingData) => siblingData?.category === 'frame',
        description: 'Agrupa todos los frames del mismo background sin crear columnas nuevas ni duplicar archivos en Blob.',
      },
    },
    { name: 'caption', type: 'textarea', label: 'Descripción o crédito' },
  ],
}
