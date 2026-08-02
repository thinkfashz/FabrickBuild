/* eslint-disable @typescript-eslint/no-explicit-any */

import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

const DIGITAL_TITLE = 'FabrickBuild | Diseño web, e-commerce, automatización e IA'
const DIGITAL_DESCRIPTION =
  'Creamos páginas web rápidas, e-commerce, automatizaciones, experiencias inmersivas e integraciones con IA para marcas y negocios en Chile.'
const DIGITAL_FOOTER =
  'Diseñamos páginas web, e-commerce y sistemas digitales que unen estrategia, movimiento, automatización e inteligencia artificial.'

const legacyPattern =
  /construcci[oó]n|construimos casas|dios construye|remodelaci[oó]n|reparaci[oó]n|radier|techumbre|gasfiter[ií]a|vivienda|obra\b/i

const replacements: Record<string, string> = {
  'Construcción inteligente en Chile': 'ESTUDIO DIGITAL INDEPENDIENTE',
  'Construimos casas.': 'Diseñamos experiencias que se sienten vivas.',
  'Dios construye hogares.': 'Diseño · código · movimiento',
  'Planificamos, construimos y remodelamos con información clara, seguimiento real y terminaciones responsables.':
    'Creamos páginas web, e-commerce y sistemas digitales que combinan claridad, velocidad, automatización e inteligencia artificial.',
  'Una solución para cada etapa de tu obra.':
    'Una solución conectada para cada etapa de tu producto.',
  'Desde una reparación puntual hasta una casa completamente nueva.':
    'Desde una landing rápida hasta un e-commerce, una automatización o una experiencia inmersiva completa.',
  'Más claridad antes, durante y después de construir.':
    'Estrategia, diseño y tecnología trabajando como un solo sistema.',
  'Conversemos antes de que una mala decisión se vuelva más costosa.':
    'Convierte una buena idea en una experiencia clara, rápida y memorable.',
  'Describe tu proyecto.': 'Cuéntanos qué quieres crear.',
  'Completa los datos principales y te contactaremos para revisar el alcance.':
    'Comparte el objetivo, el estado actual y las funciones principales. Te responderemos con una ruta clara.',
  'FabrickBuild | Construcción inteligente': DIGITAL_TITLE,
  'Construcción, remodelación y reparación con planificación, transparencia y calidad.':
    DIGITAL_DESCRIPTION,
  'FabrickBuild | Construcción, remodelación y reparación': DIGITAL_TITLE,
  'Construcción de casas, remodelaciones, radieres, techumbres, electricidad, gasfitería y soluciones integrales.':
    'Páginas web rápidas, e-commerce, automatizaciones, experiencias inmersivas e integraciones con inteligencia artificial.',
}

const serviceReplacement: Record<string, Record<string, unknown>> = {
  'construccion-de-casas': {
    title: 'Diseño y desarrollo web',
    slug: 'diseno-y-desarrollo-web',
    summary:
      'Sitios rápidos, responsivos y administrables, creados alrededor de tus objetivos comerciales.',
    duration: '2 a 8 semanas',
  },
  remodelaciones: {
    title: 'E-commerce y conversión',
    slug: 'ecommerce-y-conversion',
    summary: 'Tiendas digitales, catálogos, checkout e integraciones preparadas para vender y crecer.',
    duration: '3 a 10 semanas',
  },
  'techumbres-y-filtraciones': {
    title: 'Automatización e integraciones',
    slug: 'automatizacion-e-integraciones',
    summary: 'Conectamos formularios, CRM, pagos, mensajería, datos y operaciones repetitivas.',
    duration: '1 a 6 semanas',
  },
  'radieres-y-hormigon': {
    title: 'Experiencias 3D y motion',
    slug: 'experiencias-3d-y-motion',
    summary: 'Scroll cinematográfico, secuencias de frames, animación y visualización interactiva.',
    duration: '2 a 8 semanas',
  },
  'electricidad-y-gasfiteria': {
    title: 'Inteligencia artificial y RAG',
    slug: 'inteligencia-artificial-y-rag',
    summary: 'Asistentes, búsqueda semántica y flujos de IA conectados a información real del negocio.',
    duration: '2 a 10 semanas',
  },
  'quinchos-y-muebleria': {
    title: 'Optimización y mantenimiento',
    slug: 'optimizacion-y-mantenimiento',
    summary: 'Rendimiento, accesibilidad, SEO técnico, monitoreo y evolución continua del producto.',
    duration: 'Continuo',
  },
}

