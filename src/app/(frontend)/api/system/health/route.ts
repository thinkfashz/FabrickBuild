import config from '@payload-config'
import { getPayload } from 'payload'

import { getDetailedHealth } from '@/system/bootstrap'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  try {
    const payload = await getPayload({ config })
    const auth = await payload.auth({ headers: request.headers, canSetHeaders: false })

    if (!auth.user || (auth.user as { role?: string }).role !== 'admin') {
      return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const health = await getDetailedHealth(payload)
    return Response.json({ ok: true, ...health })
  } catch (error) {
    console.error('FabrickBuild health error:', error)
    return Response.json({ ok: false, error: 'No se pudo verificar el sistema.' }, { status: 500 })
  }
}
