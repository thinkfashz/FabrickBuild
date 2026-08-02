'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type TransitionPhase = 'idle' | 'leaving' | 'entering'

type RouteScrollDetail = {
  top: number
}

const routeNames: Array<[RegExp, string]> = [
  [/^\/servicios\/.+/, 'Abriendo servicio'],
  [/^\/servicios/, 'Explorando servicios'],
  [/^\/proyectos\/.+/, 'Abriendo proyecto'],
  [/^\/proyectos/, 'Explorando proyectos'],
  [/^\/nosotros/, 'Conociendo el método'],
  [/^\/$/, 'Volviendo al inicio'],
]

function routeLabel(pathname: string) {
  return routeNames.find(([pattern]) => pattern.test(pathname))?.[1] || 'Cargando experiencia'
}

function destinationScrollTop() {
  const hash = window.location.hash
  if (!hash) return 0

  try {
    const target = document.getElementById(decodeURIComponent(hash.slice(1)))
    if (!target) return 0
    return Math.max(0, target.getBoundingClientRect().top + window.scrollY - 72)
  } catch {
    return 0
  }
}

function requestRouteScroll(top: number) {
  window.dispatchEvent(
    new CustomEvent<RouteScrollDetail>('fabrick:route-scroll', {
      detail: { top },
    }),
  )
  window.scrollTo(0, top)
}

export function PageTransition() {
  const pathname = usePathname()
  const router = useRouter()
  const timerRef = useRef<number | null>(null)
  const reducedMotionRef = useRef(false)
  const [phase, setPhase] = useState<TransitionPhase>('entering')
  const [label, setLabel] = useState(() => routeLabel(pathname))

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)

    setLabel(routeLabel(pathname))
    setPhase('entering')
    document.documentElement.dataset.routeTransition = 'entering'

    let firstFrame = 0
    let secondFrame = 0
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        requestRouteScroll(destinationScrollTop())
      })
    })

    timerRef.current = window.setTimeout(
      () => {
        setPhase('idle')
        delete document.documentElement.dataset.routeTransition
      },
      reducedMotionRef.current ? 80 : 820,
    )

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      if (firstFrame) window.cancelAnimationFrame(firstFrame)
      if (secondFrame) window.cancelAnimationFrame(secondFrame)
    }
  }, [pathname])

  useEffect(() => {
    const handleNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const target = event.target instanceof Element ? event.target : null
      const anchor = target?.closest<HTMLAnchorElement>('a[href]')
      if (!anchor) return
      if (anchor.dataset.noTransition !== undefined || anchor.hasAttribute('download')) return
      if (anchor.target && anchor.target !== '_self') return

      const rawHref = anchor.getAttribute('href') || ''
      if (
        !rawHref ||
        rawHref.startsWith('#') ||
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:') ||
        rawHref.startsWith('javascript:')
      ) {
        return
      }

      const destination = new URL(anchor.href, window.location.href)
      if (destination.origin !== window.location.origin) return

      const currentRoute = `${window.location.pathname}${window.location.search}`
      const nextRoute = `${destination.pathname}${destination.search}`
      if (currentRoute === nextRoute || reducedMotionRef.current) return

      event.preventDefault()
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)

      setLabel(routeLabel(destination.pathname))
      setPhase('leaving')
      document.documentElement.dataset.routeTransition = 'leaving'

      timerRef.current = window.setTimeout(() => {
        requestRouteScroll(0)
        router.push(`${destination.pathname}${destination.search}${destination.hash}`, { scroll: false })
      }, 460)
    }

    document.addEventListener('click', handleNavigation, true)
    return () => document.removeEventListener('click', handleNavigation, true)
  }, [router])

  return (
    <div
      className="route-transition"
      data-phase={phase}
      aria-hidden={phase === 'idle' ? 'true' : undefined}
      aria-live="polite"
    >
      <span className="route-transition__panel route-transition__panel--back" />
      <span className="route-transition__panel route-transition__panel--middle" />
      <span className="route-transition__panel route-transition__panel--front" />
      <div className="route-transition__status">
        <span className="route-transition__mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <div>
          <small>FABRICKBUILD DIGITAL</small>
          <strong>{label}</strong>
        </div>
      </div>
      <span className="route-transition__progress" aria-hidden="true" />
    </div>
  )
}
