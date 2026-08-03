import type { CSSProperties } from 'react'

import { defaultAppearance, type AppearanceValue } from '@/fields/appearance'
import { getMediaURL } from '@/lib/media'

type CSSVars = CSSProperties & Record<`--${string}`, string | number>
type Doc = Record<string, any>

export type FrameSequence = {
  desktopFrames: string[]
  mobileFrames: string[]
  poster: string | null
  trigger: 'scroll' | 'autoplay' | 'loop'
  fit: 'cover' | 'contain'
  scrub: number
  pin: boolean
  overlayOpacity: number
}

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback
}

const safeColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|[a-z]+$)/i.test(value.trim())
    ? value.trim()
    : fallback

const safeBackgroundURL = (value: unknown) => {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  if (/^data:image\/(?:png|jpe?g|webp|gif|avif);base64,/i.test(normalized)) return normalized
  if (/^(https?:\/\/|\/)/i.test(normalized)) return normalized.replace(/["'()]/g, '')
  return ''
}

const asDoc = (value: unknown): Doc | null => value && typeof value === 'object' ? value as Doc : null

function frameURLs(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const unique = new Set<string>()
  for (const item of value) {
    const url = getMediaURL(item, 'hero') || getMediaURL(item)
    if (url) unique.add(url)
  }
  return Array.from(unique)
}

function backgroundPoster(background: Doc | null): string | null {
  if (!background) return null
  return (
    getMediaURL(background.poster, 'hero') ||
    getMediaURL(background.poster) ||
    getMediaURL(background.image, 'hero') ||
    getMediaURL(background.image) ||
    getMediaURL(Array.isArray(background.desktopFrames) ? background.desktopFrames[0] : null, 'hero') ||
    getMediaURL(Array.isArray(background.desktopFrames) ? background.desktopFrames[0] : null) ||
    getMediaURL(Array.isArray(background.mobileFrames) ? background.mobileFrames[0] : null, 'hero') ||
    getMediaURL(Array.isArray(background.mobileFrames) ? background.mobileFrames[0] : null) ||
    null
  )
}

export function getPortfolioFrameSequence(block: Doc): FrameSequence | null {
  const appearance = asDoc(block.appearance) || {}
  const candidates = [
    asDoc(block.runtimeBackground),
    asDoc(block.savedBackground),
    asDoc(appearance.savedBackground),
  ].filter((item): item is Doc => Boolean(item))

  const background = candidates.find((item) => {
    const desktop = Array.isArray(item.desktopFrames) ? item.desktopFrames.length : 0
    const mobile = Array.isArray(item.mobileFrames) ? item.mobileFrames.length : 0
    return desktop > 0 || mobile > 0
  }) || null

  if (!background) return null
  const desktopFrames = frameURLs(background.desktopFrames)
  const mobileFrames = frameURLs(background.mobileFrames)
  if (!desktopFrames.length && !mobileFrames.length) return null

  const trigger = background.playback?.trigger
  return {
    desktopFrames,
    mobileFrames,
    poster: backgroundPoster(background),
    trigger: trigger === 'autoplay' || trigger === 'loop' ? trigger : 'scroll',
    fit: background.playback?.fit === 'contain' ? 'contain' : 'cover',
    scrub: clamp(background.playback?.scrub, 0.08, 3, 0.32),
    pin: background.playback?.pin !== false,
    overlayOpacity: clamp(background.playback?.overlayOpacity, 0, 82, 24),
  }
}

export function normalizeAppearance(value: unknown): Required<AppearanceValue> {
  const input = value && typeof value === 'object' ? (value as AppearanceValue) : {}
  const merged = { ...defaultAppearance, ...input }
  return {
    surfaceMode: merged.surfaceMode || 'transparent',
    surfaceColor: safeColor(merged.surfaceColor, '#ffffff'),
    surfaceOpacity: clamp(merged.surfaceOpacity, 0, 100, 100),
    backdropBlur: clamp(merged.backdropBlur, 0, 48, 18),
    headingColor: safeColor(merged.headingColor, '#151515'),
    bodyColor: safeColor(merged.bodyColor, '#4b4b4b'),
    accentColor: safeColor(merged.accentColor, '#f4c84b'),
    fontFamily: merged.fontFamily || 'sans',
    textGlow: clamp(merged.textGlow, 0, 100, 0),
    buttonColor: safeColor(merged.buttonColor, '#f4c84b'),
    buttonTextColor: safeColor(merged.buttonTextColor, '#15130f'),
    buttonBorderColor: safeColor(merged.buttonBorderColor, merged.buttonColor || '#f4c84b'),
    buttonBorderWidth: clamp(merged.buttonBorderWidth, 0, 6, 0),
    buttonRadius: clamp(merged.buttonRadius, 0, 999, 999),
    buttonSize: merged.buttonSize || 'medium',
    borderColor: safeColor(merged.borderColor, '#ffffff'),
    borderWidth: clamp(merged.borderWidth, 0, 8, 0),
    cornerRadius: clamp(merged.cornerRadius, 0, 72, 24),
    contentWidth: merged.contentWidth || 'normal',
    textAlign: merged.textAlign || 'left',
    paddingTop: clamp(merged.paddingTop, 0, 260, 96),
    paddingBottom: clamp(merged.paddingBottom, 0, 260, 96),
    fontScale: clamp(merged.fontScale, 70, 160, 100),
    backgroundURL: safeBackgroundURL(merged.backgroundURL),
    backgroundFit: merged.backgroundFit || 'cover',
    overlayColor: safeColor(merged.overlayColor, '#10110f'),
    overlayOpacity: clamp(merged.overlayOpacity, 0, 90, 0),
    imageURL: safeBackgroundURL(merged.imageURL),
    secondaryImageURL: safeBackgroundURL(merged.secondaryImageURL),
    imageFit: merged.imageFit || 'cover',
    imageOpacity: clamp(merged.imageOpacity, 0, 100, 100),
    mobileLayout: merged.mobileLayout || 'stack',
    mobileTextAlign: merged.mobileTextAlign || 'left',
    mobilePadding: clamp(merged.mobilePadding, 12, 48, 22),
    mobileHeadingScale: clamp(merged.mobileHeadingScale, 55, 130, 86),
    hideOnMobile: Boolean(merged.hideOnMobile),
    animationPreset: merged.animationPreset || 'fade-up',
    animationDuration: clamp(merged.animationDuration, 150, 1800, 700),
    animationDelay: clamp(merged.animationDelay, 0, 1200, 0),
  }
}

export function appearanceProps(value: unknown, extraClassName = '') {
  const appearance = normalizeAppearance(value)
  const className = [
    'cms-surface',
    `cms-surface--${appearance.surfaceMode}`,
    `cms-width--${appearance.contentWidth}`,
    `cms-align--${appearance.textAlign}`,
    `cms-mobile--${appearance.mobileLayout}`,
    `cms-font--${appearance.fontFamily}`,
    `cms-button--${appearance.buttonSize}`,
    appearance.hideOnMobile ? 'cms-hide-mobile' : '',
    extraClassName,
  ].filter(Boolean).join(' ')

  const mobileScale = appearance.mobileHeadingScale / 100
  const style: CSSVars = {
    '--cms-surface-color': appearance.surfaceColor,
    '--cms-surface-opacity': `${appearance.surfaceOpacity}%`,
    '--cms-blur': `${appearance.backdropBlur}px`,
    '--cms-heading': appearance.headingColor,
    '--cms-body': appearance.bodyColor,
    '--cms-accent': appearance.accentColor,
    '--cms-text-glow': `${appearance.textGlow / 8}px`,
    '--cms-button': appearance.buttonColor,
    '--cms-button-text': appearance.buttonTextColor,
    '--cms-button-border': appearance.buttonBorderColor,
    '--cms-button-border-width': `${appearance.buttonBorderWidth}px`,
    '--cms-button-radius': `${appearance.buttonRadius}px`,
    '--cms-border': appearance.borderColor,
    '--cms-border-width': `${appearance.borderWidth}px`,
    '--cms-radius': `${appearance.cornerRadius}px`,
    '--cms-pad-top': `${appearance.paddingTop}px`,
    '--cms-pad-bottom': `${appearance.paddingBottom}px`,
    '--cms-mobile-pad-top': `${Math.round(appearance.paddingTop * 0.68)}px`,
    '--cms-mobile-pad-bottom': `${Math.round(appearance.paddingBottom * 0.68)}px`,
    '--cms-font-size': `${(appearance.fontScale / 100).toFixed(2)}rem`,
    '--cms-overlay': appearance.overlayColor,
    '--cms-overlay-opacity': `${appearance.overlayOpacity}%`,
    '--cms-mobile-pad': `${appearance.mobilePadding}px`,
    '--cms-mobile-h1-max': `${(4.6 * mobileScale).toFixed(2)}rem`,
    '--cms-mobile-h2-max': `${(3.2 * mobileScale).toFixed(2)}rem`,
    '--cms-mobile-h3-max': `${(2.1 * mobileScale).toFixed(2)}rem`,
    '--cms-mobile-align': appearance.mobileTextAlign,
    '--cms-background-fit': appearance.backgroundFit,
    '--cms-image-fit': appearance.imageFit,
    '--cms-image-opacity': `${appearance.imageOpacity / 100}`,
  }

  if (appearance.backgroundURL) {
    style.backgroundImage = `linear-gradient(color-mix(in srgb, ${appearance.overlayColor} ${appearance.overlayOpacity}%, transparent), color-mix(in srgb, ${appearance.overlayColor} ${appearance.overlayOpacity}%, transparent)), url("${appearance.backgroundURL}")`
  }

  return { appearance, className, style }
}

export function portfolioAppearanceProps(block: Doc) {
  const appearance = normalizeAppearance(block.appearance)
  const style: CSSVars = {
    '--fabrick-eyebrow': appearance.accentColor,
    '--fabrick-heading': appearance.headingColor,
    '--fabrick-copy': appearance.bodyColor,
    '--fabrick-button-bg': appearance.buttonColor,
    '--fabrick-button-text': appearance.buttonTextColor,
    '--fabrick-button-border': appearance.buttonBorderColor,
    '--fabrick-button-border-width': `${appearance.buttonBorderWidth}px`,
    '--fabrick-button-radius': `${appearance.buttonRadius}px`,
    '--fabrick-font-scale': appearance.fontScale / 100,
    '--fabrick-radius': `${appearance.cornerRadius}px`,
  }
  return {
    className: `portfolio-showcase fabrick-block fabrick-width-${appearance.contentWidth} cms-button--${appearance.buttonSize}`,
    style,
  }
}
