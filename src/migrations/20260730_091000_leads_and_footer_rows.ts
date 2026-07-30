import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS "leads"
      ADD COLUMN IF NOT EXISTS "privacy_consent" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "consent_version" varchar;
  `)

  await db.execute(sql`
    ALTER TABLE IF EXISTS "footer_legal_links"
      ADD COLUMN IF NOT EXISTS "_uuid" varchar;
    CREATE INDEX IF NOT EXISTS "footer_legal_links_uuid_idx" ON "footer_legal_links" ("_uuid");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS "leads"
      DROP COLUMN IF EXISTS "privacy_consent",
      DROP COLUMN IF EXISTS "consent_version";
    ALTER TABLE IF EXISTS "footer_legal_links"
      DROP COLUMN IF EXISTS "_uuid";
  `)
}
