import config from '@payload-config'
import { getPayload } from 'payload'

import { listIntegrations, requireAdmin, saveIntegration } from '@/lib/integrations/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function failure(error: unknown) {
  const status = Number((error as { status?: number })?.status || 500)
  const message = error instanceof Error ? error.message : 'No se pudo completar la operación.'
  return Response.json({ ok: false, error: message }, { status })
}

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    return Response.json({ ok: true, integrations: await listIntegrations(payload) })
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    const body = await request.json()
    const integration = await saveIntegration(payload, body)
    return Response.json({ ok: true, integration })
  } catch (error) {
    return failure(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return Response.json({ ok: false, error: 'Falta el ID.' }, { status: 400 })
    await (payload as any).delete({ collection: 'integrations', id, overrideAccess: true })
    return Response.json({ ok: true })
  } catch (error) {
    return failure(error)
  }
}
