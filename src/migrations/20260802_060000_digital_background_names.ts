import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Removes the last construction-oriented labels from Background records.
 * The slug and frame relationships remain unchanged so published pages keep
 * using the same cinematic sequence.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "backgrounds"
    SET
      "name" = CASE
        WHEN "slug" = 'home' THEN 'Experiencia digital — Home'
        ELSE 'Experiencia digital'
      END,
      "updated_at" = NOW()
    WHERE
      lower(trim(coalesce("name", ''))) IN ('casa', 'home casa', 'construcción', 'construccion')
      OR coalesce("name", '') ~* '(construcci|vivienda|obra|remodelaci|casa)';
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // No se restaura terminología de construcción eliminada intencionalmente.
}
