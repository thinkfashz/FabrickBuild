'use client'

import { useEffect, useMemo, useState } from 'react'

type LoaderSettings = {
  enabled?: boolean
  text?: string
  animation?: 'glow' | 'pulse' | 'fade'
  backgroundColor?: string
  foregroundColor?: string
  minimumDuration?: number
  maximumDuration?: number
}

type LoaderPhase = 'visible' | 'closing' | 'hidden'

const safeColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|[a-z]+$)/i.test(value.trim())
    ? value
    : fallback

function waitForPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))
  })
}

export function SiteLoader({ settings }: { settings?: LoaderSettings | null; fallbackLogo?: unknown }) {
  const [phase, setPhase] = useState<LoaderPhase>(settings?.enabled === false ? 'hidden' : 'visible')
  const [progress, setProgress] = useState(12)
  const minimum = Math.min(650, Math.max(160, Number(settings?.minimumDuration ?? 260)))
  const maximum = Math.min(1800, Math.max(700, Number(settings?.maximumDuration ?? 1400)))
  const colors = useMemo(
    () => ({
      background: safeColor(settings?.backgroundColor, '#070b0c'),
      foreground: safeColor(settings?.foregroundColor, '#b8d7c5'),
    }),
    [settings?.backgroundColor, settings?.foregroundColor],
  )

  useEffect(() => {
    if (settings?.enabled === false || window.self !== window.top) {
      setPhase('hidden')
      return
    }

    const startedAt = performance.now()
    let finished = false

    const close = () => {
      if (finished) return
      finished = true
      setProgress(100)
      const elapsed = performance.now() - startedAt
      const delay = Math.max(0, minimum - elapsed)
      window.setTimeout(() => {
        setPhase('closing')
        window.setTimeout(() => setPhase('hidden'), 280)
      }, delay)
    }

    const fontsReady = document.fonts?.ready ?? Promise.resolve()
    const softReady = Promise.race([
      Promise.allSettled([fontsReady, waitForPaint()]),
      new Promise<void>((resolve) => window.setTimeout(resolve, 620)),
    ])

    void softReady.then(close)

    const hardStop = window.setTimeout(close, maximum)
    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current
        const step = Math.max(2, Math.round((92 - current) / 5))
        return Math.min(92, current + step)
      })
    }, 90)

    return () => {
      window.clearTimeout(hardStop)
      window.clearInterval(progressTimer)
    }
  }, [maximum, minimum, settings?.enabled])

  if (phase === 'hidden' || settings?.enabled === false) return null

  return (
    <div
      className="site-loader site-loader--digital"
      data-phase={phase}
      role="status"
      aria-live="polite"
      style={{ background: colors.background, color: colors.foreground }}
    >
      <div className="site-loader__content">
        <strong className="site-loader__wordmark">
          FABRICK <span>BUILD</span>
        </strong>
        <p>{settings?.text || 'Cargando experiencia digital'}</p>
        <div className="site-loader__rail" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        <small>{progress}%</small>
      </div>
    </div>
  )
}
