import type { Block } from 'payload'

const hasVisualImage = (value: unknown, siblingData: Record<string, any> | undefined, key: 'imageURL' | 'secondaryImageURL') => {
  if (value) return true
  const appearance = siblingData?.appearance
  return Boolean(appearance && typeof appearance === 'object' && typeof appearance[key] === 'string' && appearance[key].trim())
}

export const BeforeAfter: Block = {
  slug: 'beforeAfter',
  interfaceName: 'BeforeAfterBlock',
  labels: { singular: 'Antes y después', plural: 'Antes y después' },
  fields: [
    { name: 'eyebrow', type: 'text', defaultValue: 'Transformación' },
    { name: 'heading', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'before',
      type: 'upload',
      relationTo: 'media',
      validate: (value: unknown, { siblingData }: { siblingData?: Record<string, any> }) =>
        hasVisualImage(value, siblingData, 'imageURL')
          ? true
          : 'Selecciona una imagen de Multimedia o añádela desde Imagen → Imagen principal en el editor visual.',
    },
    {
      name: 'after',
      type: 'upload',
      relationTo: 'media',
      validate: (value: unknown, { siblingData }: { siblingData?: Record<string, any> }) =>
        hasVisualImage(value, siblingData, 'secondaryImageURL')
          ? true
          : 'Selecciona una imagen de Multimedia o añádela desde Imagen → Segunda imagen en el editor visual.',
    },
  ],
}
