import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import path from 'path'
import { buildConfig, type CollectionAfterChangeHook, type CollectionConfig, type GlobalConfig } from 'payload'
import { fileURLToPath } from 'url'

import { AIChanges } from '@/collections/AIChanges'
import { Backgrounds } from '@/collections/Backgrounds'
import { Integrations } from '@/collections/Integrations'
import { Leads } from '@/collections/Leads'
import { Media } from '@/collections/Media'
import { Pages } from '@/collections/Pages'
import { Projects } from '@/collections/Projects'
import { ReusableComponents } from '@/collections/ReusableComponents'
import { Services } from '@/collections/Services'
import { Testimonials } from '@/collections/Testimonials'
import { Users } from '@/collections/Users'
import { Footer } from '@/globals/Footer'
import { Header } from '@/globals/Header'
import { SiteSettings } from '@/globals/SiteSettings'
import {
  revalidateBackgrounds,
  revalidateGlobals,
  revalidateMedia,
  revalidateProjects,
  revalidateServices,
  revalidateTestimonials,
} from '@/hooks/revalidateContent'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const isAndroid = process.platform === 'android'
const isVercel = Boolean(process.env.VERCEL)

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
    if (mode && ['prefer', 'require', 'verify-ca'].includes(mode)) url.searchParams.set('sslmode', 'verify-full')
    return url.toString()
  } catch {
    return connectionString
  }
}

const explicitDatabaseURL = process.env.PAYLOAD_DATABASE_URL
const databaseSource = explicitDatabaseURL
  ? 'PAYLOAD_DATABASE_URL'
  : process.env.POSTGRES_URL
    ? 'POSTGRES_URL'
    : process.env.DATABASE_URL
      ? 'DATABASE_URL'
      : 'local-fallback'
const rawDatabaseURL =
  explicitDatabaseURL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5432/fabrickbuild'
const databaseURL = normalizePostgresSSLMode(rawDatabaseURL)

const configuredPoolMax = Number(process.env.POSTGRES_POOL_MAX)
const defaultPoolMax = isVercel ? 3 : 8
const poolMax = Math.min(
  isVercel ? 6 : 20,
  Math.max(1, Number.isFinite(configuredPoolMax) ? configuredPoolMax : defaultPoolMax),
)

const configuredConnectionTimeout = Number(process.env.POSTGRES_CONNECTION_TIMEOUT_MS)
const connectionTimeoutMillis = Math.min(
  30_000,
  Math.max(
    5_000,
    Number.isFinite(configuredConnectionTimeout)
      ? configuredConnectionTimeout
      : isVercel
        ? 15_000
        : 8_000,
  ),
)

const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN

const safeDatabaseTarget = (() => {
  try {
    const url = new URL(databaseURL)
    return `${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}`
  } catch {
    return 'conexión no identificable'
  }
})()

console.info(
  `[database] Conexión seleccionada mediante ${databaseSource}: ${safeDatabaseTarget}. Pool máximo ${poolMax}; timeout ${connectionTimeoutMillis} ms.`,
)
console.info(`[storage] Vercel Blob ${blobToken ? 'habilitado' : 'no configurado'}.`)

const appendAfterChange = (collection: CollectionConfig, hook: CollectionAfterChangeHook): CollectionConfig => ({
  ...collection,
  hooks: { ...collection.hooks, afterChange: [...(collection.hooks?.afterChange || []), hook] },
})

const appendGlobalAfterChange = (global: GlobalConfig): GlobalConfig => ({
  ...global,
  hooks: { ...global.hooks, afterChange: [...(global.hooks?.afterChange || []), revalidateGlobals] },
})

const previewPageURL = (data: Record<string, unknown>) => {
  const slug = typeof data.slug === 'string' ? data.slug : 'home'
  const secret = encodeURIComponent(process.env.PREVIEW_SECRET || '')
  return `/preview-page/${encodeURIComponent(slug)}?secret=${secret}`
}

const PagesWithIsolatedPreview: CollectionConfig = {
  ...Pages,
  admin: {
    ...Pages.admin,
    components: {},
    livePreview: { url: ({ data }) => previewPageURL(data as Record<string, unknown>) },
    preview: (data) => previewPageURL(data as Record<string, unknown>),
  },
}

const BackgroundsWithLibrary: CollectionConfig = {
  ...Backgrounds,
  admin: {
    ...Backgrounds.admin,
    components: {
      ...(Backgrounds.admin?.components || {}),
      beforeListTable: ['@/components/admin/BackgroundsLibraryOverview'],
    },
  },
}

const MediaWithLibrary: CollectionConfig = {
  ...Media,
  admin: {
    ...Media.admin,
    components: {
      ...(Media.admin?.components || {}),
      beforeListTable: ['@/components/admin/MediaLibraryOverview'],
    },
  },
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: '— FabrickBuild Control Center' },
    components: {
      graphics: {
        Logo: '@/components/admin/AdminBrand#AdminLogo',
        Icon: '@/components/admin/AdminBrand#AdminIcon',
      },
      beforeLogin: ['@/components/admin/AdminLoginWelcome'],
      beforeNavLinks: ['@/components/admin/AdminStudioNav'],
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
    migrationDir: path.resolve(dirname, 'migrations'),
    push: false,
    pool: {
      connectionString: databaseURL,
      max: poolMax,
      idleTimeoutMillis: isVercel ? 5_000 : 10_000,
      connectionTimeoutMillis,
      allowExitOnIdle: true,
    },
  }),
  collections: [
    Users,
    appendAfterChange(MediaWithLibrary, revalidateMedia),
    appendAfterChange(BackgroundsWithLibrary, revalidateBackgrounds),
    PagesWithIsolatedPreview,
    appendAfterChange(Services, revalidateServices),
    appendAfterChange(Projects, revalidateProjects),
    appendAfterChange(Testimonials, revalidateTestimonials),
    Leads,
    Integrations,
    AIChanges,
    ReusableComponents,
  ],
  globals: [Header, Footer, SiteSettings].map(appendGlobalAfterChange),
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(blobToken),
      collections: {
        media: {
          prefix: 'fabrickbuild',
          disablePayloadAccessControl: true,
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
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
