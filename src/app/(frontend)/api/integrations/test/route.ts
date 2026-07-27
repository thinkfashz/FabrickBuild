import config from '@payload-config'
import { getPayload } from 'payload'

import { testProvider } from '@/lib/integrations/providers'
import { getIntegration, recordProviderTest, requireAdmin } from '@/lib/integrations/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  let integrationID: string | number | undefined

  try {
    await requireAdmin(payload, request)
    const body = await request.json()
    integrationID = body.id
    if (!integrationID) {
      return Response.json({ ok: false, error: 'Falta la integración.' }, { status: 400 })
    }

    const { document, credentials } = await getIntegration(payload, integrationID)
    const result = await testProvider(document, credentials)
    const integration = await recordProviderTest(payload, integrationID, result)
    return Response.json({ ok: true, result, integration })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo probar la credencial.'
    if (integrationID) {
      try {
        await recordProviderTest(payload, integrationID, { ok: false, error: message })
      } catch {
        // La respuesta nunca incluye secretos ni el error secundario de persistencia.
      }
    }
    const status = Number((error as { status?: number })?.status || 400)
    return Response.json({ ok: false, error: message }, { status })
  }
}
