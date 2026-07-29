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
    // Files are written through /api/media and /api/media-library so the same
    // flow works with private Vercel Blob, Cloudinary and S3 on serverless.
    disableLocalStorage: true,
    filesRequiredOnCreate: false,
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
      name: 'storageProvider',
      type: 'select',
      defaultValue: 'database',
      index: true,
      label: 'Origen del archivo',
      options: [
        { label: 'Base de datos + almacenamiento de Payload', value: 'database' },
        { label: 'Vercel Blob', value: 'vercel-blob' },
        { label: 'Cloudinary', value: 'cloudinary' },
        { label: 'Amazon S3 / S3 compatible', value: 's3' },
      ],
      admin: {
        description: 'El registro y los metadatos siempre quedan en PostgreSQL. Los proveedores externos guardan el archivo y esta URL se usa en el sitio.',
      },
    },
    { name: 'externalURL', type: 'text', label: 'URL externa del archivo', admin: { readOnly: true } },
    { name: 'storageKey', type: 'text', index: true, label: 'Clave remota', admin: { readOnly: true } },
    { name: 'storageIntegrationID', type: 'text', label: 'Integración de almacenamiento', admin: { readOnly: true } },
    {
      name: 'storageVisibility',
      type: 'select',
      defaultValue: 'private',
      label: 'Visibilidad remota',
      options: [
        { label: 'Privada, servida por FabrickBuild', value: 'private' },
        { label: 'Pública', value: 'public' },
      ],
      admin: { readOnly: true },
    },
    { name: 'storageFolder', type: 'text', index: true, label: 'Carpeta multimedia', defaultValue: 'general' },
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
