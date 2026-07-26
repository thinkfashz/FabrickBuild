import React from 'react'

export default function BeforeDashboard() {
  return (
    <section
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 14,
        marginBottom: 24,
        padding: '24px 26px',
        background:
          'linear-gradient(135deg, var(--theme-elevation-50), var(--theme-elevation-100))'
      }}
    >
      <p style={{ margin: 0, opacity: 0.65, fontSize: 12, letterSpacing: '.14em' }}>
        FABRICKBUILD / CONTROL
      </p>
      <h2 style={{ margin: '8px 0 10px', fontSize: 28 }}>Administra la obra digital.</h2>
      <p style={{ margin: 0, maxWidth: 760, lineHeight: 1.6 }}>
        Edita páginas, publica proyectos, organiza servicios, responde cotizaciones y controla el
        contenido público desde un solo lugar.
      </p>
    </section>
  )
}
