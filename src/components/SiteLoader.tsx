'use client'

import { animate } from 'animejs'
import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'

import { getMediaAlt, getMediaURL } from '@/lib/media'

type LoaderSettings = {
  enabled?: boolean
  logo?: unknown
  text?: string
  animation?: 'glow' | 'pulse' | 'fade'
  backgroundColor?: string
  foregroundColor?: string
  minimumDuration?: number
  maximumDuration?: number
}

const safeColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|[a-z]+$)/i.test(value.trim()) ? value : fallback

export function SiteLoader({ settings, fallbackLogo }: { settings?: LoaderSettings | null; fallbackLogo?: unknown }) {
  const [visible, setVisible] = useState(settings?.enabled !== false)
  const [progress, setProgress] = useState(8)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const logoDoc = settings?.logo || fallbackLogo
  const logo = getMediaURL(logoDoc as never, 'thumbnail')
  const minimum = Math.min(1200, Math.max(0, Number(settings?.minimumDuration ?? 450)))
  const maximum = Math.min(4000, Math.max(1000, Number(settings?.maximumDuration ?? 4000)))
  const colors = useMemo(
    () => ({
      background: safeColor(settings?.backgroundColor, '#10110f'),
      foreground: safeColor(settings?.foregroundColor, '#f4c84b'),
    }),
    [settings?.backgroundColor, settings?.foregroundColor],
  )

  useEffect(() => {
    if (settings?.enabled === false) return
    if (window.self !== window.top) {
      setVisible(false)
      return
    }

    const root = rootRef.current
    const startedAt = performance.now()
    let loaded = document.readyState === 'complete'
    let closed = false

    const finish = () => {
      if (closed) return
      const elapsed = performance.now() - startedAt
      if (!loaded && elapsed < maximum) return
      const remaining = Math.max(0, minimum - elapsed)
      closed = true
      window.setTimeout(() => {
        if (!root) return setVisible(false)
        animate(root, {
          opacity: { from: 1, to: 0 },
          duration: 360,
          ease: 'outQuad',
          onComplete: () => setVisible(false),
        })
      }, remaining)
    }

    const onLoad = () => {
      loaded = true
      setProgress(100)
      finish()
    }

    window.addEventListener('load', onLoad, { once: true })
    const maxTimer = window.setTimeout(() => {
      loaded = true
      setProgress(100)
      finish()
    }, maximum)
    const progressTimer = window.setInterval(() => {
      setProgress((current) => Math.min(94, current + Math.max(1, Math.round((94 - current) / 6))))
    }, 140)

    if (loaded) onLoad()

    const mark = root?.querySelector('.site-loader__mark')
    if (mark && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const animation = settings?.animation || 'glow'
      animate(mark, {
        opacity: animation === 'fade' ? [{ from: 0.45, to: 1 }] : [{ from: 0.7, to: 1 }, { from: 1, to: 0.78 }],
        scale: animation === 'pulse' ? [{ from: 0.96, to: 1.03 }, { from: 1.03, to: 1 }] : { from: 0.98, to: 1 },
        filter: animation === 'glow' ? ['drop-shadow(0 0 0px currentColor)', 'drop-shadow(0 0 18px currentColor)'] : undefined,
        duration: 950,
        alternate: true,
        loop: true,
        ease: 'inOutSine',
      })
    }

    return () => {
      window.removeEventListener('load', onLoad)
      window.clearTimeout(maxTimer)
      window.clearInterval(progressTimer)
    }
  }, [maximum, minimum, settings?.animation, settings?.enabled])

  if (!visible || settings?.enabled === false) return null

  return (
    <div
      ref={rootRef}
      className="site-loader"
      role="status"
      aria-live="polite"
      style={{ background: colors.background, color: colors.foreground }}
    >
      <div className="site-loader__content">
        <div className="site-loader__mark">
          {logo ? (
            <Image src={logo} alt={getMediaAlt(logoDoc as never, 'FabrickBuild')} fill priority sizes="96px" />
          ) : (
            <strong>F</strong>
          )}
        </div>
        <p>{settings?.text || 'Preparando tu experiencia'}</p>
        <div className="site-loader__rail" aria-hidden="true"><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
        <small>{progress}%</small>
      </div>
    </div>
  )
}
