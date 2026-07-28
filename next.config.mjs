import { withPayload } from '@payloadcms/next/withPayload'

const privateHeaders = [
  { key: 'Cache-Control', value: 'no-store, max-age=0' },
  { key: 'Pragma', value: 'no-cache' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
]

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/studio/:path*',
        headers: privateHeaders,
      },
      {
        source: '/api/integrations/:path*',
        headers: privateHeaders,
      },
      {
        source: '/api/ai/:path*',
        headers: privateHeaders,
      },
    ]
  },
}

export default withPayload(nextConfig)
