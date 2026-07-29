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
    description:
      'Controla colores, transparencia y fondos desde el Editor visual. No modifica el contenido del bloque.',
  },
}
