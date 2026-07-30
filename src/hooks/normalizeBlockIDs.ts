import type { CollectionBeforeValidateHook } from 'payload'

const numericID = /^\d+$/
const managedArrayFields = new Set([
  'stats',
  'items',
  'benefits',
  'process',
  'techStack',
  'projects',
  'services',
  'navItems',
  'links',
  'legalLinks',
  'social',
  'tags',
])

const cleanManagedRow = (value: unknown): unknown => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const output: Record<string, unknown> = { ...(value as Record<string, unknown>) }

  if (typeof output.id === 'string' && !numericID.test(output.id)) delete output.id

  for (const [key, nested] of Object.entries(output)) {
    if (!managedArrayFields.has(key) || !Array.isArray(nested)) continue
    output[key] = nested.map(cleanManagedRow)
  }

  return output
}

export const normalizeLegacyBlockIDs: CollectionBeforeValidateHook = ({ data }) => {
  if (!data || !Array.isArray(data.layout)) return data
  return {
    ...data,
    layout: data.layout.map(cleanManagedRow),
  }
}
