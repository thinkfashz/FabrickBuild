'use client'

import { animate } from 'animejs'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef } from 'react'

type Preset = 'none' | 'fade-up' | 'fade' | 'scale' | 'slide-left' | 'slide-right'

type Props = {
  children: ReactNode
  className?: string
  style?: CSSProperties
  preset?: Preset
  duration?: number
  delay?: number
  as?: 'div' | 'article'
}

const transforms: Record<Exclude<Preset, 'none' | 'fade'>, Record<string, { from: number; to: number }>> = {
  'fade-up': { translateY: { from: 26, to: 0 } },
  scale: { scale: { from: 0.96, to: 1 } },
  'slide-left': { translateX: { from: -34, to: 0 } },
  'slide-right': { translateX: { from: 34, to: 0 } },
}

export function AnimeSurface({
  children,
  className = '',
  style,
  preset = 'fade-up',
  duration = 700,
  delay = 0,
  as = 'div',
}: Props) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || preset === 'none') return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    let played = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || played) return
        played = true
        observer.disconnect()

        const movement = preset !== 'fade' ? transforms[preset as keyof typeof transforms] : {}
        animate(element, {
          opacity: { from: 0, to: 1 },
          ...movement,
          duration: Math.min(1800, Math.max(150, duration)),
          delay: Math.min(1200, Math.max(0, delay)),
          ease: 'outExpo',
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [delay, duration, preset])

  const Tag = as
  return (
    <Tag ref={ref as never} className={`anime-surface ${className}`.trim()} style={style}>
      {children}
    </Tag>
  )
}
