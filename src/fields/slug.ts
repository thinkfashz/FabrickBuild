import type { Field } from 'payload'

export const formatSlug = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const slugField = (source = 'title'): Field => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description: 'URL amigable. Se genera automáticamente desde el título.'
  },
  hooks: {
    beforeValidate: [
      ({ data, value }) => {
        if (typeof value === 'string' && value.trim()) return formatSlug(value)
        const sourceValue = data?.[source]
        return typeof sourceValue === 'string' ? formatSlug(sourceValue) : value
      }
    ]
  }
})
