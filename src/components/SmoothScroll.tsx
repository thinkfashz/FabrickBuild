'use client'

import Lenis from 'lenis'
import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.registerPlugin(ScrollTrigger)
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches
    const lenis = new Lenis({
      autoRaf: false,
      duration: coarsePointer ? 0.78 : 1.05,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: coarsePointer ? 0.92 : 0.84,
      touchMultiplier: 1.05,
      anchors: { offset: -72, duration: 0.95 },
    })

    const updateScrollTrigger = () => ScrollTrigger.update()
    const tick = (time: number) => lenis.raf(time * 1000)
    const refresh = () => {
      lenis.resize()
      ScrollTrigger.refresh()
    }

    lenis.on('scroll', updateScrollTrigger)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    window.addEventListener('pageshow', refresh)
    window.addEventListener('resize', refresh, { passive: true })

    return () => {
      lenis.off('scroll', updateScrollTrigger)
      gsap.ticker.remove(tick)
      window.removeEventListener('pageshow', refresh)
      window.removeEventListener('resize', refresh)
      lenis.destroy()
    }
  }, [])

  return null
}
