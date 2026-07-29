import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

type DrizzleLike = {
  execute: (statement: unknown) => Promise<unknown>
}

type PayloadSchemaAdapter = {
  drizzle: DrizzleLike
  extensions?: Record<string, boolean>
  requireDrizzleKit?: () => {
    pushSchema: (
      schema: unknown,
      drizzle: DrizzleLike,
      schemaNames?: string[],
      tablesFilter?: string[],
      extensionsFilter?: string[],
    ) => Promise<{ statementsToExecute: string[] }>
  }
  schema: unknown
  schemaName?: string
  tablesFilter?: string[]
}

let schemaReady: Promise<void> | null = null

function isDestructiveSchemaStatement(statement: string): boolean {
  return /\b(DROP|DELETE|TRUNCATE|RENAME)\b|\bALTER\s+COLUMN\b/i.test(statement)
}

/**
 * Adds the Payload tables and columns introduced by the current application
 * schema without executing a destructive clean-up from Drizzle's diff.
 *
 * This runs on the first authenticated admin/API request, rather than inside
 * a Vercel build. It means a preview build can never mutate the shared data
 * store, and a legacy populated column can never block delivery of an
 * additive editor upgrade.
 */
export async function synchronizeAdditivePayloadSchema(payload: Payload): Promise<void> {
  const adapter = payload.db as unknown as PayloadSchemaAdapter
  if (!adapter.drizzle || !adapter.requireDrizzleKit) return

  const { pushSchema } = adapter.requireDrizzleKit()
  const result = await pushSchema(
    adapter.schema,
    adapter.drizzle,
    adapter.schemaName ? [adapter.schemaName] : undefined,
    adapter.tablesFilter,
    adapter.extensions?.postgis ? ['postgis'] : undefined,
  )

  const safeStatements = result.statementsToExecute.filter(
    (statement) => !isDestructiveSchemaStatement(statement),
  )
  const skippedStatements = result.statementsToExecute.length - safeStatements.length

  for (const statement of safeStatements) {
    await adapter.drizzle.execute(sql.raw(statement))
  }

  if (skippedStatements > 0) {
    payload.logger.warn(
      `FabrickBuild conservó ${skippedStatements} cambio(s) destructivo(s) heredado(s) del esquema. No se eliminó contenido.`,
    )
  }
}

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
    sql`
      ALTER TABLE IF EXISTS "media"
      ADD COLUMN IF NOT EXISTS "storage_integration_i_d" varchar;
    `,
    sql`
      ALTER TABLE IF EXISTS "media"
      ADD COLUMN IF NOT EXISTS "storage_visibility" varchar DEFAULT 'private';
    `,
    sql`CREATE INDEX IF NOT EXISTS "media_storage_provider_idx" ON "media" ("storage_provider");`,
    sql`CREATE INDEX IF NOT EXISTS "media_storage_key_idx" ON "media" ("storage_key");`,
    sql`CREATE INDEX IF NOT EXISTS "media_storage_folder_idx" ON "media" ("storage_folder");`,
    // Page-wide visual controls are intentionally additive so existing Pages
    // keep their layout while gaining a global background and typography.
    sql`ALTER TABLE IF EXISTS "pages" ADD COLUMN IF NOT EXISTS "page_appearance" jsonb;`,
    sql`ALTER TABLE IF EXISTS "pages" ADD COLUMN IF NOT EXISTS "home_template_version" varchar;`,
    sql`ALTER TABLE IF EXISTS "_pages_v" ADD COLUMN IF NOT EXISTS "page_appearance" jsonb;`,
    sql`ALTER TABLE IF EXISTS "_pages_v" ADD COLUMN IF NOT EXISTS "home_template_version" varchar;`,
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
    sql`
      ALTER TABLE IF EXISTS "_pages_v_blocks_hero"
      ADD COLUMN IF NOT EXISTS "background_source" varchar DEFAULT 'upload';
    `,
    sql`
      ALTER TABLE IF EXISTS "_pages_v_blocks_hero"
      ADD COLUMN IF NOT EXISTS "background_u_r_l" varchar;
    `,
    sql`
      ALTER TABLE IF EXISTS "_pages_v_blocks_hero"
      ADD COLUMN IF NOT EXISTS "saved_background_id" integer;
    `,
    sql`
      CREATE INDEX IF NOT EXISTS "_pages_v_blocks_hero_saved_background_id_idx"
      ON "_pages_v_blocks_hero" ("saved_background_id");
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
      '_pages_v_blocks_hero',
      '_pages_v_blocks_services_grid',
      '_pages_v_blocks_projects_grid',
      '_pages_v_blocks_content',
      '_pages_v_blocks_stats',
      '_pages_v_blocks_testimonials',
      '_pages_v_blocks_before_after',
      '_pages_v_blocks_cta',
      '_pages_v_blocks_contact_form',
      '_pages_v_blocks_reusable_component',
    ].map((table) => sql.raw(`ALTER TABLE IF EXISTS "${table}" ADD COLUMN IF NOT EXISTS "appearance" jsonb;`)),
  ]

  for (const statement of statements) await drizzle.execute(statement)
  await synchronizeAdditivePayloadSchema(payload)
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
