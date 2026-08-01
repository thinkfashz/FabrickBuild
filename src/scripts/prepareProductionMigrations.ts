import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

const databaseErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object') return undefined
  const record = error as { code?: string; cause?: unknown; originalError?: unknown }
  return record.code || databaseErrorCode(record.cause) || databaseErrorCode(record.originalError)
}

async function repairBackgroundSchema(payload: Awaited<ReturnType<typeof getPayload>>) {
  const statements = [
    sql`
      ALTER TABLE IF EXISTS "backgrounds"
      ADD COLUMN IF NOT EXISTS "video_id" integer;
    `,
    sql`
      ALTER TABLE IF EXISTS "backgrounds"
      ADD COLUMN IF NOT EXISTS "image_id" integer;
    `,
    sql`
      ALTER TABLE IF EXISTS "backgrounds"
      ADD COLUMN IF NOT EXISTS "external_u_r_l" varchar;
    `,
    sql`
      CREATE INDEX IF NOT EXISTS "backgrounds_video_id_idx"
      ON "backgrounds" ("video_id");
    `,
    sql`
      CREATE INDEX IF NOT EXISTS "backgrounds_image_id_idx"
      ON "backgrounds" ("image_id");
    `,
    sql`
      CREATE TABLE IF NOT EXISTS "pages_background_experiences" (
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL,
        "id" varchar PRIMARY KEY NOT NULL,
        "label" varchar,
        "background_id" integer,
        "enabled" boolean DEFAULT true,
        "scroll_axis" varchar DEFAULT 'vertical',
        "playback_direction" varchar DEFAULT 'forward',
        "viewport_length" numeric DEFAULT 3
      );
    `,
    sql`
      CREATE INDEX IF NOT EXISTS "pages_background_experiences_order_idx"
      ON "pages_background_experiences" ("_order");
    `,
    sql`
      CREATE INDEX IF NOT EXISTS "pages_background_experiences_parent_id_idx"
      ON "pages_background_experiences" ("_parent_id");
    `,
    sql`
      CREATE INDEX IF NOT EXISTS "pages_background_experiences_background_id_idx"
      ON "pages_background_experiences" ("background_id");
    `,
  ]

  for (const statement of statements) {
    await payload.db.drizzle.execute(statement)
  }

  payload.logger.info('MIGRATION_SCHEMA_READY: backgrounds y experiencias de página verificados.')
}

async function run() {
  const payload = await getPayload({ config })

  try {
    await repairBackgroundSchema(payload)

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

try {
  await run()
} catch (error) {
  console.error('MIGRATION_PREPARE_FAILED: no fue posible preparar PostgreSQL.', error)
  process.exitCode = 1
}
