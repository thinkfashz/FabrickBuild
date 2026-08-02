'use client'

import Lenis from 'lenis'
import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

type RouteScrollEvent = CustomEvent<{ top?: number }>

export function SmoothScroll() {
  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => {
        window.history.scrollRestoration = previousScrollRestoration
      }
    }

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
    const handleRouteScroll = (event: Event) => {
      const requestedTop = Number((event as RouteScrollEvent).detail?.top || 0)
      const top = Number.isFinite(requestedTop) ? Math.max(0, requestedTop) : 0

      lenis.stop()
      lenis.scrollTo(top, { immediate: true, force: true })
      window.scrollTo(0, top)
      lenis.start()
      window.requestAnimationFrame(refresh)
    }

    lenis.on('scroll', updateScrollTrigger)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    window.addEventListener('pageshow', refresh)
    window.addEventListener('resize', refresh, { passive: true })
    window.addEventListener('fabrick:route-scroll', handleRouteScroll)

    return () => {
      lenis.off('scroll', updateScrollTrigger)
      gsap.ticker.remove(tick)
      window.removeEventListener('pageshow', refresh)
      window.removeEventListener('resize', refresh)
      window.removeEventListener('fabrick:route-scroll', handleRouteScroll)
      window.history.scrollRestoration = previousScrollRestoration
      lenis.destroy()
    }
  }, [])

  return null
}
