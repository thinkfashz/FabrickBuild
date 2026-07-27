import { getPayload, type Payload } from 'payload'

import { BootstrapError, readBootstrapState, runOneTimeBootstrap } from '../system/bootstrap'
import config from '../payload.config'

async function verifyConfiguredAdmin(payload: Payload, email: string, password: string): Promise<void> {
  try {
    await payload.login({ collection: 'users', data: { email, password } })
    return
  } catch {
    const matching = await payload.find({
      collection: 'users',
      limit: 1,
      overrideAccess: true,
      where: { email: { equals: email } },
    })

    const user = matching.docs[0]
    if (!user) {
      throw new Error('No se encontró el superusuario configurado después de la instalación.')
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      data: { password, role: 'admin' },
    })

    await payload.login({ collection: 'users', data: { email, password } })
  }
}

async function markBootstrapFailed(payload: Payload, message: string): Promise<void> {
  const pool = (payload.db as unknown as {
    pool?: { query: (statement: string, values?: unknown[]) => Promise<unknown> }
  }).pool

  if (!pool) return

  await pool.query(
    `UPDATE fabrickbuild_system.bootstrap_state
     SET status = 'failed', completed_at = NULL, last_error = $1, updated_at = NOW()
     WHERE id = 1`,
    [message.slice(0, 500)],
  )
}

async function autoBootstrap(): Promise<void> {
  const enabled = process.env.VERCEL === '1' || process.env.AUTO_BOOTSTRAP === 'true'

  if (!enabled) {
    console.log('[FabrickBuild bootstrap] Omitido fuera de Vercel.')
    return
  }

  const originalPassword = process.env.ADMIN_PASSWORD || ''
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()

  if (originalPassword.length < 8) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres.')
  }

  const payload = await getPayload({ config })

  try {
    const state = await readBootstrapState(payload)

    if (state.status === 'completed') {
      await verifyConfiguredAdmin(payload, email, originalPassword)
      console.log(
        `[FabrickBuild bootstrap] Instalación verificada (${state.version || 'sin versión'}). Superusuario y contraseña confirmados.`,
      )
      return
    }

    const temporaryPassword =
      originalPassword.length >= 16 ? originalPassword : originalPassword.padEnd(16, '#')

    process.env.ADMIN_PASSWORD = temporaryPassword

    console.log('[FabrickBuild bootstrap] Base sin inicializar. Ejecutando instalación segura...')
    const result = await runOneTimeBootstrap(payload)

    process.env.ADMIN_PASSWORD = originalPassword
    await verifyConfiguredAdmin(payload, email, originalPassword)

    console.log(
      `[FabrickBuild bootstrap] Instalación completada. Superusuario: ${result.checks.superAdmin ? 'OK' : 'ERROR'}; autenticación: OK; Blob: ${result.checks.blob ? 'OK' : 'ERROR'}.`,
    )
  } catch (error) {
    process.env.ADMIN_PASSWORD = originalPassword

    if (error instanceof BootstrapError && error.code === 'BOOTSTRAP_LOCKED') {
      await verifyConfiguredAdmin(payload, email, originalPassword)
      console.log('[FabrickBuild bootstrap] Instalación bloqueada y superusuario verificado.')
      return
    }

    const message = error instanceof Error ? error.message : String(error)
    await markBootstrapFailed(payload, message).catch(() => undefined)
    console.error(`[FabrickBuild bootstrap] Error: ${message}`)
    throw error
  }
}

await autoBootstrap()
