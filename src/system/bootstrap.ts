import { createHash, timingSafeEqual } from 'crypto'
import type { Payload } from 'payload'

import { seedDatabase } from '@/seed/database'

const BOOTSTRAP_LOCK_ID = 74201126
const INSTALL_VERSION = 'fabrickbuild-cms-v1'
const ATTEMPT_WINDOW_MINUTES = 15
const LOCK_MINUTES = 30
const MAX_ATTEMPTS = 5

type QueryRow = Record<string, unknown>

type Pool = {
  query<T = QueryRow>(
    statement: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount?: number }>
}

type BootstrapState = {
  status: 'completed' | 'failed' | 'pending' | 'running'
  completed_at: null | string
  version: null | string
  admin_user_id: null | string
  updated_at: string
}

type BootstrapChecks = {
  database: boolean
  schema: boolean
  superAdmin: boolean
  authentication: boolean
  seed: boolean
  blob: boolean
  collections: Record<string, number>
}

export class BootstrapError extends Error {
  status: number
  code: string

  constructor(message: string, status = 500, code = 'BOOTSTRAP_FAILED') {
    super(message)
    this.name = 'BootstrapError'
    this.status = status
    this.code = code
  }
}

function getPool(payload: Payload): Pool {
  const pool = (payload.db as unknown as { pool?: Pool }).pool
  if (!pool) {
    throw new BootstrapError('No se pudo obtener la conexión PostgreSQL.', 503, 'DATABASE_UNAVAILABLE')
  }
  return pool
}

export function getBootstrapSecret(): string {
  return process.env.BOOTSTRAP_SECRET || process.env.SEED_SECRET || ''
}

