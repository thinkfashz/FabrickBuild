import type { CSSProperties } from 'react'

import { getMediaURL } from './media'

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

const HEX = /^#[0-9a-f]{6}$/i

function hexToRGBA(value: unknown, opacity: unknown, fallback: string): string {
  const color = typeof value === 'string' && HEX.test(value) ? value : fallback
  const alpha = Math.min(100, Math.max(0, Number(opacity ?? 100))) / 100
  const red = Number.parseInt(color.slice(1, 3), 16)
  const green = Number.parseInt(color.slice(3, 5), 16)
  const blue = Number.parseInt(color.slice(5, 7), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function safeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX.test(value) ? value : fallback
}

function safeFont(value: unknown): string {
  switch (value) {
    case 'serif':
      return 'Iowan Old Style, Baskerville, Georgia, serif'
    case 'display':
      return 'Arial Narrow, Avenir Next Condensed, Inter, Arial, sans-serif'
    case 'mono':
      return 'SFMono-Regular, Consolas, Liberation Mono, monospace'
    default:
      return 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
  }
}

function safeURL(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const url = value.trim()
  return /^https:\/\//i.test(url) || url.startsWith('/') ? url : null
}

function savedBackgroundURL(background: unknown): string | null {
  if (!background || typeof background !== 'object') return null
  const item = background as Doc
  if (item.kind === 'url') return safeURL(item.externalURL)
  if (item.kind === 'image') return getMediaURL(item.image, 'hero') || getMediaURL(item.image)
  if (item.kind === 'frames') {
    return (
      getMediaURL(item.poster, 'hero') ||
      getMediaURL(item.poster) ||
      getMediaURL(Array.isArray(item.desktopFrames) ? item.desktopFrames[0] : null, 'hero') ||
      getMediaURL(Array.isArray(item.desktopFrames) ? item.desktopFrames[0] : null) ||
      getMediaURL(Array.isArray(item.mobileFrames) ? item.mobileFrames[0] : null, 'hero') ||
      getMediaURL(Array.isArray(item.mobileFrames) ? item.mobileFrames[0] : null)
    )
  }
  return null
}

function asSavedBackground(value: unknown): Doc | null {
  return value && typeof value === 'object' ? (value as Doc) : null
}

function frameURLs(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => getMediaURL(item, 'hero') || getMediaURL(item))
    .filter((item): item is string => Boolean(item))
}

/**
 * Returns the full frame sequence when a block references a multimedia
 * background. Non-frame backgrounds deliberately return null and continue to
 * use the lightweight CSS image layer.
 */
export function getBlockFrameSequence(block: Doc): FrameSequence | null {
  const appearance = (block.appearance || {}) as Doc
  const background =
    appearance.backgroundMode === 'image'
      ? asSavedBackground(appearance.savedBackground)
      : block.backgroundSource === 'saved'
        ? asSavedBackground(block.savedBackground)
        : null

  if (!background || background.kind !== 'frames') return null

  const desktopFrames = frameURLs(background.desktopFrames)
  const mobileFrames = frameURLs(background.mobileFrames)
  if (!desktopFrames.length && !mobileFrames.length) return null

  const trigger = background.playback?.trigger
  return {
    desktopFrames,
    mobileFrames,
    poster: savedBackgroundURL(background),
    trigger: trigger === 'autoplay' || trigger === 'loop' ? trigger : 'scroll',
    fit: background.playback?.fit === 'contain' ? 'contain' : 'cover',
    scrub: Math.min(1.2, Math.max(0.08, Number(background.playback?.scrub ?? 0.32))),
    pin: background.playback?.pin !== false,
    overlayOpacity: Math.min(82, Math.max(0, Number(background.playback?.overlayOpacity ?? 24))),
  }
}

