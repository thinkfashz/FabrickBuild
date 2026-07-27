import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AIPageStyle } from '@/components/AIPageStyle'
import { RefreshRouteOnSave } from '@/components/RefreshRouteOnSave'
import { RenderBlocks } from '@/components/RenderBlocks'
import { getPageBySlug } from '@/lib/queries'

type Args = { params: Promise<{ slug: string }> }

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
  return (
    <>
      <AIPageStyle css={page.aiStyle as string | undefined} />
      <RefreshRouteOnSave />
      <main className="ai-page">
        <RenderBlocks blocks={(page.layout || []) as Record<string, unknown>[]} />
      </main>
    </>
  )
}