export function secureSecretMatch(provided: string, expected: string): boolean {
  if (!provided || !expected) return false
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  if (providedBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(providedBuffer, expectedBuffer)
}

export function requestFingerprint(ip: string): string {
  const pepper = process.env.PAYLOAD_SECRET || 'fabrickbuild-bootstrap'
  return createHash('sha256').update(`${ip}:${pepper}`).digest('hex')
}

export async function ensureControlTables(payload: Payload): Promise<void> {
  const pool = getPool(payload)
  await pool.query(`CREATE SCHEMA IF NOT EXISTS fabrickbuild_system`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fabrickbuild_system.bootstrap_state (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      version VARCHAR(80),
      admin_user_id TEXT,
      checks JSONB,
      completed_at TIMESTAMPTZ,
      last_error TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`
    INSERT INTO fabrickbuild_system.bootstrap_state (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fabrickbuild_system.bootstrap_attempts (
      fingerprint VARCHAR(64) PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0,
      window_started TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      locked_until TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

export async function readBootstrapState(payload: Payload): Promise<BootstrapState> {
  await ensureControlTables(payload)
  const pool = getPool(payload)
  const result = await pool.query<BootstrapState>(`
    SELECT status, completed_at, version, admin_user_id, updated_at
    FROM fabrickbuild_system.bootstrap_state
    WHERE id = 1
  `)
  return result.rows[0]
}

export async function assertAttemptAllowed(payload: Payload, fingerprint: string): Promise<void> {
  const pool = getPool(payload)
  const result = await pool.query<{ locked_until: null | string }>(
    `SELECT locked_until FROM fabrickbuild_system.bootstrap_attempts WHERE fingerprint = $1`,
    [fingerprint],
  )
  const lockedUntil = result.rows[0]?.locked_until
  if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
    throw new BootstrapError(
      'Demasiados intentos. La instalación está temporalmente bloqueada.',
      429,
      'RATE_LIMITED',
    )
  }
}

export async function registerFailedAttempt(payload: Payload, fingerprint: string): Promise<void> {
  const pool = getPool(payload)
  const current = await pool.query<{
    attempts: number
    window_started: string
  }>(
    `SELECT attempts, window_started FROM fabrickbuild_system.bootstrap_attempts WHERE fingerprint = $1`,
    [fingerprint],
  )

  const row = current.rows[0]
  const windowExpired =
    !row ||
    Date.now() - new Date(row.window_started).getTime() > ATTEMPT_WINDOW_MINUTES * 60 * 1000
  const attempts = windowExpired ? 1 : Number(row.attempts) + 1
  const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null

  await pool.query(
    `
      INSERT INTO fabrickbuild_system.bootstrap_attempts
        (fingerprint, attempts, window_started, locked_until, updated_at)
      VALUES ($1, $2, NOW(), $3, NOW())
      ON CONFLICT (fingerprint) DO UPDATE SET
        attempts = EXCLUDED.attempts,
        window_started = CASE
          WHEN fabrickbuild_system.bootstrap_attempts.window_started < NOW() - INTERVAL '${ATTEMPT_WINDOW_MINUTES} minutes'
          THEN NOW()
          ELSE fabrickbuild_system.bootstrap_attempts.window_started
        END,
        locked_until = EXCLUDED.locked_until,
        updated_at = NOW()
    `,
    [fingerprint, attempts, lockedUntil],
  )
}

export async function clearAttempts(payload: Payload, fingerprint: string): Promise<void> {
  const pool = getPool(payload)
  await pool.query(`DELETE FROM fabrickbuild_system.bootstrap_attempts WHERE fingerprint = $1`, [
    fingerprint,
  ])
}

async function acquireBootstrapLock(payload: Payload): Promise<boolean> {
  const pool = getPool(payload)
  const result = await pool.query<{ acquired: boolean }>(
    `SELECT pg_try_advisory_lock($1) AS acquired`,
    [BOOTSTRAP_LOCK_ID],
  )
  return Boolean(result.rows[0]?.acquired)
}

async function releaseBootstrapLock(payload: Payload): Promise<void> {
  const pool = getPool(payload)
  await pool.query(`SELECT pg_advisory_unlock($1)`, [BOOTSTRAP_LOCK_ID])
}

async function setState(
  payload: Payload,
  status: BootstrapState['status'],
  data: {
    adminUserId?: string
    checks?: BootstrapChecks
    completed?: boolean
    error?: string
  } = {},
): Promise<void> {
  const pool = getPool(payload)
  await pool.query(
    `
      UPDATE fabrickbuild_system.bootstrap_state
      SET status = $1,
          version = $2,
          admin_user_id = COALESCE($3, admin_user_id),
          checks = COALESCE($4::jsonb, checks),
          completed_at = CASE WHEN $5 THEN NOW() ELSE completed_at END,
          last_error = $6,
          updated_at = NOW()
      WHERE id = 1
    `,
    [
      status,
      INSTALL_VERSION,
      data.adminUserId || null,
      data.checks ? JSON.stringify(data.checks) : null,
      Boolean(data.completed),
      data.error?.slice(0, 500) || null,
    ],
  )
}

async function synchronizeBlankSchema(payload: Payload): Promise<void> {
  const adapter = payload.db as unknown as {
    drizzle: unknown
    extensions?: Record<string, boolean>
    requireDrizzleKit: () => {
      pushSchema: (
        schema: unknown,
        drizzle: unknown,
        schemaNames?: string[],
        tablesFilter?: string[],
        extensionsFilter?: string[],
      ) => Promise<{
        apply: () => Promise<void>
        hasDataLoss: boolean
        warnings: string[]
      }>
    }
    schema: unknown
    schemaName?: string
    tablesFilter?: string[]
  }

  if (typeof adapter.requireDrizzleKit !== 'function') {
    throw new BootstrapError(
      'El adaptador PostgreSQL no permite sincronizar el esquema.',
      500,
      'SCHEMA_TOOL_UNAVAILABLE',
    )
  }

  const { pushSchema } = adapter.requireDrizzleKit()
  const result = await pushSchema(
    adapter.schema,
    adapter.drizzle,
    adapter.schemaName ? [adapter.schemaName] : undefined,
    adapter.tablesFilter,
    adapter.extensions?.postgis ? ['postgis'] : undefined,
  )

  if (result.hasDataLoss || result.warnings.length > 0) {
    throw new BootstrapError(
      'La base contiene cambios que requieren revisión. La instalación automática se detuvo sin modificar datos.',
      409,
      'SCHEMA_REVIEW_REQUIRED',
    )
  }

  await result.apply()
}

function assertEnvironment(): void {
  const databaseURL = process.env.DATABASE_URL || process.env.POSTGRES_URL
  const payloadSecret = process.env.PAYLOAD_SECRET || ''
  const bootstrapSecret = getBootstrapSecret()
  const adminEmail = process.env.ADMIN_EMAIL || ''
  const adminPassword = process.env.ADMIN_PASSWORD || ''
  const blobToken =
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN ||
    ''

  if (!databaseURL?.startsWith('postgres')) {
    throw new BootstrapError('DATABASE_URL o POSTGRES_URL no está configurada.', 503, 'DATABASE_URL_MISSING')
  }
  if (payloadSecret.length < 32) {
    throw new BootstrapError('PAYLOAD_SECRET debe tener al menos 32 caracteres.', 503, 'PAYLOAD_SECRET_WEAK')
  }
  if (bootstrapSecret.length < 32) {
    throw new BootstrapError('SEED_SECRET debe tener al menos 32 caracteres.', 503, 'BOOTSTRAP_SECRET_WEAK')
  }
  if (!adminEmail.includes('@')) {
    throw new BootstrapError('ADMIN_EMAIL no es válido.', 503, 'ADMIN_EMAIL_INVALID')
  }
  if (adminPassword.length < 16) {
    throw new BootstrapError('ADMIN_PASSWORD debe tener al menos 16 caracteres.', 503, 'ADMIN_PASSWORD_WEAK')
  }
  if (!blobToken) {
    throw new BootstrapError('Vercel Blob no está conectado.', 503, 'BLOB_TOKEN_MISSING')
  }
}

async function ensureSuperAdmin(payload: Payload): Promise<{ id: string; repaired: boolean }> {
  const email = process.env.ADMIN_EMAIL!.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD!

  const [matching, adminCount, userCount] = await Promise.all([
    payload.find({
      collection: 'users',
      limit: 2,
      overrideAccess: true,
      showHiddenFields: true,
      where: { email: { equals: email } },
    }),
    payload.count({ collection: 'users', overrideAccess: true, where: { role: { equals: 'admin' } } }),
    payload.count({ collection: 'users', overrideAccess: true }),
  ])

  let user = matching.docs[0]
  let repaired = false

  if (!user) {
    if (userCount.totalDocs > 0 || adminCount.totalDocs > 0) {
      throw new BootstrapError(
        'Ya existen usuarios distintos al superusuario configurado. No se realizó ningún reemplazo automático.',
        409,
        'EXISTING_USERS_CONFLICT',
      )
    }

    user = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        name: 'Superadministrador FabrickBuild',
        email,
        password,
        role: 'admin',
      },
    })
  } else if (user.role !== 'admin') {
    if (adminCount.totalDocs > 0) {
      throw new BootstrapError(
        'El correo configurado existe, pero ya hay otro administrador. Se requiere revisión.',
        409,
        'ADMIN_CONFLICT',
      )
    }
    user = await payload.update({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      data: { role: 'admin' },
    })
    repaired = true
  }

  try {
    await payload.login({ collection: 'users', data: { email, password } })
  } catch {
    if (adminCount.totalDocs > 1) {
      throw new BootstrapError(
        'No se pudo validar el superusuario sin afectar otros administradores.',
        409,
        'ADMIN_LOGIN_FAILED',
      )
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      data: {
        password,
        role: 'admin',
        loginAttempts: 0,
        lockUntil: null,
      } as never,
    })
    await payload.login({ collection: 'users', data: { email, password } })
    repaired = true
  }

  return { id: String(user.id), repaired }
}

async function collectChecks(payload: Payload): Promise<BootstrapChecks> {
  const collectionSlugs = [
    'users',
    'pages',
    'services',
    'projects',
    'media',
    'testimonials',
    'leads',
  ] as const
  const collections: Record<string, number> = {}

  for (const collection of collectionSlugs) {
    const result = await payload.count({ collection, overrideAccess: true })
    collections[collection] = result.totalDocs
  }

  await Promise.all([
    payload.findGlobal({ slug: 'header', overrideAccess: true }),
    payload.findGlobal({ slug: 'footer', overrideAccess: true }),
    payload.findGlobal({ slug: 'site-settings', overrideAccess: true }),
  ])

  return {
    database: true,
    schema: true,
    superAdmin: collections.users >= 1,
    authentication: true,
    seed: collections.pages >= 1 && collections.services >= 1,
    blob: Boolean(
      process.env.BLOB_READ_WRITE_TOKEN ||
        process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN,
    ),
    collections,
  }
}

export async function runOneTimeBootstrap(payload: Payload): Promise<{
  checks: BootstrapChecks
  installed: true
  repairedAdmin: boolean
}> {
  assertEnvironment()
  await ensureControlTables(payload)

  const acquired = await acquireBootstrapLock(payload)
  if (!acquired) {
    throw new BootstrapError(
      'Otra instalación está en curso. Espera unos segundos.',
      409,
      'BOOTSTRAP_IN_PROGRESS',
    )
  }

  try {
    const state = await readBootstrapState(payload)
    if (state.status === 'completed') {
      throw new BootstrapError(
        'La instalación ya fue completada y está bloqueada.',
        410,
        'BOOTSTRAP_LOCKED',
      )
    }

    await setState(payload, 'running')
    await synchronizeBlankSchema(payload)
    const admin = await ensureSuperAdmin(payload)
    await seedDatabase(payload)
    const checks = await collectChecks(payload)

    if (!Object.values(checks).every((value) => {
      if (typeof value === 'boolean') return value
      return true
    })) {
      throw new BootstrapError('Una o más verificaciones fallaron.', 500, 'HEALTH_CHECK_FAILED')
    }

    await setState(payload, 'completed', {
      adminUserId: admin.id,
      checks,
      completed: true,
    })

    return { installed: true, checks, repairedAdmin: admin.repaired }
  } catch (error) {
    if (!(error instanceof BootstrapError && error.code === 'BOOTSTRAP_LOCKED')) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      await setState(payload, 'failed', { error: message })
    }
    throw error
  } finally {
    await releaseBootstrapLock(payload)
  }
}

export async function getDetailedHealth(payload: Payload): Promise<{
  checks: BootstrapChecks
  installed: boolean
  state: BootstrapState
}> {
  const state = await readBootstrapState(payload)
  if (state.status !== 'completed') {
    return {
      installed: false,
      state,
      checks: {
        database: true,
        schema: false,
        superAdmin: false,
        authentication: false,
        seed: false,
        blob: Boolean(
          process.env.BLOB_READ_WRITE_TOKEN ||
            process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN,
        ),
        collections: {},
      },
    }
  }

  return { installed: true, state, checks: await collectChecks(payload) }
}