function replaceLegacy(value: unknown): unknown {
  if (typeof value === 'string') {
    let result = value
    Object.entries(replacements).forEach(([before, after]) => {
      result = result.replaceAll(before, after)
    })
    return result.replace(/dios construye hogares\.?/gi, 'Diseño · código · movimiento')
  }
  if (Array.isArray(value)) return value.map(replaceLegacy)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, replaceLegacy(item)]),
  )
}

async function repairSchema(payload: Awaited<ReturnType<typeof getPayload>>) {
  const statements = [
    sql`ALTER TABLE IF EXISTS "backgrounds" ADD COLUMN IF NOT EXISTS "video_id" integer;`,
    sql`ALTER TABLE IF EXISTS "backgrounds" ADD COLUMN IF NOT EXISTS "image_id" integer;`,
    sql`ALTER TABLE IF EXISTS "backgrounds" ADD COLUMN IF NOT EXISTS "external_u_r_l" varchar;`,
    sql`CREATE INDEX IF NOT EXISTS "backgrounds_video_id_idx" ON "backgrounds" ("video_id");`,
    sql`CREATE INDEX IF NOT EXISTS "backgrounds_image_id_idx" ON "backgrounds" ("image_id");`,
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
    sql`CREATE INDEX IF NOT EXISTS "pages_background_experiences_order_idx" ON "pages_background_experiences" ("_order");`,
    sql`CREATE INDEX IF NOT EXISTS "pages_background_experiences_parent_id_idx" ON "pages_background_experiences" ("_parent_id");`,
    sql`ALTER TABLE IF EXISTS "pages_background_experiences" ADD COLUMN IF NOT EXISTS "_uuid" varchar;`,
    sql`CREATE INDEX IF NOT EXISTS "pages_background_experiences_uuid_idx" ON "pages_background_experiences" ("_uuid");`,
    sql`CREATE INDEX IF NOT EXISTS "pages_background_experiences_background_id_idx" ON "pages_background_experiences" ("background_id");`,
    sql`
      CREATE TABLE IF NOT EXISTS "_pages_v_version_background_experiences" (
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL,
        "id" serial PRIMARY KEY,
        "label" varchar,
        "background_id" integer,
        "enabled" boolean DEFAULT true,
        "scroll_axis" varchar DEFAULT 'vertical',
        "playback_direction" varchar DEFAULT 'forward',
        "viewport_length" numeric DEFAULT 3,
        "_uuid" varchar
      );
    `,
    sql`CREATE INDEX IF NOT EXISTS "_pages_v_version_background_experiences_order_idx" ON "_pages_v_version_background_experiences" ("_order");`,
    sql`CREATE INDEX IF NOT EXISTS "_pages_v_version_background_experiences_parent_id_idx" ON "_pages_v_version_background_experiences" ("_parent_id");`,
    sql`CREATE INDEX IF NOT EXISTS "_pages_v_version_background_experiences_background_id_idx" ON "_pages_v_version_background_experiences" ("background_id");`,
    sql`CREATE INDEX IF NOT EXISTS "_pages_v_version_background_experiences_uuid_idx" ON "_pages_v_version_background_experiences" ("_uuid");`,
    sql`
      DO $$ BEGIN
        ALTER TABLE "_pages_v_version_background_experiences"
          ADD CONSTRAINT "_pages_v_version_background_experiences_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade;
      EXCEPTION WHEN duplicate_object THEN NULL;
      WHEN undefined_table THEN NULL;
      END $$;
    `,
    sql`
      DO $$ BEGIN
        ALTER TABLE "_pages_v_version_background_experiences"
          ADD CONSTRAINT "_pages_v_version_background_experiences_background_id_fk"
          FOREIGN KEY ("background_id") REFERENCES "backgrounds"("id") ON DELETE set null;
      EXCEPTION WHEN duplicate_object THEN NULL;
      WHEN undefined_table THEN NULL;
      END $$;
    `,
  ]
  for (const statement of statements) await payload.db.drizzle.execute(statement)
  payload.logger.info('MIGRATION_SCHEMA_READY: esquema verificado.')
}

