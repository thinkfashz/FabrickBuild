import type { Block, Field } from 'payload'

export type AppearanceValue = {
  surfaceMode?: 'transparent' | 'glass' | 'solid' | 'image'
  surfaceColor?: string
  surfaceOpacity?: number
  backdropBlur?: number
  headingColor?: string
  bodyColor?: string
  accentColor?: string
  buttonColor?: string
  buttonTextColor?: string
  borderColor?: string
  borderWidth?: number
  cornerRadius?: number
  contentWidth?: 'narrow' | 'normal' | 'wide' | 'full'
  textAlign?: 'left' | 'center' | 'right'
  paddingTop?: number
  paddingBottom?: number
  fontScale?: number
  backgroundURL?: string
  backgroundFit?: 'cover' | 'contain'
  overlayColor?: string
  overlayOpacity?: number
  mobileLayout?: 'stack' | 'horizontal' | 'compact'
  mobileTextAlign?: 'left' | 'center' | 'right'
  mobilePadding?: number
  mobileHeadingScale?: number
  hideOnMobile?: boolean
  animationPreset?: 'none' | 'fade-up' | 'fade' | 'scale' | 'slide-left' | 'slide-right'
  animationDuration?: number
  animationDelay?: number
}

export const defaultAppearance: AppearanceValue = {
  surfaceMode: 'transparent',
  surfaceColor: '#ffffff',
  surfaceOpacity: 100,
  backdropBlur: 18,
  headingColor: '#151515',
  bodyColor: '#4b4b4b',
  accentColor: '#f4c84b',
  buttonColor: '#f4c84b',
  buttonTextColor: '#15130f',
  borderColor: '#ffffff',
  borderWidth: 0,
  cornerRadius: 24,
  contentWidth: 'normal',
  textAlign: 'left',
  paddingTop: 96,
  paddingBottom: 96,
  fontScale: 100,
  backgroundFit: 'cover',
  overlayColor: '#10110f',
  overlayOpacity: 0,
  mobileLayout: 'stack',
  mobileTextAlign: 'left',
  mobilePadding: 22,
  mobileHeadingScale: 86,
  hideOnMobile: false,
  animationPreset: 'fade-up',
  animationDuration: 700,
  animationDelay: 0,
}

export const appearanceField = (name = 'appearance', label = 'Apariencia y responsive'): Field => ({
  name,
  type: 'json',
  label,
  defaultValue: defaultAppearance,
  admin: {
    components: {
      Field: '@/components/admin/AppearanceEditor',
    },
    description:
      'Controla fondo, transparencia, blur, colores, tamaños, espaciado, comportamiento móvil y animación sin escribir CSS.',
  },
})

export const withAppearance = (block: Block): Block => ({
  ...block,
  fields: [...block.fields, appearanceField()],
})
