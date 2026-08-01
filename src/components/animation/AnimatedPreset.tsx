'use client'

import Image from 'next/image'
import Link from 'next/link'

import { getMediaAlt, getMediaURL } from '@/lib/media'
import { AnimeSurface } from './AnimeSurface'

type ComponentDoc = Record<string, any>

export function AnimatedPreset({ component }: { component: ComponentDoc }) {
  const kind = String(component.kind || 'animatedCard')
  const surface = String(component.surface || 'glass')
  const preset = component.animationPreset || 'fade-up'
  const media = getMediaURL(component.media, 'card')
  const body = String(component.body || component.description || '')
  const buttonLabel = String(component.buttonLabel || 'Conocer más')
  const buttonURL = String(component.buttonURL || '#contacto')

  if (kind === 'animatedButton') {
    return (
      <AnimeSurface className="animated-library animated-library--button" preset={preset} duration={component.animationDuration || 650}>
        <Link className={`animated-button animated-button--${surface}`} href={buttonURL}>
          <span>{buttonLabel}</span><i aria-hidden="true" />
        </Link>
      </AnimeSurface>
    )
  }

  if (kind === 'animatedText') {
    return (
      <AnimeSurface className={`animated-library animated-text animated-surface--${surface}`} preset={preset} duration={component.animationDuration || 750}>
        {component.eyebrow && <span className="eyebrow">{component.eyebrow}</span>}
        <h2>{component.heading || component.name}</h2>
        {body && <p>{body}</p>}
        {component.buttonLabel && <Link href={buttonURL}>{buttonLabel}</Link>}
      </AnimeSurface>
    )
  }

  return (
    <AnimeSurface as="article" className={`animated-library animated-card animated-surface--${surface}`} preset={preset} duration={component.animationDuration || 750}>
      {media && (
        <div className="animated-card__media">
          <Image src={media} alt={getMediaAlt(component.media, component.heading || component.name)} fill sizes="(max-width: 760px) 100vw, 520px" />
        </div>
      )}
      <div className="animated-card__body">
        {component.eyebrow && <span className="eyebrow">{component.eyebrow}</span>}
        <h3>{component.heading || component.name}</h3>
        {body && <p>{body}</p>}
        {component.buttonLabel && <Link className="animated-card__link" href={buttonURL}>{buttonLabel}</Link>}
      </div>
    </AnimeSurface>
  )
}
