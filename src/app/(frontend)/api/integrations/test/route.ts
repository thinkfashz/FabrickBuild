import config from '@payload-config'
import { getPayload } from 'payload'

import { testProvider } from '@/lib/integrations/providers'
import {
  getIntegration,
  readLimitedJSON,
  recordProviderTest,
  requireAdmin,
} from '@/lib/integrations/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  let integrationID: string | number | undefined

  try {
    await requireAdmin(payload, request)
    const body = await readLimitedJSON<{ id?: string | number }>(request)
    integrationID = body.id
    if (!integrationID) {
      return response({ ok: false, error: 'Falta la integración.' }, 400)
    }

    const { document, credentials } = await getIntegration(payload, integrationID)
    if (document.lockedUntil && new Date(document.lockedUntil).getTime() > Date.now()) {
      return response({ ok: false, error: 'La bóveda está bloqueada temporalmente.' }, 423)
    }

    const result = await testProvider(document, credentials)
    const integration = await recordProviderTest(payload, integrationID, result)
    return response({ ok: true, result, integration })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo probar la credencial.'
    if (integrationID) {
      try {
        await recordProviderTest(payload, integrationID, { ok: false, error: message })
      } catch {
        // Nunca se exponen secretos ni errores secundarios del registro.
      }
    }
    const status = Number((error as { status?: number })?.status || 400)
    return response({ ok: false, error: message }, status)
  }
}
