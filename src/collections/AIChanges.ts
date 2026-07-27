import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'

export const AIChanges: CollectionConfig = {
  slug: 'ai-changes',
  labels: { singular: 'Cambio de IA', plural: 'Cambios de IA' },
  admin: {
    group: 'IA y automatización',
    useAsTitle: 'title',
    defaultColumns: ['title', 'targetPage', 'provider', 'model', 'status', 'updatedAt'],
  },
  access: {
    admin: adminOnly,
    create: adminOnly,
    read: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'targetPage', type: 'relationship', relationTo: 'pages', required: true },
    { name: 'prompt', type: 'textarea', required: true },
    { name: 'provider', type: 'text', required: true },
    { name: 'model', type: 'text', required: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'proposed',
      options: [
        { label: 'Propuesto', value: 'proposed' },
        { label: 'Aplicado', value: 'applied' },
        { label: 'Deshecho', value: 'rolled-back' },
        { label: 'Descartado', value: 'rejected' },
        { label: 'Error', value: 'error' },
      ],
    },
    { name: 'proposals', type: 'json', required: true },
    { name: 'selectedProposal', type: 'number', min: 0, max: 1 },
    { name: 'previousSnapshot', type: 'json' },
    { name: 'appliedSnapshot', type: 'json' },
    { name: 'usage', type: 'json' },
    { name: 'createdBy', type: 'relationship', relationTo: 'users' },
    { name: 'appliedAt', type: 'date' },
    { name: 'rolledBackAt', type: 'date' },
    { name: 'lastError', type: 'textarea' },
  ],
  timestamps: true,
}
