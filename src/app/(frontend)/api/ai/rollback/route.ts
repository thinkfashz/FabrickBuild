import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'

import { sanitizeCSS, sanitizeLayout } from '@/lib/ai/proposals'
import { requireAdmin } from '@/lib/integrations/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function relationshipID(value: unknown): string | number | undefined {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    return (value as { id: string | number }).id
  }
  return undefined
}

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    const { changeId, publish = false } = await request.json()
    if (!changeId) return Response.json({ ok: false, error: 'Falta el cambio.' }, { status: 400 })

    const change = await (payload as any).findByID({
      collection: 'ai-changes',
      id: changeId,
      depth: 0,
      overrideAccess: true,
    })
    if (change.status !== 'applied' || !change.previousSnapshot) {
      return Response.json({ ok: false, error: 'Este cambio no tiene un snapshot aplicable.' }, { status: 409 })
    }

    const targetPageID = relationshipID(change.targetPage)
    if (!targetPageID) throw new Error('No se encontró la página de destino.')
    const page = await (payload as any).findByID({
      collection: 'pages',
      id: targetPageID,
      depth: 0,
      overrideAccess: true,
    })
    if (String(page.aiDesignVersion || '') !== String(change.id)) {
      return Response.json(
        { ok: false, error: 'La página recibió cambios posteriores. No se realizó un rollback destructivo.' },
        { status: 409 },
      )
    }

    const snapshot = change.previousSnapshot as Record<string, unknown>
    const layout = sanitizeLayout(snapshot.layout)
    const aiStyle = snapshot.aiStyle ? sanitizeCSS(snapshot.aiStyle) : ''
    const status = publish ? 'published' : String(snapshot.status || 'draft')

    await (payload as any).update({
      collection: 'pages',
      id: targetPageID,
      overrideAccess: true,
      draft: status !== 'published',
      data: {
        layout,
        aiStyle,
        aiDesignVersion: snapshot.aiDesignVersion || null,
        _status: status,
        ...(status === 'published' ? { publishedAt: new Date().toISOString() } : {}),
      },
    })

    await (payload as any).update({
      collection: 'ai-changes',
      id: change.id,
      overrideAccess: true,
      data: { status: 'rolled-back', rolledBackAt: new Date().toISOString() },
    })

    const path = page.slug === 'home' ? '/' : `/${page.slug}`
    revalidatePath(path)
    return Response.json({ ok: true, path })
  } catch (error) {
    console.error('FabrickBuild AI rollback error:', error)
    const status = Number((error as { status?: number })?.status || 500)
    const message = error instanceof Error ? error.message : 'No se pudo deshacer el cambio.'
    return Response.json({ ok: false, error: message }, { status })
  }
}
