import type { CSSProperties } from 'react'

import { defaultAppearance, type AppearanceValue } from '@/fields/appearance'

type CSSVars = CSSProperties & Record<`--${string}`, string | number>

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
  if (/^(https?:\/\/|\/)/i.test(normalized)) return normalized.replace(/["'()]/g, '')
  return ''
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
    buttonColor: safeColor(merged.buttonColor, '#f4c84b'),
    buttonTextColor: safeColor(merged.buttonTextColor, '#15130f'),
    borderColor: safeColor(merged.borderColor, '#ffffff'),
    borderWidth: clamp(merged.borderWidth, 0, 6, 0),
    cornerRadius: clamp(merged.cornerRadius, 0, 64, 24),
    contentWidth: merged.contentWidth || 'normal',
    textAlign: merged.textAlign || 'left',
    paddingTop: clamp(merged.paddingTop, 0, 240, 96),
    paddingBottom: clamp(merged.paddingBottom, 0, 240, 96),
    fontScale: clamp(merged.fontScale, 75, 145, 100),
    backgroundURL: safeBackgroundURL(merged.backgroundURL),
    backgroundFit: merged.backgroundFit || 'cover',
    overlayColor: safeColor(merged.overlayColor, '#10110f'),
    overlayOpacity: clamp(merged.overlayOpacity, 0, 90, 0),
    mobileLayout: merged.mobileLayout || 'stack',
    mobileTextAlign: merged.mobileTextAlign || 'left',
    mobilePadding: clamp(merged.mobilePadding, 12, 48, 22),
    mobileHeadingScale: clamp(merged.mobileHeadingScale, 60, 120, 86),
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
    appearance.hideOnMobile ? 'cms-hide-mobile' : '',
    extraClassName,
  ].filter(Boolean).join(' ')

  const style: CSSVars = {
    '--cms-surface-color': appearance.surfaceColor,
    '--cms-surface-opacity': appearance.surfaceOpacity / 100,
    '--cms-blur': `${appearance.backdropBlur}px`,
    '--cms-heading': appearance.headingColor,
    '--cms-body': appearance.bodyColor,
    '--cms-accent': appearance.accentColor,
    '--cms-button': appearance.buttonColor,
    '--cms-button-text': appearance.buttonTextColor,
    '--cms-border': appearance.borderColor,
    '--cms-border-width': `${appearance.borderWidth}px`,
    '--cms-radius': `${appearance.cornerRadius}px`,
    '--cms-pad-top': `${appearance.paddingTop}px`,
    '--cms-pad-bottom': `${appearance.paddingBottom}px`,
    '--cms-font-scale': appearance.fontScale / 100,
    '--cms-overlay': appearance.overlayColor,
    '--cms-overlay-opacity': appearance.overlayOpacity / 100,
    '--cms-mobile-pad': `${appearance.mobilePadding}px`,
    '--cms-mobile-heading-scale': appearance.mobileHeadingScale / 100,
    '--cms-mobile-align': appearance.mobileTextAlign,
    '--cms-background-fit': appearance.backgroundFit,
  }

  if (appearance.backgroundURL) {
    style.backgroundImage = `linear-gradient(color-mix(in srgb, ${appearance.overlayColor} ${appearance.overlayOpacity}%, transparent), color-mix(in srgb, ${appearance.overlayColor} ${appearance.overlayOpacity}%, transparent)), url("${appearance.backgroundURL}")`
  }

  return { appearance, className, style }
}
