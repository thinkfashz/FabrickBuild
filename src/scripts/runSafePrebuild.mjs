import { spawnSync } from 'node:child_process'

const environment = process.env.VERCEL_TARGET_ENV || process.env.VERCEL_ENV || 'local'
const isPreview = environment === 'preview'
const isProduction = environment === 'production'
const hasSharedDatabase = Boolean(process.env.PAYLOAD_DATABASE_URL)

console.info(
  `[prebuild] Entorno ${environment}. Base compartida explícita: ${hasSharedDatabase ? 'sí' : 'no'}.`,
)

if (isPreview && !hasSharedDatabase) {
  console.warn(
    '[prebuild] PAYLOAD_DATABASE_URL no está definida en Preview; se usará la conexión disponible de POSTGRES_URL/DATABASE_URL. Para garantizar una sola base, configura PAYLOAD_DATABASE_URL en Production y Preview.',
  )
}

const script = isPreview ? 'prebuild:preview' : 'prebuild:full'
const result = spawnSync('npm', ['run', script], {
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (result.error) {
  console.error(`[prebuild] No fue posible ejecutar ${script}.`, result.error)
  process.exit(1)
}

if (typeof result.status === 'number' && result.status !== 0) {
  process.exit(result.status)
}

console.info(
  isPreview
    ? '[prebuild] Preview validado en modo solo lectura; no se ejecutaron migraciones ni seeds.'
    : `[prebuild] Preparación completa terminada para ${isProduction ? 'Producción' : 'entorno local'}.`,
)
