import { cloudinaryEnvironmentInfo, decryptCloudinaryCredentials, encryptCloudinaryCredentials, getCloudinaryIntegration, testCloudinary } from '@/lib/cloudinary'

export const runtime = 'nodejs'

async function requireAdmin(request: Request) {
  const { payload, doc, duplicates } = await getCloudinaryIntegration()
  const auth = await payload.auth({ headers: request.headers })
  if (!auth.user || auth.user.role !== 'admin') return { error: Response.json({ ok: false, message: 'Solo un administrador puede configurar Cloudinary.' }, { status: 403 }) }
  return { payload, doc, duplicates }
}

export async function GET(request: Request) {
  const context = await requireAdmin(request)
  if ('error' in context) return context.error
  const { doc, duplicates } = context
  let cloudName = ''
  let rootFolder = 'fabrickbuild'
  try {
    const credentials = decryptCloudinaryCredentials(doc)
    cloudName = credentials.cloudName
    rootFolder = credentials.rootFolder || rootFolder
  } catch {}
  return Response.json({
    ok: true,
    configured: Boolean(doc?.encryptedCredentials),
    enabled: Boolean(doc?.enabled),
    status: doc?.status || 'untested',
    cloudName,
    rootFolder,
    hint: doc?.credentialHint || '',
    lastTestedAt: doc?.lastTestedAt || null,
    lastError: doc?.lastError || null,
    duplicates,
    environment: cloudinaryEnvironmentInfo(),
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const context = await requireAdmin(request)
  if ('error' in context) return context.error
  const { payload, doc } = context
  const body = await request.json().catch(() => ({})) as any
  const action = body.action === 'test' ? 'test' : 'save'
  const cloudName = String(body.cloudName || '').trim()
  const apiKey = String(body.apiKey || '').trim()
  const apiSecret = String(body.apiSecret || '').trim()
  const rootFolder = String(body.rootFolder || 'fabrickbuild').trim().replace(/^\/+|\/+$/g, '') || 'fabrickbuild'

  let current: any = null
  try { current = decryptCloudinaryCredentials(doc) } catch {}
  const credentials = {
    cloudName: cloudName || current?.cloudName || '',
    apiKey: apiKey || current?.apiKey || '',
    apiSecret: apiSecret || current?.apiSecret || '',
    rootFolder,
  }
  if (!credentials.cloudName || !credentials.apiKey || !credentials.apiSecret) {
    return Response.json({ ok: false, message: 'Completa Cloud name, API key y API secret. Si fueron guardadas en otro Preview, ese deployment probablemente usa otra base PostgreSQL.' }, { status: 400 })
  }

  try {
    const test = await testCloudinary(credentials)
    const encrypted = encryptCloudinaryCredentials(credentials)
    const now = new Date().toISOString()
    const data = {
      label: 'Cloudinary Multimedia', provider: 'cloudinary', enabled: true, priority: 50,
      status: 'connected', lastConnectedAt: now, lastTestedAt: now, lastError: null,
      capabilities: { images: true, folders: true, frames: true, source: 'secondary', rootFolder, sharedDatabase: true },
      ...encrypted, secretUpdatedAt: action === 'save' ? now : (doc?.secretUpdatedAt || now),
    }
    const saved = doc?.id
      ? await payload.update({ collection: 'integrations', id: doc.id, data: data as any, overrideAccess: true })
      : await payload.create({ collection: 'integrations', data: data as any, overrideAccess: true })
    return Response.json({ ok: true, message: 'Cloudinary fue probado, activado y guardado en PostgreSQL para este entorno.', test, hint: saved.credentialHint, environment: cloudinaryEnvironmentInfo() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible conectar con Cloudinary.'
    if (doc?.id) await payload.update({ collection: 'integrations', id: doc.id, data: { status: 'error', lastTestedAt: new Date().toISOString(), lastError: message } as any, overrideAccess: true }).catch(() => null)
    return Response.json({ ok: false, message, environment: cloudinaryEnvironmentInfo() }, { status: 502 })
  }
}
