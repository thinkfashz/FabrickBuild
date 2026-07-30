import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'

import { getCMS } from '@/lib/cms'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()
const WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS = 5

const clean = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f]/g, '').slice(0, max) : ''

const response = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })

function clientKey(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || request.headers.get('x-real-ip') || 'unknown'
  return createHash('sha256').update(`${ip}:${process.env.PAYLOAD_SECRET || 'fabrick'}`).digest('hex')
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host) return true
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

function rateLimited(key: string) {
  const now = Date.now()
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  current.count += 1
  buckets.set(key, current)
  return current.count > MAX_REQUESTS
}

export async function POST(request: Request) {
  if (!allowedOrigin(request)) return response({ error: 'Origen no permitido.' }, 403)

  const length = Number(request.headers.get('content-length') || 0)
  if (length > 25_000) return response({ error: 'Solicitud demasiado grande.' }, 413)

  const key = clientKey(request)
  if (rateLimited(key)) return response({ error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.' }, 429)

  let input: Record<string, unknown>
  try {
    input = (await request.json()) as Record<string, unknown>
  } catch {
    return response({ error: 'Solicitud inválida.' }, 400)
  }

  if (clean(input.company, 120)) return response({ ok: true })

  const name = clean(input.name, 100)
  const phone = clean(input.phone, 32)
  const email = clean(input.email, 160)
  const commune = clean(input.commune, 120)
  const message = clean(input.message, 2500)
  const projectType = clean(input.projectType, 32)
  const budget = clean(input.budget, 32) || 'unknown'
  const serviceValue = clean(input.service, 32)
  const digits = phone.replace(/\D/g, '')
  const area = Number(input.area)

  if (name.length < 2 || digits.length < 8 || message.length < 10) {
    return response({ error: 'Completa nombre, teléfono y una descripción de al menos 10 caracteres.' }, 422)
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response({ error: 'El correo no tiene un formato válido.' }, 422)
  }
  if (input.privacyConsent !== true) {
    return response({ error: 'Debes autorizar el uso de tus datos para responder la solicitud.' }, 422)
  }

  try {
    const payload = await getCMS()
    await payload.create({
      collection: 'leads',
      overrideAccess: true,
      data: {
        name,
        phone,
        email: email || undefined,
        commune: commune || undefined,
        service: /^\d+$/.test(serviceValue) ? Number(serviceValue) : undefined,
        projectType: ['new-home', 'remodeling', 'repair', 'other'].includes(projectType) ? projectType as any : undefined,
        area: Number.isFinite(area) && area >= 0 && area <= 100_000 ? area : undefined,
        budget: ['under-1m', '1m-5m', '5m-20m', 'over-20m', 'unknown'].includes(budget) ? budget as any : 'unknown',
        message,
        privacyConsent: true,
        consentVersion: clean(input.consentVersion, 32) || '2026-07',
        source: 'website',
      },
    })
    return response({ ok: true }, 201)
  } catch (error) {
    console.error('[public-leads] No fue posible registrar la solicitud.', error)
    return response({ error: 'No fue posible registrar la solicitud. Intenta nuevamente.' }, 500)
  }
}
