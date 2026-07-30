import type { CollectionBeforeValidateHook } from 'payload'

const numericID = /^\d+$/

const cleanArrayRow = (value: unknown): unknown => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const source = value as Record<string, unknown>
  const output: Record<string, unknown> = { ...source }

  if (typeof output.id === 'string' && !numericID.test(output.id)) delete output.id

  for (const [key, nested] of Object.entries(output)) {
    if (!Array.isArray(nested)) continue
    if (['desktopFrames', 'mobileFrames', 'gallery', 'services', 'projects', 'items'].includes(key)) {
      output[key] = nested.map((item) => {
        if (item && typeof item === 'object' && !Array.isArray(item) && 'blockType' in (item as Record<string, unknown>)) {
          return cleanArrayRow(item)
        }
        if (item && typeof item === 'object' && !Array.isArray(item) && !('url' in (item as Record<string, unknown>))) {
          return cleanArrayRow(item)
        }
        return item
      })
      continue
    }
    output[key] = nested.map(cleanArrayRow)
  }

  return output
}

export const normalizeLegacyBlockIDs: CollectionBeforeValidateHook = ({ data }) => {
  if (!data || !Array.isArray(data.layout)) return data
  return {
    ...data,
    layout: data.layout.map(cleanArrayRow),
  }
}
