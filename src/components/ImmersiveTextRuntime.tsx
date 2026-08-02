'use client'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { MathUtils, Vector3 } from 'three'

type EditorialVariant = 'rise-mask' | 'mask-left' | 'mask-right' | 'depth-center' | 'soft-scale'

const variants: EditorialVariant[] = [
  'rise-mask',
  'mask-left',
  'mask-right',
  'depth-center',
  'soft-scale',
]

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

function entranceState(variant: EditorialVariant) {
  switch (variant) {
    case 'mask-left':
      return {
        autoAlpha: 0,
        xPercent: -18,
        yPercent: 2,
        z: -52,
        rotateY: -4,
        clipPath: 'inset(0 100% 0 0)',
        filter: 'blur(9px)',
      }
    case 'mask-right':
      return {
        autoAlpha: 0,
        xPercent: 18,
        yPercent: 2,
        z: -52,
        rotateY: 4,
        clipPath: 'inset(0 0 0 100%)',
        filter: 'blur(9px)',
      }
    case 'depth-center':
      return {
        autoAlpha: 0,
        yPercent: 8,
        z: -170,
        rotateX: 9,
        scale: 0.88,
        clipPath: 'inset(14% 10% 14% 10%)',
        filter: 'blur(12px)',
      }
    case 'soft-scale':
      return {
        autoAlpha: 0,
        yPercent: 10,
        z: -90,
        scale: 0.9,
        clipPath: 'inset(0 0 100% 0)',
        filter: 'blur(8px)',
      }
    default:
      return {
        autoAlpha: 0,
        yPercent: 28,
        z: -68,
        rotateX: 6,
        clipPath: 'inset(100% 0 0 0)',
        filter: 'blur(10px)',
      }
  }
}

function exitState(variant: EditorialVariant) {
  switch (variant) {
    case 'mask-left':
      return { autoAlpha: 0, xPercent: 12, yPercent: -3, filter: 'blur(6px)' }
    case 'mask-right':
      return { autoAlpha: 0, xPercent: -12, yPercent: -3, filter: 'blur(6px)' }
    case 'depth-center':
      return { autoAlpha: 0, yPercent: -10, z: 110, scale: 1.04, filter: 'blur(8px)' }
    case 'soft-scale':
      return { autoAlpha: 0, yPercent: -12, scale: 1.035, filter: 'blur(7px)' }
    default:
      return { autoAlpha: 0, yPercent: -20, z: 48, filter: 'blur(7px)' }
  }
}

function visibleState() {
  return {
    autoAlpha: 1,
    xPercent: 0,
    yPercent: 0,
    z: 0,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    scale: 1,
    clipPath: 'inset(0% 0% 0% 0%)',
    filter: 'blur(0px)',
  }
}

