export default function AdminLoginWelcome() {
  return (
    <section style={{ maxWidth: 620, margin: '0 auto 22px', padding: 'clamp(20px,4vw,34px)', border: '1px solid color-mix(in srgb,var(--theme-elevation-200) 75%,#d33b58 25%)', borderRadius: 22, background: 'radial-gradient(circle at 90% 0,rgba(211,59,88,.2),transparent 38%),linear-gradient(145deg,var(--theme-elevation-50),var(--theme-elevation-100))', boxShadow: '0 22px 70px rgba(0,0,0,.12)' }}>
      <span style={{ color: '#d33b58', fontSize: 10, fontWeight: 900, letterSpacing: '.16em' }}>FABRICKBUILD CONTROL CENTER</span>
      <h1 style={{ margin: '10px 0 10px', fontSize: 'clamp(28px,5vw,48px)', lineHeight: 1 }}>Bienvenido de nuevo</h1>
      <p style={{ margin: 0, maxWidth: 520, color: 'var(--theme-elevation-600)', lineHeight: 1.6 }}>Administra páginas, multimedia, proyectos, integraciones y diagnósticos desde un panel creado para Soluciones Fabrick.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
        {['CMS y contenidos', 'Multimedia privada', 'Estado del sistema', 'Rendimiento'].map((item) => <span key={item} style={{ padding: '7px 10px', border: '1px solid var(--theme-elevation-200)', borderRadius: 999, fontSize: 10, fontWeight: 750, background: 'var(--theme-elevation-50)' }}>{item}</span>)}
      </div>
    </section>
  )
}
