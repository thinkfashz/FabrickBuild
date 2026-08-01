'use client'

import { FrameSequenceBackground } from '@/components/FrameSequenceBackground'
import { getPortfolioFrameSequence } from '@/lib/appearance'
import { getMediaURL } from '@/lib/media'

type Doc = Record<string, any>

type Assignment = {
  id?: string
  enabled?: boolean
  background?: Doc | number | string | null
  scrollAxis?: 'vertical' | 'horizontal'
  playbackDirection?: 'forward' | 'reverse'
  viewportLength?: number
  label?: string
}

export function AssignedBackgrounds({ assignments = [] }: { assignments?: Assignment[] }) {
  const active = assignments.filter((item) => item?.enabled !== false && item?.background && typeof item.background === 'object')
  if (!active.length) return null

  return (
    <div className="assigned-backgrounds" aria-label="Experiencias multimedia de la página">
      {active.slice(0, 4).map((item, index) => {
        const background = item.background as Doc
        const axis = item.scrollAxis === 'horizontal' ? 'horizontal' : 'vertical'
        const direction = item.playbackDirection === 'reverse' ? 'reverse' : 'forward'
        const viewportLength = Math.min(8, Math.max(1, Number(item.viewportLength) || 3))
        const sequence = getPortfolioFrameSequence({
          runtimeBackground: {
            ...background,
            playback: {
              ...(background.playback || {}),
              scrollAxis: axis,
              playbackDirection: direction,
            },
          },
        })
        const videoURL = background.kind === 'video'
          ? getMediaURL(background.video) || background.externalURL || null
          : null

        return (
          <section
            key={item.id || background.id || index}
            className={`background-experience background-experience--${axis}`}
            data-background-axis={axis}
            data-background-index={index}
            style={{
              minHeight: axis === 'vertical' ? `${viewportLength * 100}vh` : '100vh',
              overflowX: axis === 'horizontal' ? 'auto' : undefined,
              overflowY: axis === 'horizontal' ? 'hidden' : undefined,
              scrollSnapType: axis === 'horizontal' ? 'x mandatory' : undefined,
            }}
          >
            {axis === 'horizontal' && (
              <div
                className="background-experience__horizontal-track"
                aria-hidden="true"
                style={{ width: `${viewportLength * 100}vw`, height: '1px' }}
              />
            )}
            <div
              className="background-experience__sticky"
              style={{
                position: 'sticky',
                insetBlockStart: 0,
                insetInlineStart: 0,
                width: '100vw',
                height: '100vh',
                overflow: 'hidden',
                scrollSnapAlign: axis === 'horizontal' ? 'start' : undefined,
              }}
            >
              {sequence && <FrameSequenceBackground sequence={sequence} forceScroll />}
              {!sequence && videoURL && (
                <video
                  src={videoURL}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  style={{ width: '100%', height: '100%', objectFit: background.playback?.fit === 'contain' ? 'contain' : 'cover' }}
                  aria-label={item.label || background.name || `Background ${index + 1}`}
                />
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
