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
