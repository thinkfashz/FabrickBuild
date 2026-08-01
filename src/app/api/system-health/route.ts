import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Check = {
  id: string
  label: string
  status: 'connected' | 'warning' | 'disconnected'
  latency?: number
  detail: string
  solution?: string
}

const now = () => Date.now()

export async function GET() {
  const startedAt = now()
  const checks: Check[] = []

  checks.push({
    id: 'next',
    label: 'Next.js 16',
    status: 'connected',
    latency: 0,
    detail: 'Servidor y App Router respondiendo.',
  })

  checks.push({
    id: 'blob',
    label: 'Vercel Blob',
    status: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN ? 'connected' : 'disconnected',
    detail: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN
      ? 'Token privado detectado. La subida debe usar una ruta autenticada compatible con Blob privado.'
      : 'No se encontró BLOB_READ_WRITE_TOKEN.',
    solution: 'Configura BLOB_READ_WRITE_TOKEN en Vercel y vuelve a desplegar.',
  })

  checks.push({
    id: 'database-env',
    label: 'PostgreSQL',
    status: process.env.PAYLOAD_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL ? 'connected' : 'disconnected',
    detail: process.env.PAYLOAD_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL
      ? 'Variable de conexión disponible.'
      : 'No existe una variable de conexión de base de datos.',
    solution: 'Configura PAYLOAD_DATABASE_URL o POSTGRES_URL.',
  })

  const databaseStart = now()
  try {
    const payload = await getPayload({ config })
    await payload.find({ collection: 'media', limit: 1, depth: 0, overrideAccess: true })
    checks.push({
      id: 'payload',
      label: 'Payload CMS',
      status: 'connected',
      latency: now() - databaseStart,
      detail: 'Payload y la colección Multimedia responden correctamente.',
    })
  } catch (error) {
    checks.push({
      id: 'payload',
      label: 'Payload CMS',
      status: 'disconnected',
      latency: now() - databaseStart,
      detail: error instanceof Error ? error.message : 'No fue posible consultar Payload.',
      solution: 'Revisa la conexión PostgreSQL, las migraciones y PAYLOAD_SECRET.',
    })
  }

  checks.push({
    id: 'animation',
    label: 'GSAP · Three.js · Anime.js',
    status: 'connected',
    detail: 'Motores visuales incluidos en el proyecto.',
  })

  checks.push({
    id: 'react',
    label: 'React 19',
    status: 'connected',
    detail: 'Interfaz administrativa y frontend activos.',
  })

  const responseTime = now() - startedAt
  return Response.json({
    ok: checks.every((check) => check.status !== 'disconnected'),
    generatedAt: new Date().toISOString(),
    responseTime,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'local',
    region: process.env.VERCEL_REGION || 'local',
    checks,
    performance: {
      apiResponseMs: responseTime,
      rating: responseTime < 250 ? 'rápida' : responseTime < 700 ? 'aceptable' : 'lenta',
    },
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
