import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'

export const ReusableComponents: CollectionConfig = {
  slug: 'reusable-components',
  labels: { singular: 'Componente reutilizable', plural: 'Componentes reutilizables' },
  admin: {
    group: 'IA y automatización',
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'status', 'version', 'updatedAt'],
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
      name: 'category',
      type: 'select',
      defaultValue: 'section',
      options: [
        { label: 'Sección', value: 'section' },
        { label: 'Patrón', value: 'pattern' },
        { label: 'Página', value: 'page' },
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
    { name: 'layout', type: 'json', required: true },
    {
      name: 'styles',
      type: 'textarea',
      admin: { description: 'CSS aislado para el componente generado.' },
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
