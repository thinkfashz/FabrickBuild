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
    // Payload includes every collection in its document-lock relation query.
    // Products was introduced after the original database, so its relation
    // must exist before any document (including a user) can be updated.
    sql`
      ALTER TABLE IF EXISTS "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "products_id" integer;
    `,
    sql`
      CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_backgrounds_id_idx"
      ON "payload_locked_documents_rels" ("backgrounds_id");
    `,
    sql`
      CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_products_id_idx"
      ON "payload_locked_documents_rels" ("products_id");
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
    // Fallback for the native Payload uploader when no external object store
    // has been configured yet. This avoids Vercel's non-persistent disk while
    // keeping content private behind /api/media-file/:id.
    sql`
      ALTER TABLE IF EXISTS "media"
      ADD COLUMN IF NOT EXISTS "file_data" text;
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
    // Version records prefix every field with `version_`. The earlier
    // compatibility repair added the live names here, which left the admin
    // list query failing before it could render any Page.
    sql`ALTER TABLE IF EXISTS "_pages_v" ADD COLUMN IF NOT EXISTS "version_page_appearance" jsonb;`,
    sql`ALTER TABLE IF EXISTS "_pages_v" ADD COLUMN IF NOT EXISTS "version_home_template_version" varchar;`,
    // The portfolio block was added after existing page versions had already
    // been stored. Payload queries every configured block table, even when a
    // version does not contain that block, so both live and version tables
    // must exist before opening the Pages collection.
    sql`
      CREATE TABLE IF NOT EXISTS "pages_blocks_portfolio_showcase" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL,
        "_path" varchar NOT NULL,
        "eyebrow" varchar,
        "heading" varchar,
        "highlight" varchar,
        "description" varchar,
        "primary_c_t_a_label" varchar,
        "primary_c_t_a_url" varchar,
        "secondary_c_t_a_label" varchar,
        "secondary_c_t_a_url" varchar,
        "appearance" jsonb,
        "_uuid" varchar,
        "block_name" varchar
      );
    `,
    sql`
      CREATE TABLE IF NOT EXISTS "pages_blocks_portfolio_showcase_tech_stack" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL,
        "label" varchar,
        "_uuid" varchar
      );
    `,
    sql`
      CREATE TABLE IF NOT EXISTS "pages_blocks_portfolio_showcase_projects" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL,
        "title" varchar,
        "type" varchar,
        "description" varchar,
        "image_id" integer,
        "image_u_r_l" varchar,
        "url" varchar,
        "_uuid" varchar
      );
    `,
    sql`
      CREATE TABLE IF NOT EXISTS "_pages_v_blocks_portfolio_showcase" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL,
        "_path" varchar NOT NULL,
        "eyebrow" varchar,
        "heading" varchar,
        "highlight" varchar,
        "description" varchar,
        "primary_c_t_a_label" varchar,
        "primary_c_t_a_url" varchar,
        "secondary_c_t_a_label" varchar,
        "secondary_c_t_a_url" varchar,
        "appearance" jsonb,
        "_uuid" varchar,
        "block_name" varchar
      );
    `,
    sql`
      CREATE TABLE IF NOT EXISTS "_pages_v_blocks_portfolio_showcase_tech_stack" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL,
        "label" varchar,
        "_uuid" varchar
      );
    `,
    sql`
      CREATE TABLE IF NOT EXISTS "_pages_v_blocks_portfolio_showcase_projects" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL,
        "title" varchar,
        "type" varchar,
        "description" varchar,
        "image_id" integer,
        "image_u_r_l" varchar,
        "url" varchar,
        "_uuid" varchar
      );
    `,
    ...[
      'pages_blocks_portfolio_showcase',
      'pages_blocks_portfolio_showcase_tech_stack',
      'pages_blocks_portfolio_showcase_projects',
      '_pages_v_blocks_portfolio_showcase',
      '_pages_v_blocks_portfolio_showcase_tech_stack',
      '_pages_v_blocks_portfolio_showcase_projects',
    ].map((table) =>
      sql.raw(`CREATE INDEX IF NOT EXISTS "${table}_parent_id_idx" ON "${table}" ("_parent_id");`),
    ),
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
