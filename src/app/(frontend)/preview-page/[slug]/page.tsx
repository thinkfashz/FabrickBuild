import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AIPageStyle } from '@/components/AIPageStyle'
import { FabrickSignatureExperience } from '@/components/FabrickSignatureExperience'
import { PageSurface } from '@/components/PageSurface'
import { RefreshRouteOnSave } from '@/components/RefreshRouteOnSave'
import { RenderBlocks } from '@/components/RenderBlocks'
import { portfolioLayoutFromPage } from '@/lib/home-template'
import { getDraftGlobals, getDraftPageBySlug, getHeroBackground } from '@/lib/queries'

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

  const [page, globals, defaultBackground] = await Promise.all([
    getDraftPageBySlug(slug),
    getDraftGlobals(),
    slug === 'home' ? getHeroBackground() : Promise.resolve(null),
  ])
  if (!page) notFound()

  const settings = globals.settings as Record<string, any> | null
  const experience = String(settings?.homepageExperience || 'luxury')
  const showSignature = slug === 'home' && experience === 'luxury'
  const showPortfolio = slug === 'home' && experience === 'portfolio'
  const selectedBackground =
    page.backgroundSource === 'saved' && page.savedBackground && typeof page.savedBackground === 'object'
      ? page.savedBackground
      : defaultBackground

  if (showPortfolio) {
    const portfolioBlocks = portfolioLayoutFromPage(
      (page.layout || []) as Record<string, any>[],
      selectedBackground as Record<string, any> | null,
    )
    return (
      <>
        <AIPageStyle css={page.aiStyle as string | undefined} />
        <RefreshRouteOnSave />
        <main className="ai-page ai-page--preview portfolio-factory-page">
          <RenderBlocks blocks={portfolioBlocks} />
        </main>
      </>
    )
  }

  const sourceBlocks = (page.layout || []) as Record<string, any>[]
  const blocks = showSignature && settings?.hideFirstHeroWhenLuxury !== false && sourceBlocks[0]?.blockType === 'hero'
    ? sourceBlocks.slice(1)
    : sourceBlocks
  const video = page.backgroundSource === 'video' ? page.backgroundVideo : null

  return (
    <PageSurface page={page as Record<string, unknown>} suppressMedia={showSignature}>
      <AIPageStyle css={page.aiStyle as string | undefined} />
      <RefreshRouteOnSave />
      <div className="ai-page ai-page--preview">
        {showSignature && (
          <FabrickSignatureExperience
            background={selectedBackground as never}
            backgroundVideo={video as never}
            performance={settings?.performance as never}
          />
        )}
        <RenderBlocks blocks={blocks} />
      </div>
    </PageSurface>
  )
}
