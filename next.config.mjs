import { withPayload } from '@payloadcms/next/withPayload'

const privateHeaders = [
  { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
  { key: 'Pragma', value: 'no-cache' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
]

const previewHeaders = privateHeaders.map((header) =>
  header.key === 'X-Frame-Options' ? { ...header, value: 'SAMEORIGIN' } : header,
)

const publicMediaHeaders = [
  { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800, immutable' },
  { key: 'CDN-Cache-Control', value: 'public, s-maxage=31536000, stale-while-revalidate=604800' },
  { key: 'Vercel-CDN-Cache-Control', value: 'public, s-maxage=31536000, stale-while-revalidate=604800' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
]

const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000,
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1280, 1440, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: '**.vercel.app' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  poweredByHeader: false,
  compress: true,
  async redirects() {
    return [
      {
        source: '/studio/editor',
        destination: '/admin/collections/pages',
        permanent: true,
      },
      {
        source: '/studio/editor/:path*',
        destination: '/admin/collections/pages',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      { source: '/frames/:path*', headers: publicMediaHeaders },
      { source: '/api/blob-frame/:path*', headers: publicMediaHeaders },
      { source: '/api/media/file/:path*', headers: publicMediaHeaders },
      { source: '/preview-page/:path*', headers: previewHeaders },
      { source: '/studio/:path*', headers: privateHeaders },
      { source: '/api/public/leads', headers: privateHeaders },
      { source: '/api/integrations/:path*', headers: privateHeaders },
      { source: '/api/ai/:path*', headers: privateHeaders },
    ]
  },
}

export default withPayload(nextConfig)
