import config from '@payload-config'
import { getPayload } from 'payload'

import { testProvider } from '@/lib/integrations/providers'
import { getIntegration, recordProviderTest, requireAdmin } from '@/lib/integrations/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  try {
    await requireAdmin(payload, request)
    const { id } = await request.json()
    if (!id) return Response.json({ ok: false, error: 'Falta la integración.' }, { status: 400 })

    const { document, credentials } = await getIntegration(payload, id)
    const result = await testProvider(document, credentials)
    const integration = await recordProviderTest(payload, id, result)
    return Response.json({ ok: true, result, integration })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo probar la credencial.'
    try {
      const body = await request.clone().json()
      if (body?.id) {
        await recordProviderTest(payload, body.id, { ok: false, error: message })
      }
    } catch {
      // El error de prueba se devuelve sin exponer credenciales.
    }
    const status = Number((error as { status?: number })?.status || 400)
    return Response.json({ ok: false, error: message }, { status })
  }
}
