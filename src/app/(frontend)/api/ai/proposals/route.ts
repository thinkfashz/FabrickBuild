import config from '@payload-config'
import { getPayload } from 'payload'

import { buildProposalPrompt, parseProposalResponse } from '@/lib/ai/proposals'
import { streamProviderChat } from '@/lib/integrations/providers'
import { addUsage, getIntegration, requireAdmin } from '@/lib/integrations/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    const user = await requireAdmin(payload, request)
    const body = await request.json()
    const integrationID = body.integrationId as string | number | undefined
    const targetPageID = body.targetPageId as string | number | undefined
    const requestText = String(body.prompt || '').trim()

    if (!integrationID || !targetPageID || requestText.length < 8) {
      return Response.json(
        { ok: false, error: 'Selecciona proveedor, página y describe la mejora.' },
        { status: 400 },
      )
    }

    const { document, credentials } = await getIntegration(payload, integrationID)
    const page = await (payload as any).findByID({
      collection: 'pages',
      id: targetPageID,
      depth: 0,
      overrideAccess: true,
    })
    const model = String(body.model || document.defaultModel || '').trim()
    if (!model) return Response.json({ ok: false, error: 'Selecciona un modelo.' }, { status: 400 })

    const instruction = buildProposalPrompt({
      request: requestText,
      pageTitle: String(page.title || ''),
      pageSlug: String(page.slug || ''),
      currentLayout: page.layout || [],
    })

    let raw = ''
    const usage = await streamProviderChat({
      integration: document,
      credentials,
      model,
      signal: request.signal,
      messages: [
        {
          role: 'system',
          content:
            'Eres el motor seguro de diseño de FabrickBuild. Cumple exactamente el esquema solicitado y responde solo JSON.',
        },
        { role: 'user', content: instruction },
      ],
      onEvent(event) {
        if (event.type === 'token') raw += event.value
      },
    })
    await addUsage(payload, document, usage)

    const proposals = parseProposalResponse(raw)
    const change = await (payload as any).create({
      collection: 'ai-changes',
      overrideAccess: true,
      depth: 0,
      data: {
        title: `${page.title}: ${requestText.slice(0, 90)}`,
        targetPage: page.id,
        prompt: requestText,
        provider: document.provider,
        model,
        status: 'proposed',
        proposals,
        usage,
        createdBy: user.id,
      },
    })

    return Response.json({ ok: true, changeId: change.id, proposals, usage })
  } catch (error) {
    console.error('FabrickBuild AI proposals error:', error)
    const status = Number((error as { status?: number })?.status || 500)
    const message = error instanceof Error ? error.message : 'No se pudieron generar las propuestas.'
    return Response.json({ ok: false, error: message }, { status })
  }
}
