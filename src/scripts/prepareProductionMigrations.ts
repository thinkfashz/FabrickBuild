import config from '@payload-config'
import { getPayload } from 'payload'

const databaseErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object') return undefined
  const record = error as { code?: string; cause?: unknown; originalError?: unknown }
  return record.code || databaseErrorCode(record.cause) || databaseErrorCode(record.originalError)
}

async function run() {
  const payload = await getPayload({ config })

  try {
    const deleted = await payload.delete({
      collection: 'payload-migrations',
      where: { batch: { equals: -1 } },
      overrideAccess: true,
    })

    const remaining = await payload.count({
      collection: 'payload-migrations',
      where: { batch: { equals: -1 } },
      overrideAccess: true,
    })

    if (remaining.totalDocs > 0) {
      throw new Error(`MIGRATION_PREPARE_FAILED: permanecen ${remaining.totalDocs} marcadores batch=-1.`)
    }

    const removed = Array.isArray((deleted as { docs?: unknown[] }).docs)
      ? (deleted as { docs: unknown[] }).docs.length
      : 0

    payload.logger.info(`MIGRATION_PREPARED: ${removed} marcador(es) de desarrollo eliminado(s).`)
  } catch (error) {
    if (databaseErrorCode(error) === '42P01') {
      payload.logger.info('MIGRATION_PREPARED: la tabla de migraciones aún no existe; no fue necesario limpiarla.')
    } else {
      throw error
    }
  } finally {
    if (typeof payload.db.destroy === 'function') await payload.db.destroy()
  }
}

run().catch((error) => {
  console.error('MIGRATION_PREPARE_FAILED: no fue posible preparar PostgreSQL.', error)
  process.exitCode = 1
})
