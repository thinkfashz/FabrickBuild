export const PORTFOLIO_HOME_TEMPLATE_VERSION = 'portfolio-factory-restored-2026-07-30'

type Doc = Record<string, any>

/**
 * Preset visual de fábrica basado en el deployment aprobado por el propietario.
 * El documento de Payload no se sobrescribe: el background seleccionado se
 * inyecta solo durante el render para mantener Multimedia/Backgrounds como fuente.
 */
export const portfolioHomeLayout = (background?: Doc | null) => [
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
    runtimeBackground: background || null,
    appearance: {
      surfaceMode: 'transparent',
      surfaceColor: '#10110f',
      surfaceOpacity: 100,
      backdropBlur: 0,
      headingColor: '#f5f1e9',
      bodyColor: '#bfbbb2',
      accentColor: '#ff1f35',
      buttonColor: '#f4c84b',
      buttonTextColor: '#15130f',
      borderColor: '#ff1f35',
      borderWidth: 0,
      cornerRadius: 0,
      contentWidth: 'full',
      textAlign: 'left',
      paddingTop: 0,
      paddingBottom: 0,
      fontScale: 100,
      backgroundFit: 'cover',
      overlayColor: '#050304',
      overlayOpacity: 18,
      mobileLayout: 'stack',
      mobileTextAlign: 'left',
      mobilePadding: 16,
      mobileHeadingScale: 100,
      animationPreset: 'none',
    },
  },
]

export function portfolioLayoutFromPage(layout: Doc[] | null | undefined, background?: Doc | null): Doc[] {
  const existing = Array.isArray(layout) ? layout.find((block) => block?.blockType === 'portfolioShowcase') : null
  if (!existing) return portfolioHomeLayout(background)
  return [{
    ...existing,
    runtimeBackground: background || existing.runtimeBackground || null,
    appearance: {
      ...portfolioHomeLayout(background)[0].appearance,
      ...(existing.appearance || {}),
    },
  }]
}
