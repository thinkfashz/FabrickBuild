import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AIPageStyle } from '@/components/AIPageStyle'
import { PageSurface } from '@/components/PageSurface'
import { RefreshRouteOnSave } from '@/components/RefreshRouteOnSave'
import { RenderBlocks } from '@/components/RenderBlocks'
import { getDraftPageBySlug } from '@/lib/queries'

type Args = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ secret?: string }>
}

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function PreviewPage({ params, searchParams }: Args) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const expected = process.env.PREVIEW_SECRET
  if (!expected || query.secret !== expected) notFound()

  const page = await getDraftPageBySlug(slug)
  if (!page) notFound()
  const blocks = (page.layout || []) as unknown as Record<string, unknown>[]

  return (
    <PageSurface page={page as Record<string, unknown>}>
      <AIPageStyle css={page.aiStyle as string | undefined} />
      <RefreshRouteOnSave />
      <div className="ai-page ai-page--preview">
        <RenderBlocks blocks={blocks} />
      </div>
    </PageSurface>
  )
}
