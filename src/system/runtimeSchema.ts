import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

type DrizzleLike = {
  execute: (statement: unknown) => Promise<unknown>
}

let schemaReady: Promise<void> | null = null

/**
 * Additive compatibility repair for installations that were deployed before
 * the multimedia and visual-editor fields existed. Every statement is
 * idempotent; it never removes columns or touches user content.
 */
async function repairSchema(payload: Payload): Promise<void> {
  const drizzle = (payload.db as unknown as { drizzle?: DrizzleLike }).drizzle
  if (!drizzle) throw new Error('No se pudo abrir la conexión PostgreSQL para verificar el esquema.')

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
      ALTER TABLE IF EXISTS "media"
      ADD COLUMN IF NOT EXISTS "storage_provider" varchar DEFAULT 'database';
    `,
    sql`
      ALTER TABLE IF EXISTS "media"
      ADD COLUMN IF NOT EXISTS "external_u_r_l" varchar;
    `,
    sql`
      ALTER TABLE IF EXISTS "media"
      ADD COLUMN IF NOT EXISTS "storage_key" varchar;
    `,
    sql`
      ALTER TABLE IF EXISTS "media"
      ADD COLUMN IF NOT EXISTS "storage_folder" varchar DEFAULT 'general';
    `,
    sql`CREATE INDEX IF NOT EXISTS "media_storage_provider_idx" ON "media" ("storage_provider");`,
    sql`CREATE INDEX IF NOT EXISTS "media_storage_key_idx" ON "media" ("storage_key");`,
    sql`CREATE INDEX IF NOT EXISTS "media_storage_folder_idx" ON "media" ("storage_folder");`,
    sql`
      ALTER TABLE IF EXISTS "pages_blocks_hero"
      ADD COLUMN IF NOT EXISTS "background_source" varchar DEFAULT 'upload';
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
    ...[
      'pages_blocks_hero',
      'pages_blocks_services_grid',
      'pages_blocks_projects_grid',
      'pages_blocks_content',
      'pages_blocks_stats',
      'pages_blocks_testimonials',
      'pages_blocks_before_after',
      'pages_blocks_cta',
      'pages_blocks_contact_form',
      'pages_blocks_reusable_component',
    ].map((table) => sql.raw(`ALTER TABLE IF EXISTS "${table}" ADD COLUMN IF NOT EXISTS "appearance" jsonb;`)),
  ]

  for (const statement of statements) await drizzle.execute(statement)
}

export function ensureRuntimeSchema(payload: Payload): Promise<void> {
  if (!schemaReady) {
    schemaReady = repairSchema(payload).catch((error) => {
      schemaReady = null
      throw error
    })
  }
  return schemaReady
}
