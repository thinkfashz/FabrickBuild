import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor, TextStateFeature } from '@payloadcms/richtext-lexical'
import { es } from '@payloadcms/translations/languages/es'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { AIChanges } from '@/collections/AIChanges'
import { Backgrounds } from '@/collections/Backgrounds'
import { Integrations } from '@/collections/Integrations'
import { Leads } from '@/collections/Leads'
import { Media } from '@/collections/Media'
import { Pages } from '@/collections/Pages'
import { Projects } from '@/collections/Projects'
import { Products } from '@/collections/Products'
import { ReusableComponents } from '@/collections/ReusableComponents'
import { Services } from '@/collections/Services'
import { Testimonials } from '@/collections/Testimonials'
import { Users } from '@/collections/Users'
import { Footer } from '@/globals/Footer'
import { Header } from '@/globals/Header'
import { SiteSettings } from '@/globals/SiteSettings'
import { textStateConfig } from '@/fields/textStateConfig'

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

export default buildConfig({
  // Rendering the admin in Spanish prevents Chrome Translate from mutating
  // React-managed nodes (the source of the client-side removeChild error).
  i18n: {
    fallbackLanguage: 'es',
    supportedLanguages: { es },
  },
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— FabrickBuild CMS',
    },
    components: {
      beforeNavLinks: ['@/components/admin/AdminStudioNav'],
      beforeDashboard: ['@/components/admin/BeforeDashboard'],
    },
    livePreview: {
      // The Pages collection supplies the dynamic URL. Declaring the
      // collection here guarantees the native Payload toggle is available in
      // every document view, including documents created on mobile.
      collections: ['pages'],
      breakpoints: [
        { label: 'Móvil', name: 'mobile', width: 390, height: 844 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Escritorio', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
  // The floating Payload toolbar now lets the editor select only part of a
  // sentence and apply an approved color. This is intentionally a palette,
  // not arbitrary CSS, so public rendering is predictable and safe.
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures,
      TextStateFeature({ state: textStateConfig }),
    ],
  }),
  db: postgresAdapter({
    pool: {
      connectionString: databaseURL,
    },
  }),
  collections: [
    Users,
    Media,
    Backgrounds,
    Pages,
    Services,
    Projects,
    Products,
    Testimonials,
    Leads,
    Integrations,
    AIChanges,
    ReusableComponents,
  ],
  globals: [Header, Footer, SiteSettings],
  // Payload's current Vercel Blob adapter only supports public stores. The
  // application uploader below supports both public and private stores and
  // keeps PostgreSQL as the source of truth for every asset.
  plugins: [],
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
