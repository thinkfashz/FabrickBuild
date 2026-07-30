export const PORTFOLIO_HOME_TEMPLATE_VERSION = 'portfolio-2026-07-29'

/**
 * Initial editable composition for Home. It is deliberately plain Payload
 * block data, not hard-coded React, so every text, CTA, image and color stays
 * editable in the Page document.
 */
export const portfolioHomeLayout = () => [
  {
    blockType: 'portfolioShowcase',
    eyebrow: 'ESTUDIO DIGITAL INDEPENDIENTE',
    heading: 'Diseñamos experiencias que se sienten vivas.',
    highlight: 'Diseño · código · movimiento',
    description: 'Estrategia, identidad y producto digital para marcas que buscan una presencia imposible de ignorar.',
    primaryCTA: { label: 'Ver proyectos', url: '#proyectos' },
    secondaryCTA: { label: 'Hablemos', url: '#contacto' },
    techStack: [{ label: 'Next.js' }, { label: 'React' }, { label: 'Payload CMS' }, { label: 'GSAP' }, { label: 'Vercel' }],
    projects: [
      { title: 'Marca en movimiento', type: 'Ecommerce / estrategia', description: 'Una identidad fluida convertida en una experiencia de compra con carácter.', imageURL: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1400&q=85', url: '#contacto' },
      { title: 'Arquitectura digital', type: 'Web / editorial', description: 'Una presencia editorial para mostrar espacios, proceso y confianza con claridad.', imageURL: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85', url: '#contacto' },
      { title: 'Sistema vivo', type: 'Producto / IA', description: 'Un producto que une operaciones, contenido y decisiones en tiempo real.', imageURL: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85', url: '#contacto' },
    ],
    appearance: {
      backgroundMode: 'color',
      surfaceColor: '#10110f',
      surfaceOpacity: 100,
      headingColor: '#f5f1e9',
      bodyColor: '#bfbbb2',
      buttonColor: '#f4c84b',
      buttonTextColor: '#15130f',
      fontFamily: 'sans',
      fontScale: 100,
      cornerRadius: 0,
    },
  },
  {
    blockType: 'contactForm',
    eyebrow: 'HAGAMOS ALGO MEMORABLE',
    heading: 'Tu próximo sitio puede empezar con una conversación.',
    description: 'Cuéntanos el contexto, objetivo y plazo. Diseñaremos una ruta clara para llevarlo a producción.',
    successMessage: 'Recibimos tu mensaje. Volveremos con el siguiente paso.',
    appearance: { backgroundMode: 'color', surfaceColor: '#f2eee6', surfaceOpacity: 100, headingColor: '#171713', bodyColor: '#565148', buttonColor: '#171713', buttonTextColor: '#ffffff', fontFamily: 'sans' },
  },
]

export const portfolioPageAppearance = {
  backgroundMode: 'color',
  surfaceColor: '#10110f',
  surfaceOpacity: 100,
  headingColor: '#f5f1e9',
  bodyColor: '#bfbbb2',
  buttonColor: '#f4c84b',
  buttonTextColor: '#15130f',
  fontFamily: 'sans',
}
