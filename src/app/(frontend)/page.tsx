import { AIPageStyle } from '@/components/AIPageStyle'
import LivePagePreview from '@/components/LivePagePreview'
import { RefreshRouteOnSave } from '@/components/RefreshRouteOnSave'
import { RenderBlocks } from '@/components/RenderBlocks'
import { pageAppearanceProps } from '@/lib/appearance'
import { portfolioHomeLayout } from '@/lib/home-template'
import { getPortfolioHomePage } from '@/lib/queries'

export default async function HomePage() {
  const page = await getPortfolioHomePage()
  const layout = (page?.layout as Record<string, unknown>[]) || portfolioHomeLayout()
  const previewPage = { ...(page || {}), slug: 'home', layout }
  const pageProps = pageAppearanceProps(previewPage)
  return (
    <>
      <AIPageStyle css={page?.aiStyle as string | undefined} />
      <RefreshRouteOnSave />
      <LivePagePreview initialPage={previewPage} />
      <div className="page-server-render">
        <main className={`ai-page ${pageProps.className}`} style={pageProps.style}>
          <div className="fabrick-page-content">
            <RenderBlocks blocks={layout} />
          </div>
        </main>
      </div>
    </>
  )
}
