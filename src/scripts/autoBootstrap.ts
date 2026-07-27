import { getPayload } from 'payload'

import { BootstrapError, readBootstrapState, runOneTimeBootstrap } from '../system/bootstrap'
import config from '../payload.config'

async function autoBootstrap(): Promise<void> {
  const enabled = process.env.VERCEL === '1' || process.env.AUTO_BOOTSTRAP === 'true'

  if (!enabled) {
    console.log('[FabrickBuild bootstrap] Omitido fuera de Vercel.')
    return
  }

  const payload = await getPayload({ config })

  try {
    const state = await readBootstrapState(payload)

    if (state.status === 'completed') {
      console.log(
        `[FabrickBuild bootstrap] Instalación verificada (${state.version || 'sin versión'}). No se realizaron cambios.`,
      )
      return
    }

    console.log('[FabrickBuild bootstrap] Base sin inicializar. Ejecutando instalación segura...')
    const result = await runOneTimeBootstrap(payload)

    console.log(
      `[FabrickBuild bootstrap] Instalación completada. Superusuario: ${result.checks.superAdmin ? 'OK' : 'ERROR'}; autenticación: ${result.checks.authentication ? 'OK' : 'ERROR'}; Blob: ${result.checks.blob ? 'OK' : 'ERROR'}.`,
    )
  } catch (error) {
    if (error instanceof BootstrapError && error.code === 'BOOTSTRAP_LOCKED') {
      console.log('[FabrickBuild bootstrap] La instalación ya está completada y bloqueada.')
      return
    }

    const message = error instanceof Error ? error.message : String(error)
    console.error(`[FabrickBuild bootstrap] Error: ${message}`)
    process.exitCode = 1
  }
}

await autoBootstrap()
