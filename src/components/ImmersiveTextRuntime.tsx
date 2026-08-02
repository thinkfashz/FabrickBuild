'use client'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { MathUtils, Vector3 } from 'three'

const revealSelector = [
  '[data-runtime-reveal]',
  '.digital-section__heading',
  '.digital-service-card',
  '.digital-project-card',
  '.digital-process-grid article',
  '.digital-principle-grid article',
  '.digital-project-story article',
  '.digital-detail-block',
  '.digital-detail-aside',
  '.technology-icon-card',
  '.home-service-card',
  '.digital-contact-band .digital-shell > *',
  '.footer-minimal > *',
].join(',')

const depthSelector = [
  '.digital-service-card',
  '.digital-project-card',
  '.technology-icon-card',
  '.home-service-card',
  '.digital-detail-block',
  '.digital-detail-aside',
].join(',')

export function ImmersiveTextRuntime() {
  const pathname = usePathname()

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finePointer = window.matchMedia('(pointer: fine)').matches
    const cleanups: Array<() => void> = []
    const triggers: ScrollTrigger[] = []
    const tweens: gsap.core.Tween[] = []
    let frame = 0

    const revealImmediately = (element: HTMLElement) => {
      element.dataset.fabrickVisible = 'true'
      element.dataset.threeReveal = 'true'
      gsap.set(element, {
        clearProps: 'opacity,visibility,transform,filter,clipPath',
      })
    }

    const setup = () => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>(revealSelector))

      elements.forEach((element, index) => {
        element.dataset.fabrickVisible = 'true'
        element.dataset.threeReveal = 'true'

        if (reducedMotion) {
          revealImmediately(element)
          return
        }

        const depth = new Vector3(
          0,
          MathUtils.clamp(34 + (index % 4) * 7, 34, 58),
          -MathUtils.clamp(42 + (index % 5) * 11, 42, 86),
        )

        gsap.set(element, {
          autoAlpha: 0,
          y: depth.y,
          z: depth.z,
          rotateX: 7,
          filter: 'blur(7px)',
          transformPerspective: 1100,
          transformOrigin: '50% 100%',
          willChange: 'transform, opacity, filter',
        })

        const tween = gsap.to(element, {
          autoAlpha: 1,
          y: 0,
          z: 0,
          rotateX: 0,
          filter: 'blur(0px)',
          duration: 0.88,
          delay: Math.min((index % 5) * 0.045, 0.18),
          ease: 'power3.out',
          paused: true,
          onComplete: () => {
            gsap.set(element, {
              clearProps: 'opacity,visibility,transform,filter,clipPath,willChange',
            })
          },
        })

        const trigger = ScrollTrigger.create({
          trigger: element,
          start: 'top 91%',
          once: true,
          onEnter: () => tween.play(),
        })

        const bounds = element.getBoundingClientRect()
        if (bounds.top < window.innerHeight * 0.94 && bounds.bottom > 0) tween.play()

        tweens.push(tween)
        triggers.push(trigger)
      })

      if (finePointer && !reducedMotion) {
        document.querySelectorAll<HTMLElement>(depthSelector).forEach((element) => {
          const pointer = new Vector3()

          const onMove = (event: PointerEvent) => {
            const bounds = element.getBoundingClientRect()
            if (!bounds.width || !bounds.height) return

            pointer.set(
              MathUtils.clamp((event.clientX - bounds.left) / bounds.width - 0.5, -0.5, 0.5),
              MathUtils.clamp((event.clientY - bounds.top) / bounds.height - 0.5, -0.5, 0.5),
              0,
            )

            gsap.to(element, {
              rotateX: pointer.y * -5,
              rotateY: pointer.x * 7,
              z: 14,
              duration: 0.34,
              ease: 'power2.out',
              transformPerspective: 1100,
              overwrite: 'auto',
            })
          }

          const onLeave = () => {
            gsap.to(element, {
              rotateX: 0,
              rotateY: 0,
              z: 0,
              duration: 0.5,
              ease: 'power3.out',
              overwrite: 'auto',
            })
          }

          element.addEventListener('pointermove', onMove, { passive: true })
          element.addEventListener('pointerleave', onLeave, { passive: true })
          cleanups.push(() => {
            element.removeEventListener('pointermove', onMove)
            element.removeEventListener('pointerleave', onLeave)
          })
        })
      }

      frame = window.requestAnimationFrame(() => ScrollTrigger.refresh())
    }

    frame = window.requestAnimationFrame(setup)

    const safetyTimer = window.setTimeout(() => {
      document.querySelectorAll<HTMLElement>(revealSelector).forEach((element) => {
        const style = window.getComputedStyle(element)
        if (style.filter !== 'none' || Number(style.opacity) < 0.98) revealImmediately(element)
      })
    }, 1800)

    return () => {
      window.clearTimeout(safetyTimer)
      if (frame) window.cancelAnimationFrame(frame)
      cleanups.forEach((cleanup) => cleanup())
      triggers.forEach((trigger) => trigger.kill())
      tweens.forEach((tween) => tween.kill())
    }
  }, [pathname])

  return null
}
