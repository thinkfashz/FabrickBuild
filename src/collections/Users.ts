import type { CollectionConfig } from 'payload'
import { authenticated } from '@/access/authenticated'
import { adminOnly } from '@/access/adminOnly'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Usuario', plural: 'Usuarios' },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    tokenExpiration: 8 * 60 * 60
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role']
  },
  access: {
    admin: authenticated,
    create: authenticated,
    read: authenticated,
    update: ({ req, id }) => req.user?.role === 'admin' || req.user?.id === id,
    delete: adminOnly
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      saveToJWT: true,
      options: [
        { label: 'Administrador', value: 'admin' },
        { label: 'Editor', value: 'editor' }
      ],
      access: {
        update: ({ req }) => req.user?.role === 'admin'
      }
    }
  ],
  timestamps: true
}
