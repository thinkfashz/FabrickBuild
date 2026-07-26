import type { Field } from 'payload'

export const seoFields: Field = {
  name: 'seo',
  type: 'group',
  label: 'SEO y redes sociales',
  fields: [
    {
      name: 'title',
      type: 'text',
      maxLength: 70,
      admin: { description: 'Título para Google y redes sociales.' }
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 170,
      admin: { description: 'Descripción breve para buscadores.' }
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media'
    },
    {
      name: 'noIndex',
      type: 'checkbox',
      defaultValue: false
    }
  ]
}
