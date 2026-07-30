import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'

export const ReusableComponents: CollectionConfig = {
  slug: 'reusable-components',
  labels: { singular: 'Componente reutilizable', plural: 'Componentes reutilizables' },
  admin: {
    group: 'Componentes',
    useAsTitle: 'name',
    defaultColumns: ['name', 'kind', 'category', 'status', 'version', 'updatedAt'],
    description:
      'Crea bloques de página, botones, cards y bloques de texto animados. Después selecciónalos desde cualquier página.',
  },
  access: {
    admin: ({ req }) => req.user?.role === 'admin',
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
    read: ({ req }) => {
      if (req.user) return true
      return { status: { equals: 'active' } }
    },
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'kind',
      type: 'select',
      defaultValue: 'layout',
      required: true,
      options: [
        { label: 'Composición de bloques', value: 'layout' },
        { label: 'Botón animado', value: 'animatedButton' },
        { label: 'Card animada', value: 'animatedCard' },
        { label: 'Bloque de texto animado', value: 'animatedText' },
      ],
    },
    {
      name: 'category',
      type: 'select',
      defaultValue: 'section',
      options: [
        { label: 'Sección', value: 'section' },
        { label: 'Patrón', value: 'pattern' },
        { label: 'Página', value: 'page' },
        { label: 'Acción', value: 'action' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Activo', value: 'active' },
        { label: 'Borrador', value: 'draft' },
        { label: 'Archivado', value: 'archived' },
      ],
    },
    { name: 'description', type: 'textarea' },
    {
      name: 'layout',
      type: 'json',
      admin: {
        condition: (_, siblingData) => !siblingData?.kind || siblingData?.kind === 'layout',
        description: 'Bloques internos del componente. La IA y el editor visual pueden completar esta estructura.',
      },
      validate: (value, { siblingData }) =>
        siblingData?.kind && siblingData.kind !== 'layout'
          ? true
          : Array.isArray(value)
            ? true
            : 'Agrega una composición de bloques.',
    },
    {
      type: 'group',
      name: 'animatedContent',
      label: 'Contenido del componente animado',
      admin: {
        condition: (_, siblingData) => Boolean(siblingData?.kind && siblingData.kind !== 'layout'),
      },
      fields: [
        { name: 'eyebrow', type: 'text', label: 'Texto superior' },
        { name: 'heading', type: 'text', label: 'Título' },
        { name: 'body', type: 'textarea', label: 'Descripción' },
        { name: 'media', type: 'upload', relationTo: 'media', label: 'Imagen opcional' },
        { name: 'buttonLabel', type: 'text', label: 'Texto del botón' },
        { name: 'buttonURL', type: 'text', defaultValue: '#contacto', label: 'Enlace' },
        {
          name: 'surface',
          type: 'select',
          defaultValue: 'glass',
          options: [
            { label: 'Translúcido', value: 'glass' },
            { label: 'Sólido', value: 'solid' },
            { label: 'Contorno', value: 'outline' },
          ],
        },
        {
          name: 'animationPreset',
          type: 'select',
          defaultValue: 'fade-up',
          options: [
            { label: 'Subir y aparecer', value: 'fade-up' },
            { label: 'Aparecer', value: 'fade' },
            { label: 'Escala suave', value: 'scale' },
            { label: 'Desde la izquierda', value: 'slide-left' },
            { label: 'Desde la derecha', value: 'slide-right' },
          ],
        },
        { name: 'animationDuration', type: 'number', min: 150, max: 1800, defaultValue: 700 },
      ],
    },
    {
      name: 'styles',
      type: 'textarea',
      admin: {
        condition: (_, siblingData) => !siblingData?.kind || siblingData?.kind === 'layout',
        description: 'CSS aislado para el componente generado.',
      },
    },
    {
      name: 'previewHTML',
      type: 'textarea',
      admin: { description: 'Referencia visual segura usada por AI Studio.' },
    },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'manual',
      options: [
        { label: 'Creado manualmente', value: 'manual' },
        { label: 'Creado con IA', value: 'ai' },
        { label: 'Importado', value: 'imported' },
        { label: 'Biblioteca FabrickBuild', value: 'library' },
      ],
    },
    {
      name: 'tags',
      type: 'array',
      maxRows: 12,
      fields: [{ name: 'value', type: 'text', required: true }],
    },
    { name: 'version', type: 'number', defaultValue: 1, min: 1 },
    { name: 'createdBy', type: 'relationship', relationTo: 'users' },
  ],
  timestamps: true,
}
