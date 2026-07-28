import config from '@payload-config'
import { getPayload } from 'payload'

import {
  connectAndSaveIntegration,
  readLimitedJSON,
  requireAdmin,
  type SaveIntegrationInput,
} from '@/lib/integrations/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

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
  try {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    const input = await readLimitedJSON<SaveIntegrationInput>(request)
    const result = await connectAndSaveIntegration(payload, input)
    return response({ ok: true, ...result })
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 400)
    const message = error instanceof Error ? error.message : 'No se pudo conectar el proveedor.'
    return response({ ok: false, error: message }, status)
  }
}
