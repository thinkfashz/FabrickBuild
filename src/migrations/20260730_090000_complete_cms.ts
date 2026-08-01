import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

const blockTables = [
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
  'pages_blocks_portfolio_showcase',
]

const versionBlockTables = [
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
  '_pages_v_blocks_portfolio_showcase',
]

async function addJSONColumn(db: MigrateUpArgs['db'], table: string, column: string) {
  await db.execute(sql.raw(`ALTER TABLE IF EXISTS "${table}" ADD COLUMN IF NOT EXISTS "${column}" jsonb;`))
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS "pages"
      ADD COLUMN IF NOT EXISTS "page_appearance" jsonb,
      ADD COLUMN IF NOT EXISTS "background_source" varchar DEFAULT 'color',
      ADD COLUMN IF NOT EXISTS "background_media_id" integer,
      ADD COLUMN IF NOT EXISTS "mobile_background_media_id" integer,
      ADD COLUMN IF NOT EXISTS "background_video_id" integer,
      ADD COLUMN IF NOT EXISTS "background_u_r_l" varchar,
      ADD COLUMN IF NOT EXISTS "saved_background_id" integer;
  `)

  await db.execute(sql`
    ALTER TABLE IF EXISTS "_pages_v"
      ADD COLUMN IF NOT EXISTS "version_page_appearance" jsonb,
      ADD COLUMN IF NOT EXISTS "version_background_source" varchar DEFAULT 'color',
      ADD COLUMN IF NOT EXISTS "version_background_media_id" integer,
      ADD COLUMN IF NOT EXISTS "version_mobile_background_media_id" integer,
      ADD COLUMN IF NOT EXISTS "version_background_video_id" integer,
      ADD COLUMN IF NOT EXISTS "version_background_u_r_l" varchar,
      ADD COLUMN IF NOT EXISTS "version_saved_background_id" integer;
  `)

  for (const table of blockTables) await addJSONColumn(db, table, 'appearance')
  for (const table of versionBlockTables) await addJSONColumn(db, table, 'appearance')

  await db.execute(sql`
    ALTER TABLE IF EXISTS "header"
      ADD COLUMN IF NOT EXISTS "logo_id" integer,
      ADD COLUMN IF NOT EXISTS "mobile_logo_id" integer,
      ADD COLUMN IF NOT EXISTS "logo_size_desktop" numeric DEFAULT 54,
      ADD COLUMN IF NOT EXISTS "logo_size_mobile" numeric DEFAULT 48,
      ADD COLUMN IF NOT EXISTS "logo_animation" varchar DEFAULT 'glow',
      ADD COLUMN IF NOT EXISTS "appearance" jsonb,
      ADD COLUMN IF NOT EXISTS "background_media_id" integer,
      ADD COLUMN IF NOT EXISTS "sticky" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "center_logo_mobile" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "show_c_t_a_mobile" boolean DEFAULT false;
  `)

  await db.execute(sql`
    ALTER TABLE IF EXISTS "footer"
      ADD COLUMN IF NOT EXISTS "logo_id" integer,
      ADD COLUMN IF NOT EXISTS "copyright_text" varchar DEFAULT 'FabrickBuild. Todos los derechos reservados.',
      ADD COLUMN IF NOT EXISTS "show_privacy_settings" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "appearance" jsonb,
      ADD COLUMN IF NOT EXISTS "background_media_id" integer;
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "footer_legal_links" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY,
      "label" varchar,
      "url" varchar
    );
    CREATE INDEX IF NOT EXISTS "footer_legal_links_order_idx" ON "footer_legal_links" ("_order");
    CREATE INDEX IF NOT EXISTS "footer_legal_links_parent_id_idx" ON "footer_legal_links" ("_parent_id");
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "footer_legal_links"
        ADD CONSTRAINT "footer_legal_links_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN NULL;
    END $$;
  `)

  await db.execute(sql`
    ALTER TABLE IF EXISTS "site_settings"
      ADD COLUMN IF NOT EXISTS "mobile_logo_id" integer,
      ADD COLUMN IF NOT EXISTS "homepage_experience" varchar DEFAULT 'luxury',
      ADD COLUMN IF NOT EXISTS "hide_first_hero_when_luxury" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "loader_enabled" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "loader_logo_id" integer,
      ADD COLUMN IF NOT EXISTS "loader_text" varchar DEFAULT 'Preparando tu experiencia',
      ADD COLUMN IF NOT EXISTS "loader_animation" varchar DEFAULT 'glow',
      ADD COLUMN IF NOT EXISTS "loader_background_color" varchar DEFAULT '#10110f',
      ADD COLUMN IF NOT EXISTS "loader_foreground_color" varchar DEFAULT '#f4c84b',
      ADD COLUMN IF NOT EXISTS "loader_minimum_duration" numeric DEFAULT 450,
      ADD COLUMN IF NOT EXISTS "loader_maximum_duration" numeric DEFAULT 4000,
      ADD COLUMN IF NOT EXISTS "consent_enabled" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "consent_version" varchar DEFAULT '2026-07',
      ADD COLUMN IF NOT EXISTS "consent_title" varchar DEFAULT 'Tu privacidad importa',
      ADD COLUMN IF NOT EXISTS "consent_message" varchar,
      ADD COLUMN IF NOT EXISTS "consent_accept_all_label" varchar DEFAULT 'Aceptar todo',
      ADD COLUMN IF NOT EXISTS "consent_reject_optional_label" varchar DEFAULT 'Solo necesarias',
      ADD COLUMN IF NOT EXISTS "consent_settings_label" varchar DEFAULT 'Configurar',
      ADD COLUMN IF NOT EXISTS "consent_save_label" varchar DEFAULT 'Guardar preferencias',
      ADD COLUMN IF NOT EXISTS "consent_privacy_u_r_l" varchar DEFAULT '/privacidad',
      ADD COLUMN IF NOT EXISTS "consent_cookies_u_r_l" varchar DEFAULT '/cookies',
      ADD COLUMN IF NOT EXISTS "consent_terms_u_r_l" varchar DEFAULT '/terminos',
      ADD COLUMN IF NOT EXISTS "performance_public_revalidate_seconds" numeric DEFAULT 300,
      ADD COLUMN IF NOT EXISTS "performance_initial_frame_preload" numeric DEFAULT 5,
      ADD COLUMN IF NOT EXISTS "performance_frame_batch_size" numeric DEFAULT 6,
      ADD COLUMN IF NOT EXISTS "performance_respect_reduced_motion" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "performance_respect_save_data" boolean DEFAULT true;
  `)

  await db.execute(sql`
    ALTER TABLE IF EXISTS "reusable_components"
      ADD COLUMN IF NOT EXISTS "kind" varchar DEFAULT 'layout',
      ADD COLUMN IF NOT EXISTS "animated_content_eyebrow" varchar,
      ADD COLUMN IF NOT EXISTS "animated_content_heading" varchar,
      ADD COLUMN IF NOT EXISTS "animated_content_body" varchar,
      ADD COLUMN IF NOT EXISTS "animated_content_media_id" integer,
      ADD COLUMN IF NOT EXISTS "animated_content_button_label" varchar,
      ADD COLUMN IF NOT EXISTS "animated_content_button_u_r_l" varchar DEFAULT '#contacto',
      ADD COLUMN IF NOT EXISTS "animated_content_surface" varchar DEFAULT 'glass',
      ADD COLUMN IF NOT EXISTS "animated_content_animation_preset" varchar DEFAULT 'fade-up',
      ADD COLUMN IF NOT EXISTS "animated_content_animation_duration" numeric DEFAULT 700;
  `)

  await db.execute(sql`
    ALTER TABLE IF EXISTS "backgrounds"
      ADD COLUMN IF NOT EXISTS "performance" jsonb;
  `)

  await db.execute(sql`
    ALTER TABLE IF EXISTS "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "backgrounds_id" integer,
      ADD COLUMN IF NOT EXISTS "reusable_components_id" integer;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_backgrounds_id_idx"
      ON "payload_locked_documents_rels" ("backgrounds_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_reusable_components_id_idx"
      ON "payload_locked_documents_rels" ("reusable_components_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "pages_background_media_idx" ON "pages" ("background_media_id");
    CREATE INDEX IF NOT EXISTS "pages_mobile_background_media_idx" ON "pages" ("mobile_background_media_id");
    CREATE INDEX IF NOT EXISTS "pages_background_video_idx" ON "pages" ("background_video_id");
    CREATE INDEX IF NOT EXISTS "pages_saved_background_idx" ON "pages" ("saved_background_id");
    CREATE INDEX IF NOT EXISTS "reusable_components_kind_idx" ON "reusable_components" ("kind");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "footer_legal_links" CASCADE;`)

  for (const table of blockTables) {
    await db.execute(sql.raw(`ALTER TABLE IF EXISTS "${table}" DROP COLUMN IF EXISTS "appearance";`))
  }
  for (const table of versionBlockTables) {
    await db.execute(sql.raw(`ALTER TABLE IF EXISTS "${table}" DROP COLUMN IF EXISTS "appearance";`))
  }

  await db.execute(sql`
    ALTER TABLE IF EXISTS "pages"
      DROP COLUMN IF EXISTS "page_appearance",
      DROP COLUMN IF EXISTS "background_source",
      DROP COLUMN IF EXISTS "background_media_id",
      DROP COLUMN IF EXISTS "mobile_background_media_id",
      DROP COLUMN IF EXISTS "background_video_id",
      DROP COLUMN IF EXISTS "background_u_r_l",
      DROP COLUMN IF EXISTS "saved_background_id";
  `)
  await db.execute(sql`
    ALTER TABLE IF EXISTS "_pages_v"
      DROP COLUMN IF EXISTS "version_page_appearance",
      DROP COLUMN IF EXISTS "version_background_source",
      DROP COLUMN IF EXISTS "version_background_media_id",
      DROP COLUMN IF EXISTS "version_mobile_background_media_id",
      DROP COLUMN IF EXISTS "version_background_video_id",
      DROP COLUMN IF EXISTS "version_background_u_r_l",
      DROP COLUMN IF EXISTS "version_saved_background_id";
  `)
}
