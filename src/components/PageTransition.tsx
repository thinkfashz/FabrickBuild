'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type TransitionPhase = 'idle' | 'leaving' | 'entering'

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

    timerRef.current = window.setTimeout(
      () => {
        setPhase('idle')
        delete document.documentElement.dataset.routeTransition
      },
      reducedMotionRef.current ? 80 : 820,
    )

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
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
        router.push(`${destination.pathname}${destination.search}${destination.hash}`)
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
