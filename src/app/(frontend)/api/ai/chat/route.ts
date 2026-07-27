import config from '@payload-config'
import { getPayload } from 'payload'

import {
  PROVIDER_CATALOG,
  streamProviderChat,
  type ChatMessage,
  type ChatStreamEvent,
} from '@/lib/integrations/providers'
import { addUsage, getIntegration, requireAdmin } from '@/lib/integrations/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

function sse(event: ChatStreamEvent | { type: 'error'; value: string }) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.value)}\n\n`
}

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config })
    await requireAdmin(payload, request)
    const body = await request.json()
    const integrationID = body.integrationId as string | number | undefined
    const messages = (Array.isArray(body.messages) ? body.messages : []) as ChatMessage[]

    if (!integrationID || !messages.length) {
      return Response.json({ ok: false, error: 'Faltan la integración o los mensajes.' }, { status: 400 })
    }

    const { document, credentials } = await getIntegration(payload, integrationID)
    if (!PROVIDER_CATALOG[document.provider]?.ai) {
      return Response.json({ ok: false, error: 'La integración seleccionada no es un proveedor de IA.' }, { status: 400 })
    }
    if (document.enabled === false) {
      return Response.json({ ok: false, error: 'La integración está desactivada.' }, { status: 409 })
    }

    const model = String(body.model || document.defaultModel || '').trim()
    if (!model) {
      return Response.json({ ok: false, error: 'Selecciona un modelo antes de enviar.' }, { status: 400 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        void (async () => {
          try {
            const usage = await streamProviderChat({
              integration: document,
              credentials,
              model,
              messages: messages.slice(-40).map((message) => ({
                role: message.role,
                content: String(message.content || '').slice(0, 120_000),
              })),
              signal: request.signal,
              onEvent(event) {
                controller.enqueue(encoder.encode(sse(event)))
              },
            })
            await addUsage(payload, document, usage)
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Falló la respuesta del proveedor.'
            controller.enqueue(encoder.encode(sse({ type: 'error', value: message })))
          } finally {
            controller.close()
          }
        })()
      },
      cancel() {
        // El signal de la solicitud cancela también el fetch al proveedor.
      },
    })

    return new Response(stream, {
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream; charset=utf-8',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 500)
    const message = error instanceof Error ? error.message : 'No se pudo iniciar el chat.'
    return Response.json({ ok: false, error: message }, { status })
  }
}
