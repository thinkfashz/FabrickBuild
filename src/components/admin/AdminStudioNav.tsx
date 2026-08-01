'use client'

const linkStyle = {
  minHeight: 52,
  padding: '9px 10px',
  display: 'grid',
  gridTemplateColumns: '34px minmax(0, 1fr)',
  alignItems: 'center',
  gap: 10,
  color: 'var(--theme-text)',
  border: '1px solid color-mix(in srgb, var(--theme-elevation-150) 76%, #d33b58 24%)',
  borderRadius: 10,
  background: 'color-mix(in srgb, var(--theme-elevation-50) 95%, #d33b58 5%)',
  textDecoration: 'none',
} as const

const iconStyle = {
  width: 34,
  height: 34,
  display: 'grid',
  placeItems: 'center',
  color: '#fff',
  borderRadius: 9,
  background: 'linear-gradient(145deg,#d33b58,#77152a)',
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
    <section aria-label="Estudio FabrickBuild" style={{ margin: '4px 8px 14px', padding: 10, display: 'grid', gap: 8, border: '1px solid var(--theme-elevation-100)', borderRadius: 12, background: 'linear-gradient(135deg, color-mix(in srgb, var(--theme-elevation-50) 94%, #d33b58 6%), var(--theme-elevation-50))' }}>
      <p style={{ margin: '0 8px 2px', color: 'var(--theme-elevation-500)', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>FabrickBuild Control Center</p>

      <NavCard href="/studio/sistema" title="Sistema y rendimiento" detail="Grafo vivo, conexiones, latencia, errores y soluciones" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><circle cx="4" cy="5" r="2"/><circle cx="20" cy="5" r="2"/><circle cx="4" cy="19" r="2"/><circle cx="20" cy="19" r="2"/><path d="m6 6 4 4m8-4-4 4M6 18l4-4m8 4-4-4"/></svg>} />
      <NavCard href="/admin/collections/backgrounds/create" title="Creador de backgrounds" detail="Sube video, genera frames y observa el envío" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 10 4.55-2.27A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.89L15 14"/><rect x="3" y="6" width="12" height="12" rx="2"/><path d="M7 10h4M7 14h2"/></svg>} />
      <NavCard href="/admin/collections/backgrounds" title="Secuencias guardadas" detail="Estado, preview, orden y configuración GSAP" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>} />
      <NavCard href="/admin/collections/media" title="Biblioteca multimedia" detail="Filtra frames por grupo, dispositivo y orden" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16v13H4z"/><path d="M8 7V4h8v3"/><path d="m7 16 3-3 2 2 2-2 3 3"/></svg>} />
      <NavCard href="/studio/integraciones" title="Integraciones" detail="Proveedores, modelos y bóveda cifrada" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/><circle cx="12" cy="12" r="3"/></svg>} />
    </section>
  )
}
