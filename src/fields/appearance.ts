import type { Field } from 'payload'

/**
 * Per-block presentation settings are intentionally stored as one JSON column.
 * It keeps visual changes independent from the structural content fields and
 * lets the visual builder add new safe options without database churn.
 */
export const appearanceField: Field = {
  name: 'appearance',
  type: 'json',
  label: 'Apariencia visual',
  admin: {
    components: {
      Field: '@/components/admin/VisualAppearanceField',
    },
    description:
      'Inspector visual: colores, tipografía, transparencia y fondo. No modifica el contenido del bloque.',
  },
}

/** The same non-technical inspector, applied to a complete Page instead of a block. */
export const pageAppearanceField: Field = {
  name: 'pageAppearance',
  type: 'json',
  label: 'Diseño global de la página',
  admin: {
    components: {
      Field: '@/components/admin/VisualAppearanceField',
    },
    description:
      'Define la tipografía y el background de esta página completa. Los bloques pueden heredar o sobrescribir estos valores.',
  },
}

/** Shared presentation controls for the navigation and footer globals. */
export const chromeAppearanceField = (label: string): Field => ({
  name: 'appearance',
  type: 'json',
  label,
  admin: {
    components: { Field: '@/components/admin/VisualAppearanceField' },
    description: 'Color, transparencia, imagen de fondo, tipografía y botones. Se aplica a todo el sitio al guardar.',
  },
})
