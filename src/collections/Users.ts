import { APIError, type CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { authenticated } from '@/access/authenticated'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Usuario', plural: 'Usuarios' },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 4 * 60 * 60,
    removeTokenFromResponses: true,
    useSessions: true,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role'],
  },
  access: {
    admin: authenticated,
    create: adminOnly,
    read: ({ req }) => {
      if (req.user?.role === 'admin') return true
      if (req.user?.id) return { id: { equals: req.user.id } }
      return false
    },
    update: ({ req, id }) => req.user?.role === 'admin' || req.user?.id === id,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        if (
          operation === 'update' &&
          originalDoc?.role === 'admin' &&
          data?.role &&
          data.role !== 'admin'
        ) {
          const admins = await req.payload.count({
            collection: 'users',
            overrideAccess: true,
            where: { role: { equals: 'admin' } },
          })
          if (admins.totalDocs <= 1) {
            throw new APIError('No puedes degradar al último administrador del sistema.', 409)
          }
        }
        return data
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const user = await req.payload.findByID({
          collection: 'users',
          id,
          overrideAccess: true,
        })
        if (user.role !== 'admin') return

        const admins = await req.payload.count({
          collection: 'users',
          overrideAccess: true,
          where: { role: { equals: 'admin' } },
        })
        if (admins.totalDocs <= 1) {
          throw new APIError('No puedes eliminar al último administrador del sistema.', 409)
        }
      },
    ],
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
        { label: 'Editor', value: 'editor' },
      ],
      access: {
        create: ({ req }) => req.user?.role === 'admin',
        update: ({ req }) => req.user?.role === 'admin',
      },
    },
  ],
  timestamps: true,
}
