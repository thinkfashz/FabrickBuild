import config from '@payload-config'
import { createHash } from 'node:crypto'
import { getPayload } from 'payload'

function databaseFingerprint() {
  const raw =
    process.env.PAYLOAD_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    ''

  if (!raw) return 'sin-conexion'

  try {
    const url = new URL(raw)
    const stableTarget = `${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}`
    return createHash('sha256').update(stableTarget).digest('hex').slice(0, 12)
  } catch {
    return createHash('sha256').update(raw).digest('hex').slice(0, 12)
  }
}

async function run() {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'pages',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
  })

  payload.logger.info(
    `[database] Preview conectado en modo lectura. Huella ${databaseFingerprint()}; páginas accesibles: ${result.docs.length}.`,
  )

  if (typeof payload.db.destroy === 'function') await payload.db.destroy()
  process.exit(0)
}

run().catch((error) => {
  console.error('[database] La conexión compartida de Preview no pudo validarse.', error)
  process.exit(1)
})