/** Resolve image, external URL and saved multimedia backgrounds to one safe poster URL. */
export function resolveBlockBackground(block: Doc): string | null {
  const appearance = (block.appearance || {}) as Doc
  if (appearance.backgroundMode === 'image') {
    return (
      getMediaURL(appearance.backgroundMedia, 'hero') ||
      getMediaURL(appearance.backgroundMedia) ||
      savedBackgroundURL(appearance.savedBackground) ||
      safeURL(appearance.backgroundURL)
    )
  }

  if (block.backgroundSource === 'url') return safeURL(block.backgroundURL)
  if (block.backgroundSource === 'saved') return savedBackgroundURL(block.savedBackground)
  return getMediaURL(block.media, 'hero') || getMediaURL(block.media)
}

/**
 * Applies the same constrained presentation model to every page block.
 * The editor only writes values represented here, so color/background changes
 * do not need arbitrary CSS.
 */
export function blockAppearanceProps(block: Doc): { className: string; style: CSSProperties } {
  const appearance = (block.appearance || {}) as Doc
  const image = resolveBlockBackground(block)
  const mode = appearance.backgroundMode === 'image' && image ? 'image' : appearance.backgroundMode === 'color' ? 'color' : 'none'
  const surface = hexToRGBA(appearance.surfaceColor, appearance.surfaceOpacity, '#ffffff')
  const overlay = hexToRGBA(appearance.overlayColor, appearance.overlayOpacity, '#000000')
  const imageLayer = image ? `linear-gradient(${overlay}, ${overlay}), url(${JSON.stringify(image)})` : undefined

  const style = {
    ...(HEX.test(String(appearance.eyebrowColor || '')) ? { '--fabrick-eyebrow': safeColor(appearance.eyebrowColor, '#c98d00') } : {}),
    ...(HEX.test(String(appearance.headingColor || '')) ? { '--fabrick-heading': safeColor(appearance.headingColor, '#15130f') } : {}),
    ...(HEX.test(String(appearance.bodyColor || '')) ? { '--fabrick-copy': safeColor(appearance.bodyColor, '#4f493f') } : {}),
    ...(HEX.test(String(appearance.buttonColor || '')) ? { '--fabrick-button-bg': safeColor(appearance.buttonColor, '#f2b90c') } : {}),
    ...(HEX.test(String(appearance.buttonTextColor || '')) ? { '--fabrick-button-text': safeColor(appearance.buttonTextColor, '#15130f') } : {}),
    ...(HEX.test(String(appearance.buttonBorderColor || '')) ? { '--fabrick-button-border': safeColor(appearance.buttonBorderColor, '#f2b90c') } : {}),
    '--fabrick-button-border-width': `${Math.min(6, Math.max(0, Number(appearance.buttonBorderWidth || 0)))}px`,
    '--fabrick-button-height': String(appearance.buttonSize) === 'large' ? '58px' : String(appearance.buttonSize) === 'small' ? '42px' : '50px',
    '--fabrick-button-padding': String(appearance.buttonSize) === 'large' ? '30px' : String(appearance.buttonSize) === 'small' ? '17px' : '23px',
    '--fabrick-button-radius': String(appearance.buttonShape) === 'square' ? '0px' : String(appearance.buttonShape) === 'rounded' ? '12px' : '999px',
    ...(appearance.fontFamily ? { '--fabrick-font-family': safeFont(appearance.fontFamily) } : {}),
    '--fabrick-font-scale': `${Math.min(140, Math.max(80, Number(appearance.fontScale || 100))) / 100}`,
    '--fabrick-radius': `${Math.min(32, Math.max(0, Number(appearance.cornerRadius || 0)))}px`,
    ...(mode === 'color' || mode === 'image' ? { '--fabrick-surface': surface } : {}),
    ...(mode === 'color' || mode === 'image' ? { backgroundColor: surface } : {}),
    ...(mode === 'image' && imageLayer
      ? {
          backgroundImage: imageLayer,
          backgroundSize: appearance.backgroundFit === 'contain' ? 'contain' : 'cover',
          backgroundPosition: ['center', 'top', 'bottom', 'left', 'right'].includes(appearance.backgroundPosition)
            ? appearance.backgroundPosition
            : 'center',
          backgroundRepeat: 'no-repeat',
        }
      : {}),
  } as CSSProperties

  const spacing = ['compact', 'normal', 'large'].includes(String(appearance.verticalSpacing)) ? appearance.verticalSpacing : 'normal'
  const width = ['standard', 'wide', 'full'].includes(String(appearance.contentWidth)) ? appearance.contentWidth : 'standard'
  return { className: `fabrick-block fabrick-block-${mode} fabrick-space-${spacing} fabrick-width-${width}`, style }
}

