/* THIS FILE IS THE PAYLOAD ADMIN PAGE. */
import type { Metadata } from 'next'
import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { getPayload } from 'payload'
import { ensureRuntimeSchema } from '@/system/runtimeSchema'
import { importMap } from '../importMap'

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<Record<string, string | string[]>>
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams })

export default async function Page({ params, searchParams }: Args) {
  const payload = await getPayload({ config })
  await ensureRuntimeSchema(payload)
  return RootPage({ config, params, searchParams, importMap })
}
