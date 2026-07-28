import config from '@payload-config'
import { getPayload } from 'payload'

import {
  listIntegrations,
  readLimitedJSON,
  requireAdmin,
  requireTrustedMutation,
  saveIntegration,
  type SaveIntegrationInput,
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

function failure(error: unknown) {
  const status = Number((error as { status?: number })?.status || 500)
  const message = error instanceof Error ? error.message : 'No se pudo completar la operación.'
  return response({ ok: false, error: message }, status)
}

export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    return response({ ok: true, integrations: await listIntegrations(payload) })
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    const body = await readLimitedJSON<SaveIntegrationInput>(request)
    const integration = await saveIntegration(payload, body)
    return response({ ok: true, integration })
  } catch (error) {
    return failure(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    requireTrustedMutation(request)
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return response({ ok: false, error: 'Falta el ID.' }, 400)
    await (payload as any).delete({ collection: 'integrations', id, overrideAccess: true })
    return response({ ok: true })
  } catch (error) {
    return failure(error)
  }
}
