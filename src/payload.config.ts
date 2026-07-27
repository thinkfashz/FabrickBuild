import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { AIChanges } from '@/collections/AIChanges'
import { Integrations } from '@/collections/Integrations'
import { Leads } from '@/collections/Leads'
import { Media } from '@/collections/Media'
import { Pages } from '@/collections/Pages'
import { Projects } from '@/collections/Projects'
import { Services } from '@/collections/Services'
import { Testimonials } from '@/collections/Testimonials'
import { Users } from '@/collections/Users'
import { Footer } from '@/globals/Footer'
import { Header } from '@/globals/Header'
import { SiteSettings } from '@/globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const isAndroid = process.platform === 'android'

let sharpInstance: any
if (!isAndroid) {
  try {
    const sharpModule = (await import('sharp')) as any
    sharpInstance = sharpModule.default ?? sharpModule
  } catch (error) {
    console.warn('Sharp no está disponible. Se desactiva el procesamiento de imágenes.', error)
  }
}

const deploymentURL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined
const serverURL =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  deploymentURL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')

const allowedOrigins = Array.from(
  new Set([serverURL, deploymentURL, 'http://localhost:3000'].filter(Boolean) as string[]),
)

function normalizePostgresSSLMode(connectionString: string): string {
  try {
    const url = new URL(connectionString)
    const mode = url.searchParams.get('sslmode')
    if (mode && ['prefer', 'require', 'verify-ca'].includes(mode)) {
      url.searchParams.set('sslmode', 'verify-full')
    }
    return url.toString()
  } catch {
    return connectionString
  }
}

const rawDatabaseURL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5432/fabrickbuild'
const databaseURL = normalizePostgresSSLMode(rawDatabaseURL)

const blobToken =
  process.env.BLOB_READ_WRITE_TOKEN ||
  process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— FabrickBuild CMS',
    },
    components: {
      beforeDashboard: ['@/components/admin/BeforeDashboard'],
    },
    livePreview: {
      breakpoints: [
        { label: 'Móvil', name: 'mobile', width: 390, height: 844 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Escritorio', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
  editor: lexicalEditor({}),
  db: postgresAdapter({
    pool: {
      connectionString: databaseURL,
    },
  }),
  collections: [
    Users,
    Media,
    Pages,
    Services,
    Projects,
    Testimonials,
    Leads,
    Integrations,
    AIChanges,
  ],
  globals: [Header, Footer, SiteSettings],
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(blobToken),
      collections: {
        media: {
          prefix: 'fabrickbuild',
        },
      },
      clientUploads: true,
      token: blobToken,
    }),
  ],
  cors: allowedOrigins,
  csrf: allowedOrigins,
  maxDepth: 4,
  secret: process.env.PAYLOAD_SECRET || 'fabrickbuild-development-secret-change-in-production',
  serverURL,
  ...(sharpInstance ? { sharp: sharpInstance } : {}),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
