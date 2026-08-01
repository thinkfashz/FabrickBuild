export function AdminLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--theme-text)' }}>
      <span style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 12, color: '#fff', fontWeight: 950, background: 'linear-gradient(145deg,#d33b58,#6f1025)', boxShadow: '0 10px 28px rgba(211,59,88,.28)' }}>F</span>
      <span style={{ display: 'grid', lineHeight: 1.05 }}><strong style={{ fontSize: 16 }}>FabrickBuild</strong><small style={{ color: 'var(--theme-elevation-500)', fontSize: 9, letterSpacing: '.13em' }}>CONTROL CENTER</small></span>
    </div>
  )
}

export function AdminIcon() {
  return <span style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 10, color: '#fff', fontWeight: 950, background: 'linear-gradient(145deg,#d33b58,#6f1025)' }}>F</span>
}
