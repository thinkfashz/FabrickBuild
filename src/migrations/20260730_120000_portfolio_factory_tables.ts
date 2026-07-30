import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Restores the block tables used by the approved portfolio factory preset.
 * This migration is additive and idempotent: it does not rewrite Pages or
 * remove any of the existing construction blocks.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
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

    CREATE TABLE IF NOT EXISTS "pages_blocks_portfolio_showcase_tech_stack" (
      "id" serial PRIMARY KEY,
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "label" varchar,
      "_uuid" varchar
    );

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

    CREATE TABLE IF NOT EXISTS "_pages_v_blocks_portfolio_showcase_tech_stack" (
      "id" serial PRIMARY KEY,
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "label" varchar,
      "_uuid" varchar
    );

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
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "pages_blocks_portfolio_showcase_order_idx"
      ON "pages_blocks_portfolio_showcase" ("_order");
    CREATE INDEX IF NOT EXISTS "pages_blocks_portfolio_showcase_parent_id_idx"
      ON "pages_blocks_portfolio_showcase" ("_parent_id");
    CREATE INDEX IF NOT EXISTS "pages_blocks_portfolio_showcase_path_idx"
      ON "pages_blocks_portfolio_showcase" ("_path");

    CREATE INDEX IF NOT EXISTS "pages_blocks_portfolio_showcase_tech_stack_order_idx"
      ON "pages_blocks_portfolio_showcase_tech_stack" ("_order");
    CREATE INDEX IF NOT EXISTS "pages_blocks_portfolio_showcase_tech_stack_parent_id_idx"
      ON "pages_blocks_portfolio_showcase_tech_stack" ("_parent_id");

    CREATE INDEX IF NOT EXISTS "pages_blocks_portfolio_showcase_projects_order_idx"
      ON "pages_blocks_portfolio_showcase_projects" ("_order");
    CREATE INDEX IF NOT EXISTS "pages_blocks_portfolio_showcase_projects_parent_id_idx"
      ON "pages_blocks_portfolio_showcase_projects" ("_parent_id");
    CREATE INDEX IF NOT EXISTS "pages_blocks_portfolio_showcase_projects_image_idx"
      ON "pages_blocks_portfolio_showcase_projects" ("image_id");

    CREATE INDEX IF NOT EXISTS "_pages_v_blocks_portfolio_showcase_order_idx"
      ON "_pages_v_blocks_portfolio_showcase" ("_order");
    CREATE INDEX IF NOT EXISTS "_pages_v_blocks_portfolio_showcase_parent_id_idx"
      ON "_pages_v_blocks_portfolio_showcase" ("_parent_id");
    CREATE INDEX IF NOT EXISTS "_pages_v_blocks_portfolio_showcase_path_idx"
      ON "_pages_v_blocks_portfolio_showcase" ("_path");

    CREATE INDEX IF NOT EXISTS "_pages_v_blocks_portfolio_showcase_tech_stack_order_idx"
      ON "_pages_v_blocks_portfolio_showcase_tech_stack" ("_order");
    CREATE INDEX IF NOT EXISTS "_pages_v_blocks_portfolio_showcase_tech_stack_parent_id_idx"
      ON "_pages_v_blocks_portfolio_showcase_tech_stack" ("_parent_id");

    CREATE INDEX IF NOT EXISTS "_pages_v_blocks_portfolio_showcase_projects_order_idx"
      ON "_pages_v_blocks_portfolio_showcase_projects" ("_order");
    CREATE INDEX IF NOT EXISTS "_pages_v_blocks_portfolio_showcase_projects_parent_id_idx"
      ON "_pages_v_blocks_portfolio_showcase_projects" ("_parent_id");
    CREATE INDEX IF NOT EXISTS "_pages_v_blocks_portfolio_showcase_projects_image_idx"
      ON "_pages_v_blocks_portfolio_showcase_projects" ("image_id");
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "pages_blocks_portfolio_showcase"
        ADD CONSTRAINT "pages_blocks_portfolio_showcase_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade;
    EXCEPTION WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "pages_blocks_portfolio_showcase_tech_stack"
        ADD CONSTRAINT "pages_blocks_portfolio_showcase_tech_stack_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_portfolio_showcase"("id") ON DELETE cascade;
    EXCEPTION WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "pages_blocks_portfolio_showcase_projects"
        ADD CONSTRAINT "pages_blocks_portfolio_showcase_projects_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_portfolio_showcase"("id") ON DELETE cascade;
    EXCEPTION WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "pages_blocks_portfolio_showcase_projects"
        ADD CONSTRAINT "pages_blocks_portfolio_showcase_projects_image_id_fk"
        FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE set null;
    EXCEPTION WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "_pages_v_blocks_portfolio_showcase"
        ADD CONSTRAINT "_pages_v_blocks_portfolio_showcase_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade;
    EXCEPTION WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "_pages_v_blocks_portfolio_showcase_tech_stack"
        ADD CONSTRAINT "_pages_v_blocks_portfolio_showcase_tech_stack_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_portfolio_showcase"("id") ON DELETE cascade;
    EXCEPTION WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "_pages_v_blocks_portfolio_showcase_projects"
        ADD CONSTRAINT "_pages_v_blocks_portfolio_showcase_projects_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_portfolio_showcase"("id") ON DELETE cascade;
    EXCEPTION WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "_pages_v_blocks_portfolio_showcase_projects"
        ADD CONSTRAINT "_pages_v_blocks_portfolio_showcase_projects_image_id_fk"
        FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE set null;
    EXCEPTION WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN NULL;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "_pages_v_blocks_portfolio_showcase_projects" CASCADE;
    DROP TABLE IF EXISTS "_pages_v_blocks_portfolio_showcase_tech_stack" CASCADE;
    DROP TABLE IF EXISTS "_pages_v_blocks_portfolio_showcase" CASCADE;
    DROP TABLE IF EXISTS "pages_blocks_portfolio_showcase_projects" CASCADE;
    DROP TABLE IF EXISTS "pages_blocks_portfolio_showcase_tech_stack" CASCADE;
    DROP TABLE IF EXISTS "pages_blocks_portfolio_showcase" CASCADE;
  `)
}
