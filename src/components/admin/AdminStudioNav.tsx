'use client'

const tools = [
  { href: '/admin/studio', title: 'Fabrick Studio', detail: 'Centro privado de herramientas y mejoras', glyph: 'S' },
  { href: '/admin/studio/sistema', title: 'Sistema y rendimiento', detail: 'Conexiones, latencia, errores y soluciones', glyph: '↗' },
  { href: '/admin/collections/backgrounds/create', title: 'Creador de backgrounds', detail: 'Frames, video, Blob y Cloudinary', glyph: '▶' },
  { href: '/admin/collections/backgrounds', title: 'Backgrounds guardados', detail: 'Preview, páginas y configuración visual', glyph: '▣' },
  { href: '/admin/collections/media', title: 'Biblioteca multimedia', detail: 'Activos unificados de todos los proveedores', glyph: '▦' },
  { href: '/admin/studio/cloudinary', title: 'Cloudinary Media Studio', detail: 'Carpetas, imágenes, edición y Frame Engine', glyph: '☁' },
  { href: '/admin/studio/integraciones', title: 'Integraciones', detail: 'Proveedores y credenciales cifradas', glyph: '⌁' },
]

export default function AdminStudioNav() {
  return (
    <section aria-label="Fabrick Studio" style={{ margin: '4px 8px 14px', padding: 10, display: 'grid', gap: 7, border: '1px solid var(--theme-elevation-150)', borderRadius: 12, background: 'var(--theme-elevation-50)' }}>
      <p style={{ margin: '0 8px 3px', color: 'var(--theme-elevation-500)', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>FabrickBuild · Studio privado</p>
      {tools.map((tool) => (
        <a key={tool.href} href={tool.href} style={{ minHeight: 48, padding: '8px 9px', display: 'grid', gridTemplateColumns: '32px minmax(0,1fr)', alignItems: 'center', gap: 9, color: 'var(--theme-text)', border: '1px solid var(--theme-elevation-150)', borderRadius: 9, background: 'var(--theme-elevation-0)', textDecoration: 'none' }}>
          <span aria-hidden="true" style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 8, color: '#fff', fontWeight: 900, background: 'var(--theme-elevation-800)' }}>{tool.glyph}</span>
          <span style={{ minWidth: 0, display: 'grid', gap: 1 }}><strong>{tool.title}</strong><small style={{ overflow: 'hidden', color: 'var(--theme-elevation-500)', fontSize: 10, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tool.detail}</small></span>
        </a>
      ))}
    </section>
  )
}
