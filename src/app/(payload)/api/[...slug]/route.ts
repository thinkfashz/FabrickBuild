import config from '@payload-config'
import '@payloadcms/next/css'
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT
} from '@payloadcms/next/routes'
import { getPayload } from 'payload'

import { uploadSystemMedia } from '@/lib/media-storage'
import { requireAdmin } from '@/lib/integrations/service'
import { ensureRuntimeSchema } from '@/system/runtimeSchema'

async function repair() {
  const payload = await getPayload({ config })
  await ensureRuntimeSchema(payload)
}

export async function GET(request: Request, context: unknown) {
  await repair()
  return REST_GET(config)(request, context as never)
}
export async function POST(request: Request, context: unknown) {
  const params = await (context as { params?: Promise<{ slug?: string[] }> }).params
  if (params?.slug?.length === 1 && params.slug[0] === 'media' && request.headers.get('content-type')?.includes('multipart/form-data')) {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    await ensureRuntimeSchema(payload)
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return Response.json({ errors: [{ message: 'Selecciona un archivo para subir.' }] }, { status: 400 })
    let data: Record<string, unknown> = {}
    const raw = form.get('_payload')
    if (typeof raw === 'string') {
      try { data = JSON.parse(raw) as Record<string, unknown> } catch { return Response.json({ errors: [{ message: 'Datos de archivo inválidos.' }] }, { status: 400 }) }
    }
    try {
      const result = await uploadSystemMedia(payload, {
        file,
        folder: typeof data.storageFolder === 'string' ? data.storageFolder : undefined,
        alt: typeof data.alt === 'string' ? data.alt : undefined,
        category: typeof data.category === 'string' ? data.category : undefined,
        device: typeof data.device === 'string' ? data.device : undefined,
        frameOrder: typeof data.frameOrder === 'number' ? data.frameOrder : undefined,
        collectionKey: typeof data.collectionKey === 'string' ? data.collectionKey : undefined,
      })
      return Response.json({ doc: result.media, message: 'Archivo subido y registrado.' }, { status: 201 })
    } catch (error) {
      const status = Number((error as { status?: number })?.status || 500)
      console.error('[api/media] system upload failed', { message: error instanceof Error ? error.message : String(error) })
      return Response.json({ errors: [{ message: error instanceof Error ? error.message : 'No se pudo guardar el archivo.' }] }, { status })
    }
  }
  await repair()
  return REST_POST(config)(request, context as never)
}
export async function DELETE(request: Request, context: unknown) {
  await repair()
  return REST_DELETE(config)(request, context as never)
}
export async function PATCH(request: Request, context: unknown) {
  await repair()
  return REST_PATCH(config)(request, context as never)
}
export async function PUT(request: Request, context: unknown) {
  await repair()
  return REST_PUT(config)(request, context as never)
}
export const OPTIONS = REST_OPTIONS(config)
