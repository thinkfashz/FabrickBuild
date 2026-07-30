import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

async function run() {
  const payload = await getPayload({ config })

  try {
    const result = await payload.db.drizzle.execute(sql`
      DELETE FROM "payload_migrations"
      WHERE "batch" = -1;
    `)

    payload.logger.info(
      `MIGRATION_PREPARED: marcadores de desarrollo eliminados (${String(result.rowCount || 0)}).`,
    )
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === '42P01') {
      payload.logger.info('MIGRATION_PREPARED: la tabla de migraciones aún no existe; no fue necesario limpiar marcadores.')
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
