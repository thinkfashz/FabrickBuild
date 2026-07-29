import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

async function ensureBackgroundRelations(payload: Awaited<ReturnType<typeof getPayload>>) {
  // Payload's admin reads this relationship while resolving document locks.
  // Older databases created before the Backgrounds collection do not have it.
  // IF NOT EXISTS keeps the build safe and repeatable across previews.
  await payload.db.drizzle.execute(sql`
    ALTER TABLE IF EXISTS "payload_locked_documents_rels"
    ADD COLUMN IF NOT EXISTS "backgrounds_id" integer;
  `)

  await payload.db.drizzle.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_backgrounds_id_idx"
    ON "payload_locked_documents_rels" ("backgrounds_id");
  `)
}

async function run() {
  const payload = await getPayload({ config })

  await ensureBackgroundRelations(payload)

  payload.logger.info('Esquema PostgreSQL de FabrickBuild sincronizado y relaciones multimedia verificadas.')

  if (typeof payload.db.destroy === 'function') await payload.db.destroy()
  process.exit(0)
}

run().catch((error) => {
  console.error('No fue posible sincronizar el esquema PostgreSQL de FabrickBuild.', error)
  process.exit(1)
})
