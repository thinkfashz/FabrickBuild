import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AIPageStyle } from '@/components/AIPageStyle'
import LivePagePreview from '@/components/LivePagePreview'
import { RefreshRouteOnSave } from '@/components/RefreshRouteOnSave'
import { RenderBlocks } from '@/components/RenderBlocks'
import { pageAppearanceProps } from '@/lib/appearance'
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

  const blocks = (page.layout || []) as unknown as Record<string, unknown>[]
  const pageProps = pageAppearanceProps(page as Record<string, unknown>)

  return (
    <>
      <AIPageStyle css={page.aiStyle as string | undefined} />
      <RefreshRouteOnSave />
      <LivePagePreview initialPage={page as Record<string, unknown>} />
      <div className="page-server-render">
        <main className={`ai-page ${pageProps.className}`} style={pageProps.style}>
          <div className="fabrick-page-content"><RenderBlocks blocks={blocks} /></div>
        </main>
      </div>
    </>
  )
}
