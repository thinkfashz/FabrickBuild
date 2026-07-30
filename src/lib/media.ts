type MediaLike =
  | string
  | number
  | null
  | undefined
  | {
      url?: string | null
      externalURL?: string | null
      alt?: string | null
      sizes?: Record<string, { url?: string | null } | null> | null
    }

export const getMediaURL = (media: MediaLike, size?: string): string | null => {
  if (!media || typeof media !== 'object') return null
  if (media.externalURL) return media.externalURL
  if (size && media.sizes?.[size]?.url) return media.sizes[size]?.url || null
  return media.url || null
}

export const getMediaAlt = (media: MediaLike, fallback = ''): string => {
  if (!media || typeof media !== 'object') return fallback
  return media.alt || fallback
}
