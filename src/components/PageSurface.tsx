import Image from 'next/image'
import type { ReactNode } from 'react'

import { appearanceProps } from '@/lib/appearance'
import { getMediaAlt, getMediaURL } from '@/lib/media'

type Doc = Record<string, any>

const asDoc = (value: unknown): Doc | null => (value && typeof value === 'object' ? (value as Doc) : null)

export function PageSurface({ page, children }: { page?: Doc | null; children: ReactNode }) {
  const source = String(page?.backgroundSource || 'color')
  const saved = asDoc(page?.savedBackground)
  const savedImage = saved?.image || saved?.poster || saved?.mobileFrames?.[0] || saved?.desktopFrames?.[0]
  const desktopDoc = source === 'saved' ? savedImage : page?.backgroundMedia
  const mobileDoc = page?.mobileBackgroundMedia || desktopDoc
  const desktopImage = getMediaURL(desktopDoc, 'hero')
  const mobileImage = getMediaURL(mobileDoc, 'hero')
  const resolvedMobileImage = mobileImage || desktopImage
  const videoDoc = source === 'video' ? page?.backgroundVideo : null
  const videoURL = getMediaURL(videoDoc)
  const external = source === 'url' && typeof page?.backgroundURL === 'string' ? page.backgroundURL : source === 'saved' ? saved?.externalURL : null
  const { className, style } = appearanceProps(page?.pageAppearance, 'page-surface')

  if (external && /\.(mp4|webm)(\?|$)/i.test(external)) {
    // Rendered below as video.
  } else if (external && /^(https?:\/\/|\/)/i.test(external)) {
    style.backgroundImage = `url("${String(external).replace(/["'()]/g, '')}")`
  }

  const externalVideo = external && /\.(mp4|webm)(\?|$)/i.test(external) ? external : null

  return (
    <div className={className} style={style}>
      {(desktopImage || resolvedMobileImage) && (
        <div className="page-surface__media" aria-hidden="true">
          {desktopImage && (
            <Image
              className="page-surface__image page-surface__image--desktop"
              src={desktopImage}
              alt=""
              fill
              sizes="100vw"
              priority={page?.slug === 'home'}
            />
          )}
          {resolvedMobileImage && (
            <Image
              className="page-surface__image page-surface__image--mobile"
              src={resolvedMobileImage}
              alt={getMediaAlt(mobileDoc, '')}
              fill
              sizes="100vw"
              priority={page?.slug === 'home'}
            />
          )}
        </div>
      )}
      {(videoURL || externalVideo) && (
        <video
          className="page-surface__video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={desktopImage || undefined}
          aria-hidden="true"
        >
          <source src={videoURL || externalVideo || ''} />
        </video>
      )}
      <div className="cms-surface__overlay" aria-hidden="true" />
      <div className="page-surface__content">{children}</div>
    </div>
  )
}
