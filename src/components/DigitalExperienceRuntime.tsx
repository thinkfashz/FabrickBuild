'use client'

import { useEffect } from 'react'

type ConnectionInfo = {
  effectiveType?: string
  saveData?: boolean
}

type PerformanceNavigator = Navigator & {
  connection?: ConnectionInfo
  deviceMemory?: number
}

const sectionTones = [
  { name: 'mint', color: '#b8d7c5' },
  { name: 'gold', color: '#e5bb6b' },
  { name: 'cyan', color: '#79d8cf' },
  { name: 'violet', color: '#b5a8ff' },
]

function optimizeCloudinaryURL(value: string, compact: boolean, reducedData: boolean) {
  if (!value.includes('res.cloudinary.com') || !value.includes('/image/upload/')) return value
  if (/\/image\/upload\/[^/]*(?:f_auto|q_auto|w_\d+|dpr_auto)/.test(value)) return value

  const width = compact ? 960 : 1600
  const quality = reducedData ? 'q_auto:low' : 'q_auto:eco'
  return value.replace(
    '/image/upload/',
    `/image/upload/f_auto,${quality},c_limit,w_${width},dpr_auto/`,
  )
}

function ensurePreconnect(href: string) {
  if (document.head.querySelector(`link[rel="preconnect"][href="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = href
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
}

function toneFromSection(section: HTMLElement, index: number) {
  const requested = section.dataset.sectionTone
  return sectionTones.find((tone) => tone.name === requested) || sectionTones[index % sectionTones.length]
}

export function DigitalExperienceRuntime() {
  useEffect(() => {
    const performanceNavigator = navigator as PerformanceNavigator
    const compact = window.matchMedia('(max-width: 767px)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const reducedData = Boolean(
      performanceNavigator.connection?.saveData ||
        ['slow-2g', '2g'].includes(performanceNavigator.connection?.effectiveType || ''),
    )
    const lowMemory =
      typeof performanceNavigator.deviceMemory === 'number' &&
      performanceNavigator.deviceMemory <= 4
    const lowPower =
      reducedData || lowMemory || (navigator.hardwareConcurrency || 8) <= 4

    document.documentElement.dataset.fabrickPerformance = lowPower ? 'economy' : 'balanced'
    document.documentElement.dataset.fabrickApp = compact ? 'mobile' : 'desktop'
    document.documentElement.dataset.fabrickReady = 'loading'

    ensurePreconnect('https://res.cloudinary.com')
    ensurePreconnect(window.location.origin)

    const tuneImage = (image: HTMLImageElement) => {
      if (image.dataset.fabrickOptimized === 'true') return

      const isPriority = Boolean(
        image.closest('.hero, .portfolio-hero, [data-priority="true"], .site-header'),
      )
      const currentSource = image.getAttribute('src') || ''

      if (!image.dataset.nimg && currentSource.includes('res.cloudinary.com')) {
        const optimized = optimizeCloudinaryURL(currentSource, compact, reducedData)
        if (optimized !== currentSource) image.src = optimized
      }

      image.decoding = 'async'
      image.loading = isPriority ? 'eager' : 'lazy'
      image.fetchPriority = isPriority ? 'high' : 'low'
      image.referrerPolicy = 'strict-origin-when-cross-origin'
      image.dataset.fabrickOptimized = 'true'
    }

    const tuneVideo = (video: HTMLVideoElement) => {
      if (video.dataset.fabrickOptimized === 'true') return
      video.preload = video.closest('.hero, .portfolio-hero') ? 'metadata' : 'none'
      video.playsInline = true
      video.setAttribute('playsinline', '')
      video.dataset.fabrickOptimized = 'true'
    }

    const tuneNode = (node: ParentNode) => {
      if (node instanceof HTMLImageElement) tuneImage(node)
      if (node instanceof HTMLVideoElement) tuneVideo(node)
      node.querySelectorAll?.('img').forEach((image) => tuneImage(image))
      node.querySelectorAll?.('video').forEach((video) => tuneVideo(video))
    }

    tuneNode(document)

    const videoObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement
          if (!entry.isIntersecting) {
            video.pause()
            return
          }

          if (video.autoplay && !reducedMotion && !reducedData) {
            void video.play().catch(() => undefined)
          }
        })
      },
      { rootMargin: '180px 0px', threshold: 0.05 },
    )

    document.querySelectorAll('video').forEach((video) => videoObserver.observe(video))

    const revealObserver = reducedMotion
      ? null
      : new IntersectionObserver(
          (entries, observer) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return
              ;(entry.target as HTMLElement).dataset.fabrickVisible = 'true'
              observer.unobserve(entry.target)
            })
          },
          { rootMargin: '0px 0px -9% 0px', threshold: 0.08 },
        )

    const registerReveals = (root: ParentNode) => {
      const selector = [
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
        '.site-footer [data-footer-reveal]',
      ].join(',')

      root.querySelectorAll<HTMLElement>(selector).forEach((element, index) => {
        if (element.dataset.fabrickReveal === 'true') return
        element.dataset.fabrickReveal = 'true'
        element.style.setProperty('--reveal-delay', `${Math.min((index % 8) * 55, 330)}ms`)
        if (reducedMotion) {
          element.dataset.fabrickVisible = 'true'
        } else {
          revealObserver?.observe(element)
        }
      })
    }

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (!visible) return

        document
          .querySelectorAll<HTMLElement>('[data-fabrick-section="true"][data-section-active="true"]')
          .forEach((section) => {
            if (section !== visible.target) delete section.dataset.sectionActive
          })

        const section = visible.target as HTMLElement
        section.dataset.sectionActive = 'true'
        const color = section.dataset.sectionColor || '#b8d7c5'
        document.documentElement.style.setProperty('--section-accent', color)
        window.dispatchEvent(
          new CustomEvent('fabrick:section-tone', {
            detail: { color, tone: section.dataset.sectionTone || 'mint' },
          }),
        )
      },
      {
        rootMargin: '-18% 0px -48% 0px',
        threshold: [0.08, 0.22, 0.42, 0.62],
      },
    )

    const registerSections = (root: ParentNode) => {
      root
        .querySelectorAll<HTMLElement>('main section, body > .home-service-navigator')
        .forEach((section, index) => {
          if (section.dataset.fabrickSection === 'true') return
          const tone = toneFromSection(section, index)
          section.dataset.fabrickSection = 'true'
          section.dataset.sectionTone = tone.name
          section.dataset.sectionColor = tone.color
          section.style.setProperty('--local-section-accent', tone.color)
          sectionObserver.observe(section)
        })
    }

    registerReveals(document)
    registerSections(document)

    let previousY = window.scrollY
    let frame = 0
    const updateScrollState = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        const currentY = window.scrollY
        document.documentElement.dataset.scrollDirection = currentY > previousY ? 'down' : 'up'
        document.documentElement.style.setProperty(
          '--page-scroll-progress',
          String(
            Math.min(
              1,
              currentY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight),
            ),
          ),
        )
        previousY = currentY
        frame = 0
      })
    }

    window.addEventListener('scroll', updateScrollState, { passive: true })

    const readyTimer = window.setTimeout(() => {
      document.documentElement.dataset.fabrickReady = 'true'
    }, reducedMotion ? 0 : 120)

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return
          tuneNode(node)
          registerReveals(node)
          registerSections(node)
          node.querySelectorAll('video').forEach((video) => videoObserver.observe(video))
        })
      })
    })

    mutationObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.clearTimeout(readyTimer)
      window.removeEventListener('scroll', updateScrollState)
      if (frame) window.cancelAnimationFrame(frame)
      mutationObserver.disconnect()
      videoObserver.disconnect()
      revealObserver?.disconnect()
      sectionObserver.disconnect()
    }
  }, [])

  return null
}
