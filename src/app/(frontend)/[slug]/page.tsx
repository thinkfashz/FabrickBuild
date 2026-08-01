import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AIPageStyle } from '@/components/AIPageStyle'
import { PageSurface } from '@/components/PageSurface'
import { RenderBlocks } from '@/components/RenderBlocks'
import { getPageBySlug } from '@/lib/queries'

type Args = { params: Promise<{ slug: string }> }

export const revalidate = 300

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const page = await getPageBySlug(slug)
  if (!page) return {}
  const seo = (page.seo || {}) as { title?: string; description?: string; noIndex?: boolean }
  return {
    title: seo.title || page.title,
    description: seo.description,
    robots: seo.noIndex ? { index: false, follow: false } : undefined,
  }
}

export default async function DynamicPage({ params }: Args) {
  const { slug } = await params
  const page = await getPageBySlug(slug)
  if (!page) notFound()

  const blocks = (page.layout || []) as unknown as Record<string, unknown>[]

  return (
    <PageSurface page={page as Record<string, unknown>}>
      <AIPageStyle css={page.aiStyle as string | undefined} />
      <div className="ai-page">
        <RenderBlocks blocks={blocks} />
      </div>
    </PageSurface>
  )
}
