import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'

import { sanitizeCSS, sanitizeLayout, type DesignProposal } from '@/lib/ai/proposals'
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
    const body = await request.json()
    const changeID = body.changeId as string | number | undefined
    const selectedIndex = Number(body.selectedIndex)
    const publish = body.publish === true

    if (!changeID || ![0, 1].includes(selectedIndex)) {
      return Response.json({ ok: false, error: 'Selección inválida.' }, { status: 400 })
    }

    const change = await (payload as any).findByID({
      collection: 'ai-changes',
      id: changeID,
      depth: 0,
      overrideAccess: true,
    })
    if (change.status === 'applied') {
      return Response.json({ ok: false, error: 'Este cambio ya fue aplicado.' }, { status: 409 })
    }

    const targetPageID = relationshipID(change.targetPage)
    if (!targetPageID) throw new Error('La propuesta no tiene una página de destino válida.')
    const page = await (payload as any).findByID({
      collection: 'pages',
      id: targetPageID,
      depth: 0,
      overrideAccess: true,
    })
    const proposal = (Array.isArray(change.proposals) ? change.proposals[selectedIndex] : null) as
      | DesignProposal
      | undefined
    if (!proposal) throw new Error('No se encontró la propuesta seleccionada.')

    const layout = sanitizeLayout(proposal.layout)
    const aiStyle = sanitizeCSS(proposal.css)
    const previousSnapshot = {
      layout: page.layout || [],
      aiStyle: page.aiStyle || '',
      aiDesignVersion: page.aiDesignVersion || null,
      status: page._status || 'draft',
    }

    const updatedPage = await (payload as any).update({
      collection: 'pages',
      id: targetPageID,
      overrideAccess: true,
      draft: !publish,
      data: {
        layout,
        aiStyle,
        aiDesignVersion: String(change.id),
        _status: publish ? 'published' : 'draft',
        ...(publish ? { publishedAt: new Date().toISOString() } : {}),
      },
    })

    await (payload as any).update({
      collection: 'ai-changes',
      id: change.id,
      overrideAccess: true,
      data: {
        status: 'applied',
        selectedProposal: selectedIndex,
        previousSnapshot,
        appliedSnapshot: {
          layout,
          aiStyle,
          aiDesignVersion: String(change.id),
          status: publish ? 'published' : 'draft',
        },
        appliedAt: new Date().toISOString(),
        lastError: null,
      },
    })

    const path = page.slug === 'home' ? '/' : `/${page.slug}`
    revalidatePath(path)
    return Response.json({ ok: true, page: { id: updatedPage.id, slug: updatedPage.slug }, path })
  } catch (error) {
    console.error('FabrickBuild AI apply error:', error)
    const status = Number((error as { status?: number })?.status || 500)
    const message = error instanceof Error ? error.message : 'No se pudo aplicar la propuesta.'
    return Response.json({ ok: false, error: message }, { status })
  }
}
