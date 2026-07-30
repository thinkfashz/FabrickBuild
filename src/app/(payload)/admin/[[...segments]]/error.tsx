'use client'

export default function PayloadAdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: '#11110f', color: '#fffaf0' }}>
      <section style={{ width: 'min(560px, 100%)', display: 'grid', gap: 14, padding: 'clamp(20px, 5vw, 36px)', border: '1px solid rgba(244, 200, 75, .35)', borderRadius: 18, background: 'linear-gradient(135deg, #1e1d19, #151512)' }}>
        <span style={{ color: '#f4c84b', fontSize: 12, fontWeight: 800, letterSpacing: '.13em' }}>FABRICKBUILD / ADMIN</span>
        <h1 style={{ margin: 0, fontSize: 'clamp(26px, 7vw, 40px)' }}>El administrador necesita recargarse.</h1>
        <p style={{ margin: 0, color: '#d7d0c0', lineHeight: 1.6 }}>Se detectó una carga incompleta. El esquema de datos se repara automáticamente al volver a intentar, sin borrar contenido.</p>
        <button type="button" onClick={reset} style={{ width: 'fit-content', minHeight: 44, padding: '0 16px', border: 0, borderRadius: 9, background: '#f4c84b', color: '#17140e', cursor: 'pointer', fontWeight: 800 }}>Reintentar cargar</button>
        <small style={{ color: '#98907f', overflowWrap: 'anywhere' }}>Detalle técnico: {error.message || 'Error de carga del administrador.'}</small>
      </section>
    </main>
  )
}
