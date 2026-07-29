'use client'

const linkStyle = {
  minHeight: 52,
  padding: '9px 10px',
  display: 'grid',
  gridTemplateColumns: '34px minmax(0, 1fr)',
  alignItems: 'center',
  gap: 10,
  color: 'var(--theme-text)',
  border: '1px solid color-mix(in srgb, var(--theme-elevation-150) 72%, #f4c84b 28%)',
  borderRadius: 10,
  background: 'color-mix(in srgb, var(--theme-elevation-50) 94%, #f4c84b 6%)',
  textDecoration: 'none',
} as const

const iconStyle = {
  width: 34,
  height: 34,
  display: 'grid',
  placeItems: 'center',
  color: '#141414',
  borderRadius: 9,
  background: '#f4c84b',
} as const

function NavCard({ href, title, detail, icon }: { href: string; title: string; detail: string; icon: React.ReactNode }) {
  return (
    <a href={href} style={linkStyle}>
      <span aria-hidden="true" style={iconStyle}>{icon}</span>
      <span style={{ minWidth: 0, display: 'grid', gap: 2 }}>
        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</strong>
        <small style={{ overflow: 'hidden', color: 'var(--theme-elevation-500)', fontSize: 10, lineHeight: 1.3, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</small>
      </span>
    </a>
  )
}

export default function AdminStudioNav() {
  return (
    <section aria-label="Estudio FabrickBuild" style={{ margin: '4px 8px 14px', padding: 10, display: 'grid', gap: 8, border: '1px solid var(--theme-elevation-100)', borderRadius: 12, background: 'linear-gradient(135deg, color-mix(in srgb, var(--theme-elevation-50) 92%, #f4c84b 8%), var(--theme-elevation-50))' }}>
      <p style={{ margin: '0 8px 2px', color: 'var(--theme-elevation-500)', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>Estudio FabrickBuild</p>

      <NavCard href="/studio/editor" title="Editor visual" detail="Bloques movibles, colores y preview responsive" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h16"/><path d="m7 17 10-10 3 3L10 20H7z"/><path d="m14 7 3 3"/></svg>} />
      <NavCard href="/admin/collections/backgrounds" title="Backgrounds cinematográficos" detail="Carpetas, frames, GSAP y Three.js" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>} />
      <NavCard href="/studio/multimedia" title="Biblioteca multimedia" detail="Blob, Cloudinary, S3, carpetas y registros" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16v13H4z"/><path d="M8 7V4h8v3"/><path d="m7 16 3-3 2 2 2-2 3 3"/></svg>} />
      <NavCard href="/studio/integraciones" title="Integraciones" detail="Proveedores, modelos y bóveda cifrada" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/><circle cx="12" cy="12" r="3"/></svg>} />
      <NavCard href="/admin/globals/header" title="Navegación del sitio" detail="Menú, CTA, logotipo y enlaces" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h10"/></svg>} />
      <NavCard href="/admin/globals/footer" title="Pie y configuración" detail="Pie, redes, contacto y SEO general" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v12H4z"/><path d="M8 20h8"/></svg>} />
    </section>
  )
}
