import config from '@payload-config'
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'

import {
  assertAttemptAllowed,
  BootstrapError,
  clearAttempts,
  ensureControlTables,
  getBootstrapSecret,
  readBootstrapState,
  registerFailedAttempt,
  requestFingerprint,
  runOneTimeBootstrap,
  secureSecretMatch,
} from '@/system/bootstrap'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
export const runtime = 'nodejs'

function clientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

function assertSameOrigin(request: NextRequest): void {
  if (process.env.NODE_ENV !== 'production') return
  const origin = request.headers.get('origin')
  if (!origin || origin !== request.nextUrl.origin) {
    throw new BootstrapError('Origen no autorizado.', 403, 'ORIGIN_REJECTED')
  }
}

function errorResponse(error: unknown): Response {
  if (error instanceof BootstrapError) {
    return Response.json({ ok: false, code: error.code, error: error.message }, { status: error.status })
  }
  console.error('FabrickBuild bootstrap error:', error)
  return Response.json(
    { ok: false, code: 'BOOTSTRAP_FAILED', error: 'No se pudo completar la instalación.' },
    { status: 500 },
  )
}

export async function GET(): Promise<Response> {
  try {
    const payload = await getPayload({ config })
    const state = await readBootstrapState(payload)
    return Response.json({
      ok: true,
      installed: state.status === 'completed',
      status: state.status,
      completedAt: state.completed_at,
      version: state.version,
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  let payload: Awaited<ReturnType<typeof getPayload>> | undefined
  let fingerprint = ''

  try {
    assertSameOrigin(request)
    if (!request.headers.get('content-type')?.includes('application/json')) {
      throw new BootstrapError('Formato de solicitud inválido.', 415, 'INVALID_CONTENT_TYPE')
    }

    const body = (await request.json()) as { confirmation?: string; secret?: string }
    if (body.confirmation !== 'INSTALAR FABRICKBUILD') {
      throw new BootstrapError('Confirmación inválida.', 400, 'CONFIRMATION_REQUIRED')
    }

    payload = await getPayload({ config })
    await ensureControlTables(payload)
    fingerprint = requestFingerprint(clientIP(request))
    await assertAttemptAllowed(payload, fingerprint)

    const expected = getBootstrapSecret()
    if (!secureSecretMatch(body.secret || '', expected)) {
      await registerFailedAttempt(payload, fingerprint)
      throw new BootstrapError('Clave de instalación incorrecta.', 401, 'INVALID_BOOTSTRAP_SECRET')
    }

    await clearAttempts(payload, fingerprint)
    const result = await runOneTimeBootstrap(payload)
    return Response.json({ ok: true, ...result })
  } catch (error) {
    if (payload && fingerprint && error instanceof SyntaxError) {
      await registerFailedAttempt(payload, fingerprint)
    }
    return errorResponse(error)
  }
}
