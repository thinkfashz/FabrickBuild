import config from '../payload.config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

async function repairMultimediaSchema(payload: Awaited<ReturnType<typeof getPayload>>) {
  const statements = [
    sql`
      ALTER TABLE IF EXISTS "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "backgrounds_id" integer;
    `,
    sql`
      CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_backgrounds_id_idx"
      ON "payload_locked_documents_rels" ("backgrounds_id");
    `,
    sql`
      ALTER TABLE IF EXISTS "pages_blocks_hero"
      ADD COLUMN IF NOT EXISTS "background_source" varchar DEFAULT 'media';
    `,
    sql`
      ALTER TABLE IF EXISTS "pages_blocks_hero"
      ADD COLUMN IF NOT EXISTS "background_u_r_l" varchar;
    `,
    sql`
      ALTER TABLE IF EXISTS "pages_blocks_hero"
      ADD COLUMN IF NOT EXISTS "saved_background_id" integer;
    `,
    sql`
      CREATE INDEX IF NOT EXISTS "pages_blocks_hero_saved_background_id_idx"
      ON "pages_blocks_hero" ("saved_background_id");
    `,
  ]

  for (const statement of statements) {
    await payload.db.drizzle.execute(statement)
  }
}

async function run() {
  const payload = await getPayload({ config })

  try {
    await repairMultimediaSchema(payload)
    payload.logger.info('REPAIR_OK: esquema multimedia y Hero verificados en PostgreSQL.')
  } finally {
    if (typeof payload.db.destroy === 'function') await payload.db.destroy()
  }
}

run().catch((error) => {
  console.error('REPAIR_FAILED: no fue posible reparar el esquema PostgreSQL.', error)
  process.exitCode = 1
})
