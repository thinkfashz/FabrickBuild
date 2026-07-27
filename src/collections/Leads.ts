import type { CollectionConfig } from 'payload'
import { authenticated } from '@/access/authenticated'

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: 'Contacto', plural: 'Cotizaciones y contactos' },
  access: {
    create: () => true,
    read: authenticated,
    update: authenticated,
    delete: authenticated
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'service', 'status', 'priority', 'createdAt'],
    group: 'CRM'
  },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Nombre' },
    { name: 'phone', type: 'text', required: true, label: 'Teléfono' },
    { name: 'email', type: 'email' },
    { name: 'commune', type: 'text', label: 'Comuna o ciudad' },
    { name: 'service', type: 'relationship', relationTo: 'services' },
    {
      name: 'projectType',
      type: 'select',
      options: [
        { label: 'Casa nueva', value: 'new-home' },
        { label: 'Remodelación', value: 'remodeling' },
        { label: 'Reparación', value: 'repair' },
        { label: 'Otro', value: 'other' }
      ]
    },
    { name: 'area', type: 'number', min: 0, label: 'Superficie aproximada (m²)' },
    {
      name: 'budget',
      type: 'select',
      label: 'Presupuesto estimado',
      options: [
        { label: 'Menos de $1.000.000 CLP', value: 'under-1m' },
        { label: '$1.000.000 a $5.000.000 CLP', value: '1m-5m' },
        { label: '$5.000.000 a $20.000.000 CLP', value: '5m-20m' },
        { label: 'Más de $20.000.000 CLP', value: 'over-20m' },
        { label: 'Por definir', value: 'unknown' }
      ]
    },
    { name: 'message', type: 'textarea', required: true, label: 'Mensaje' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      admin: { position: 'sidebar' },
      options: [
        { label: 'Nuevo', value: 'new' },
        { label: 'Contactado', value: 'contacted' },
        { label: 'Visita agendada', value: 'scheduled' },
        { label: 'Cotización enviada', value: 'quoted' },
        { label: 'Ganado', value: 'won' },
        { label: 'Perdido', value: 'lost' }
      ]
    },
    {
      name: 'priority',
      type: 'select',
      defaultValue: 'normal',
      admin: { position: 'sidebar' },
      options: [
        { label: 'Baja', value: 'low' },
        { label: 'Normal', value: 'normal' },
        { label: 'Alta', value: 'high' },
        { label: 'Urgente', value: 'urgent' }
      ]
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar' }
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      access: {
        create: ({ req }) => Boolean(req.user),
        read: ({ req }) => Boolean(req.user),
        update: ({ req }) => Boolean(req.user)
      }
    },
    {
      name: 'source',
      type: 'text',
      defaultValue: 'website',
      admin: { position: 'sidebar', readOnly: true }
    }
  ],
  timestamps: true
}