export function ImmersiveTextRuntime() {
  const pathname = usePathname()

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    ScrollTrigger.config({ ignoreMobileResize: true })

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finePointer = window.matchMedia('(pointer: fine)').matches
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches
    const isHome = pathname === '/'
    const cleanups: Array<() => void> = []
    const timelines: gsap.core.Timeline[] = []
    const triggers: ScrollTrigger[] = []
    const tweens: gsap.core.Tween[] = []
    let frame = 0

    document.documentElement.dataset.editorialMotion = 'true'

    const revealImmediately = (element: HTMLElement) => {
      element.dataset.fabrickVisible = 'true'
      element.dataset.threeReveal = 'true'
      gsap.set(element, {
        clearProps: 'opacity,visibility,transform,filter,clipPath,willChange',
      })
    }

    const createEditorialScene = (
      scene: HTMLElement,
      copy: HTMLElement[],
      variant: EditorialVariant,
      index: number,
    ) => {
      scene.dataset.hgvScene = 'true'
      scene.dataset.hgvVariant = variant
      copy.forEach((element) => {
        element.dataset.hgvCopy = 'true'
        element.dataset.fabrickVisible = 'true'
      })

      if (!copy.length || reducedMotion) {
        copy.forEach(revealImmediately)
        return
      }

      gsap.set(copy, {
        ...entranceState(variant),
        transformPerspective: 1200,
        transformOrigin: variant === 'mask-right' ? '100% 50%' : '0% 50%',
        willChange: 'transform, opacity, filter, clip-path',
      })

      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: scene,
          start: 'top bottom',
          end: 'bottom top',
          scrub: coarsePointer ? 0.34 : 0.58,
          invalidateOnRefresh: true,
          fastScrollEnd: true,
        },
      })

      timeline
        .to(copy, {
          ...visibleState(),
          duration: 0.24,
          stagger: { each: 0.025, from: index % 2 ? 'end' : 'start' },
        })
        .to(copy, {
          ...visibleState(),
          duration: 0.5,
        })
        .to(copy, {
          ...exitState(variant),
          duration: 0.26,
          stagger: { each: 0.018, from: index % 2 ? 'start' : 'end' },
        })

      timelines.push(timeline)
    }

    const setupHomeScenes = () => {
      if (!isHome) return

      const cinematicScenes = Array.from(
        document.querySelectorAll<HTMLElement>('[data-cinematic-scene]'),
      )

      cinematicScenes.forEach((scene, index) => {
        const copy = Array.from(scene.querySelectorAll<HTMLElement>('[data-cinematic-copy]'))
        createEditorialScene(scene, copy, variants[index % variants.length], index)
      })

      const homeChapters = Array.from(
        document.querySelectorAll<HTMLElement>([
          '.home-service-navigator__intro',
          '.home-service-card',
          '.home-service-navigator__cta',
        ].join(',')),
      )

      homeChapters.forEach((chapter, index) => {
        chapter.dataset.hgvChapter = 'true'
        const copy = Array.from(chapter.children).filter(
          (node): node is HTMLElement => node instanceof HTMLElement,
        )
        createEditorialScene(
          chapter,
          copy.length ? copy : [chapter],
          variants[(index + 2) % variants.length],
          index + cinematicScenes.length,
        )
      })
    }

    const setupRegularReveals = () => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>(revealSelector)).filter(
        (element) => !element.closest('[data-hgv-scene="true"]'),
      )

      elements.forEach((element, index) => {
        element.dataset.fabrickVisible = 'true'
        element.dataset.threeReveal = 'true'

        if (reducedMotion) {
          revealImmediately(element)
          return
        }

        const depth = new Vector3(
          (index % 2 ? 1 : -1) * MathUtils.clamp(8 + (index % 3) * 3, 8, 16),
          MathUtils.clamp(26 + (index % 4) * 6, 26, 48),
          -MathUtils.clamp(34 + (index % 5) * 9, 34, 72),
        )

        gsap.set(element, {
          autoAlpha: 0,
          x: depth.x,
          y: depth.y,
          z: depth.z,
          rotateX: 5,
          filter: 'blur(6px)',
          clipPath: 'inset(8% 0 8% 0)',
          transformPerspective: 1100,
          transformOrigin: '50% 100%',
          willChange: 'transform, opacity, filter, clip-path',
        })

        const tween = gsap.to(element, {
          autoAlpha: 1,
          x: 0,
          y: 0,
          z: 0,
          rotateX: 0,
          filter: 'blur(0px)',
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 0.82,
          delay: Math.min((index % 5) * 0.035, 0.14),
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
          start: 'top 92%',
          once: true,
          onEnter: () => tween.play(),
        })

        const bounds = element.getBoundingClientRect()
        if (bounds.top < window.innerHeight * 0.95 && bounds.bottom > 0) tween.play()

        tweens.push(tween)
        triggers.push(trigger)
      })

      return elements
    }

    const setupPointerDepth = () => {
      if (!finePointer || reducedMotion) return

      document.querySelectorAll<HTMLElement>(depthSelector).forEach((element) => {
        if (element.closest('[data-hgv-scene="true"]')) return
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
            rotateX: pointer.y * -4,
            rotateY: pointer.x * 6,
            z: 12,
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
            duration: 0.48,
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

    let regularElements: HTMLElement[] = []
    const setup = () => {
      setupHomeScenes()
      regularElements = setupRegularReveals()
      setupPointerDepth()

      const refresh = () => ScrollTrigger.refresh()
      if (document.fonts?.ready) void document.fonts.ready.then(refresh)
      frame = window.requestAnimationFrame(refresh)
    }

    frame = window.requestAnimationFrame(setup)

    const safetyTimer = window.setTimeout(() => {
      regularElements.forEach((element) => {
        const style = window.getComputedStyle(element)
        if (style.filter !== 'none' || Number(style.opacity) < 0.98) revealImmediately(element)
      })
    }, 1900)

    return () => {
      delete document.documentElement.dataset.editorialMotion
      window.clearTimeout(safetyTimer)
      if (frame) window.cancelAnimationFrame(frame)
      cleanups.forEach((cleanup) => cleanup())
      timelines.forEach((timeline) => timeline.kill())
      triggers.forEach((trigger) => trigger.kill())
      tweens.forEach((tween) => tween.kill())
      document.querySelectorAll<HTMLElement>('[data-hgv-copy="true"]').forEach((element) => {
        revealImmediately(element)
        delete element.dataset.hgvCopy
      })
    }
  }, [pathname])

  return null
}