/**
 * Page-level counterpart of blockAppearanceProps. The JSON is intentionally
 * presentation-only: it is safe to change from the Payload document editor
 * and does not alter a page's layout or content.
 */
export function pageAppearanceProps(page: Doc | null | undefined): { className: string; style: CSSProperties } {
  const appearance = (page?.pageAppearance || {}) as Doc
  const image = resolveBlockBackground({ appearance })
  const mode = appearance.backgroundMode === 'image' && image ? 'image' : appearance.backgroundMode === 'color' ? 'color' : 'none'
  const surface = hexToRGBA(appearance.surfaceColor, appearance.surfaceOpacity, '#ffffff')
  const overlay = hexToRGBA(appearance.overlayColor, appearance.overlayOpacity, '#000000')
  const imageLayer = image ? `linear-gradient(${overlay}, ${overlay}), url(${JSON.stringify(image)})` : undefined

  const style = {
    ...(HEX.test(String(appearance.eyebrowColor || '')) ? { '--fabrick-eyebrow': safeColor(appearance.eyebrowColor, '#c98d00') } : {}),
    ...(HEX.test(String(appearance.headingColor || '')) ? { '--fabrick-heading': safeColor(appearance.headingColor, '#15130f') } : {}),
    ...(HEX.test(String(appearance.bodyColor || '')) ? { '--fabrick-copy': safeColor(appearance.bodyColor, '#4f493f') } : {}),
    ...(HEX.test(String(appearance.buttonColor || '')) ? { '--fabrick-button-bg': safeColor(appearance.buttonColor, '#f2b90c') } : {}),
    ...(HEX.test(String(appearance.buttonTextColor || '')) ? { '--fabrick-button-text': safeColor(appearance.buttonTextColor, '#15130f') } : {}),
    ...(HEX.test(String(appearance.buttonBorderColor || '')) ? { '--fabrick-button-border': safeColor(appearance.buttonBorderColor, '#f2b90c') } : {}),
    '--fabrick-button-border-width': `${Math.min(6, Math.max(0, Number(appearance.buttonBorderWidth || 0)))}px`,
    '--fabrick-button-height': String(appearance.buttonSize) === 'large' ? '58px' : String(appearance.buttonSize) === 'small' ? '42px' : '50px',
    '--fabrick-button-padding': String(appearance.buttonSize) === 'large' ? '30px' : String(appearance.buttonSize) === 'small' ? '17px' : '23px',
    '--fabrick-button-radius': String(appearance.buttonShape) === 'square' ? '0px' : String(appearance.buttonShape) === 'rounded' ? '12px' : '999px',
    '--fabrick-font-family': safeFont(appearance.fontFamily),
    '--fabrick-font-scale': `${Math.min(150, Math.max(80, Number(appearance.fontScale || 100))) / 100}`,
    ...(mode === 'color' || mode === 'image' ? { backgroundColor: surface } : {}),
    ...(mode === 'image' && imageLayer
      ? {
          backgroundImage: imageLayer,
          backgroundSize: appearance.backgroundFit === 'contain' ? 'contain' : 'cover',
          backgroundPosition: ['center', 'top', 'bottom', 'left', 'right'].includes(appearance.backgroundPosition)
            ? appearance.backgroundPosition
            : 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }
      : {}),
  } as CSSProperties

  return { className: `fabrick-page fabrick-page-${mode}`, style }
}
