import type { Block } from 'payload'

/**
 * Preset visual usado por la portada cinematográfica de fábrica.
 * El background no se duplica dentro del bloque: se selecciona en
 * Página → Diseño de página → Background multimedia y se inyecta al render.
 */
export const PortfolioShowcase: Block = {
  slug: 'portfolioShowcase',
  interfaceName: 'PortfolioShowcaseBlock',
  labels: { singular: 'Portfolio cinematográfico', plural: 'Portfolios cinematográficos' },
  fields: [
    { name: 'eyebrow', type: 'text', label: 'Texto superior', defaultValue: 'ESTUDIO DIGITAL INDEPENDIENTE' },
    { name: 'heading', type: 'text', label: 'Título', required: true, defaultValue: 'Diseñamos experiencias que se sienten vivas.' },
    { name: 'highlight', type: 'text', label: 'Texto destacado', defaultValue: 'Diseño · código · movimiento' },
    {
      name: 'description',
      type: 'textarea',
      label: 'Descripción',
      defaultValue: 'Estrategia, identidad y producto digital para marcas que buscan una presencia imposible de ignorar.',
    },
    {
      name: 'primaryCTA',
      type: 'group',
      label: 'Botón principal',
      fields: [
        { name: 'label', type: 'text', defaultValue: 'Ver proyectos' },
        { name: 'url', type: 'text', defaultValue: '#proyectos' },
      ],
    },
    {
      name: 'secondaryCTA',
      type: 'group',
      label: 'Botón secundario',
      fields: [
        { name: 'label', type: 'text', defaultValue: 'Hablemos' },
        { name: 'url', type: 'text', defaultValue: '#contacto' },
      ],
    },
    {
      name: 'techStack',
      type: 'array',
      minRows: 3,
      maxRows: 12,
      labels: { singular: 'Tecnología', plural: 'Tecnologías' },
      fields: [{ name: 'label', type: 'text', required: true, label: 'Nombre' }],
      defaultValue: [
        { label: 'Next.js' },
        { label: 'React' },
        { label: 'Payload CMS' },
        { label: 'GSAP' },
        { label: 'Vercel' },
      ],
    },
    {
      name: 'projects',
      type: 'array',
      minRows: 1,
      maxRows: 6,
      labels: { singular: 'Caso', plural: 'Casos del portfolio' },
      fields: [
        { name: 'title', type: 'text', required: true, label: 'Nombre del caso' },
        { name: 'type', type: 'text', label: 'Categoría / servicio' },
        { name: 'description', type: 'textarea', label: 'Resumen' },
        { name: 'image', type: 'upload', relationTo: 'media', label: 'Imagen del proyecto' },
        { name: 'imageURL', type: 'text', label: 'URL externa de imagen' },
        { name: 'url', type: 'text', label: 'Enlace del caso', defaultValue: '#contacto' },
      ],
      defaultValue: [
        {
          title: 'Marca en movimiento',
          type: 'Ecommerce / estrategia',
          description: 'Una identidad fluida convertida en una experiencia de compra con carácter.',
          imageURL: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1400&q=85',
        },
        {
          title: 'Arquitectura digital',
          type: 'Web / editorial',
          description: 'Una presencia editorial para mostrar espacios, proceso y confianza con claridad.',
          imageURL: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85',
        },
        {
          title: 'Sistema vivo',
          type: 'Producto / IA',
          description: 'Un producto que une operaciones, contenido y decisiones en tiempo real.',
          imageURL: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85',
        },
      ],
    },
  ],
}