async function migrateBrand(payload: Awaited<ReturnType<typeof getPayload>>) {
  let updated = 0

  const settings = (await payload.findGlobal({
    slug: 'site-settings',
    depth: 0,
    overrideAccess: true,
  })) as any
  const seo = settings.defaultSEO || {}
  const settingsData: Record<string, unknown> = {}
  if (!settings.tagline || legacyPattern.test(settings.tagline)) {
    settingsData.tagline = 'Diseñamos experiencias. Creamos sistemas digitales.'
  }
  if (!seo.title || !seo.description || legacyPattern.test(`${seo.title} ${seo.description}`)) {
    settingsData.defaultSEO = { ...seo, title: DIGITAL_TITLE, description: DIGITAL_DESCRIPTION }
  }
  if (settings.loader?.text === 'Preparando tu experiencia') {
    settingsData.loader = { ...settings.loader, text: 'Preparando tu experiencia digital' }
  }
  if (Object.keys(settingsData).length) {
    await payload.updateGlobal({ slug: 'site-settings', data: settingsData as any, overrideAccess: true })
    updated += 1
  }

  const footer = (await payload.findGlobal({ slug: 'footer', depth: 0, overrideAccess: true })) as any
  const footerData: Record<string, unknown> = {}
  if (!footer.description || legacyPattern.test(footer.description)) footerData.description = DIGITAL_FOOTER
  if (!Array.isArray(footer.social) || footer.social.length === 0) {
    footerData.social = [{ platform: 'GitHub', url: 'https://github.com/thinkfashz' }]
  }
  if (Object.keys(footerData).length) {
    await payload.updateGlobal({ slug: 'footer', data: footerData as any, overrideAccess: true })
    updated += 1
  }

  const header = (await payload.findGlobal({ slug: 'header', depth: 0, overrideAccess: true })) as any
  if (header.cta?.label === 'Cotizar proyecto') {
    await payload.updateGlobal({
      slug: 'header',
      data: { cta: { ...header.cta, label: 'Iniciar proyecto' } } as any,
      overrideAccess: true,
    })
    updated += 1
  }

  const services = await payload.find({ collection: 'services', depth: 0, limit: 100, overrideAccess: true })
  for (const service of services.docs as any[]) {
    const next = serviceReplacement[String(service.slug || '')]
    if (!next) continue

    const desiredSlug = String(next.slug || '')
    const slugConflict = (services.docs as any[]).some(
      (candidate) => candidate.id !== service.id && String(candidate.slug || '') === desiredSlug,
    )
    const safeSlug = slugConflict ? `${desiredSlug}-${service.id}` : desiredSlug

    await payload.update({
      collection: 'services',
      id: service.id,
      data: { ...next, slug: safeSlug, featured: true, _status: 'published' } as any,
      draft: false,
      overrideAccess: true,
    })
    updated += 1
  }

  const pages = await payload.find({ collection: 'pages', depth: 0, limit: 100, overrideAccess: true })
  for (const page of pages.docs as any[]) {
    const layout = replaceLegacy(page.layout)
    const seoData = replaceLegacy(page.seo)
    if (JSON.stringify(layout) === JSON.stringify(page.layout) && JSON.stringify(seoData) === JSON.stringify(page.seo)) continue
    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { layout, seo: seoData } as any,
      draft: false,
      overrideAccess: true,
    })
    updated += 1
  }

  payload.logger.info(`DIGITAL_BRANDING_READY: ${updated} documento(s) actualizado(s).`)
}

async function run() {
  const payload = await getPayload({ config })
  try {
    await repairSchema(payload)
    await migrateBrand(payload)

    await payload.delete({
      collection: 'payload-migrations',
      where: { batch: { equals: -1 } },
      overrideAccess: true,
    })

    const remaining = await payload.count({
      collection: 'payload-migrations',
      where: { batch: { equals: -1 } },
      overrideAccess: true,
    })
    if (remaining.totalDocs > 0) throw new Error('MIGRATION_PREPARE_FAILED: permanecen marcadores batch=-1.')
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
