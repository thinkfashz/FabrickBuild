import config from '@payload-config'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { AIPageStyle } from '@/components/AIPageStyle'
import { PageSurface } from '@/components/PageSurface'
import { RefreshRouteOnSave } from '@/components/RefreshRouteOnSave'
import { RenderBlocks } from '@/components/RenderBlocks'
import VisualEditorRealBridge from '@/components/editor/VisualEditorRealBridge'
import { recoverBackgroundFromBlob } from '@/lib/blob-frame-recovery'
import { portfolioLayoutFromPage } from '@/lib/home-template'
import { getDraftGlobals, getDraftPageBySlug, getHeroBackground } from '@/lib/queries'
import type { EditorBlock } from '@/lib/visual-editor'

type Doc = Record<string, any>
type Args = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ secret?: string; visualEditor?: string }>
}

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false } }

function compactEditorBackground(background: Doc | null) {
  if (!background) return null
  const candidate =
    background.poster ||
    background.image ||
    (Array.isArray(background.mobileFrames) ? background.mobileFrames[0] : null) ||
    (Array.isArray(background.desktopFrames) ? background.desktopFrames[0] : null)
  if (!candidate) return null
  const frame = typeof candidate === 'string' ? { url: candidate, alt: '' } : candidate
  return {
    ...background,
    poster: frame,
    image: frame,
    desktopFrames: [frame],
    mobileFrames: [frame],
    playback: {
      ...(background.playback || {}),
      trigger: 'scroll',
      pin: false,
      scrub: 0.2,
    },
  }
}

function editableLayout(blocks: Doc[]): EditorBlock[] {
  return blocks.map((block) => {
    const { runtimeBackground: _runtimeBackground, ...editable } = block
    return editable as EditorBlock
  })
}

export default async function PreviewPage({ params, searchParams }: Args) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const expected = process.env.PREVIEW_SECRET
  const validSecret = Boolean(expected && query.secret === expected)
  const visualEditor = query.visualEditor === '1'

  if (!validSecret) {
    const payload = await getPayload({ config })
    const auth = await payload.auth({ headers: await headers(), canSetHeaders: false })
    if (!auth.user || (auth.user as { role?: string }).role !== 'admin') notFound()
  }

  const [page, globals, defaultBackground] = await Promise.all([
    getDraftPageBySlug(slug),
    getDraftGlobals(),
    slug === 'home' ? getHeroBackground() : Promise.resolve(null),
  ])
  if (!page) notFound()

  const settings = globals.settings as Doc | null
  const experience = String(settings?.homepageExperience || 'luxury')
  const usePortfolioFactory = slug === 'home' && (experience === 'luxury' || experience === 'portfolio')
  const selectedBackgroundCandidate =
    page.backgroundSource === 'saved' && page.savedBackground && typeof page.savedBackground === 'object'
      ? page.savedBackground
      : defaultBackground
  const selectedBackground = slug === 'home'
    ? await recoverBackgroundFromBlob(selectedBackgroundCandidate as Doc | null)
    : selectedBackgroundCandidate

  if (usePortfolioFactory) {
    const portfolioBlocks = portfolioLayoutFromPage(
      (page.layout || []) as Doc[],
      visualEditor
        ? compactEditorBackground(selectedBackground as Doc | null)
        : selectedBackground as Doc | null,
    )
    return (
      <>
        <AIPageStyle css={page.aiStyle as string | undefined} />
        <RefreshRouteOnSave />
        {visualEditor ? <VisualEditorRealBridge effectiveLayout={editableLayout(portfolioBlocks)} /> : null}
        <main className={`ai-page ai-page--preview portfolio-factory-page${visualEditor ? ' visual-editor-real-page' : ''}`}>
          <RenderBlocks blocks={portfolioBlocks} />
        </main>
      </>
    )
  }

  const blocks = (page.layout || []) as Doc[]
  return (
    <PageSurface page={page as Record<string, unknown>}>
      <AIPageStyle css={page.aiStyle as string | undefined} />
      <RefreshRouteOnSave />
      {visualEditor ? <VisualEditorRealBridge effectiveLayout={editableLayout(blocks)} /> : null}
      <div className={`ai-page ai-page--preview${visualEditor ? ' visual-editor-real-page' : ''}`}>
        <RenderBlocks blocks={blocks} />
      </div>
    </PageSurface>
  )
}
