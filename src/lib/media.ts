type MediaLike =
  | string
  | number
  | null
  | undefined
  | {
      url?: string | null
      alt?: string | null
      caption?: string | null
      filename?: string | null
      prefix?: string | null
      sizes?: Record<string, { url?: string | null } | null> | null
    }

const encodePath = (value: string) =>
  value
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')

const extensionOf = (filename?: string | null) => {
  const match = filename?.match(/\.([a-z0-9]+)$/i)
  return match?.[1]?.toLowerCase() || 'webp'
}

const providerURL = (media: Exclude<MediaLike, string | number | null | undefined>): string | null => {
  const caption = media.caption?.trim() || ''

  if (caption.startsWith('Cloudinary · ')) {
    const publicID = caption.slice('Cloudinary · '.length).trim()
    if (publicID) return `/api/cloudinary-frame/${encodePath(`${publicID}.${extensionOf(media.filename)}`)}`
  }

  if (caption.startsWith('Cloudinary URL · ')) {
    const url = caption.slice('Cloudinary URL · '.length).trim()
    if (/^https:\/\//i.test(url)) return url
  }

  if (caption.startsWith('Vercel Blob privado')) {
    const pathname = [media.prefix, media.filename].filter(Boolean).join('/')
    if (pathname) return `/api/blob-frame/${encodePath(pathname)}`
  }

  return null
}

export const getMediaURL = (media: MediaLike, size?: string): string | null => {
  if (!media || typeof media !== 'object') return null

  const resolvedProviderURL = providerURL(media)
  if (resolvedProviderURL) return resolvedProviderURL

  if (size && media.sizes?.[size]?.url) return media.sizes[size]?.url || null
  return media.url || null
}

export const getMediaAlt = (media: MediaLike, fallback = ''): string => {
  if (!media || typeof media !== 'object') return fallback
  return media.alt || fallback
}
