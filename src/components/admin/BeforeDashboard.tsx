'use client'

import { useState } from 'react'

type Health = {
  installed: boolean
  checks: {
    authentication: boolean
    blob: boolean
    collections: Record<string, number>
    database: boolean
    schema: boolean
    seed: boolean
    superAdmin: boolean
  }
}

export default function BeforeDashboard() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function verify() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/system/health', {
        cache: 'no-store',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo verificar')
      setHealth(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo verificar el sistema')
    } finally {
      setLoading(false)
    }
  }

  const linkStyle = {
    color: 'inherit',
    textDecoration: 'none',
    border: '1px solid var(--theme-elevation-150)',
    borderRadius: 12,
    padding: '15px 16px',
    background: 'var(--theme-elevation-50)',
    display: 'grid',
    gap: 5,
    minWidth: 0,
  } as const

  return (
    <section
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 14,
        marginBottom: 24,
        padding: 'clamp(16px, 4vw, 26px)',
        background:
          'linear-gradient(135deg, var(--theme-elevation-50), var(--theme-elevation-100))',
        overflow: 'hidden',
      }}
    >
      <p style={{ margin: 0, opacity: 0.65, fontSize: 12, letterSpacing: '.14em' }}>
        FABRICKBUILD / CONTROL
      </p>
      <h2 style={{ margin: '8px 0 10px', fontSize: 'clamp(24px, 5vw, 32px)' }}>
        Administra el producto digital.
      </h2>
      <p style={{ margin: 0, maxWidth: 820, lineHeight: 1.6 }}>
        Edita páginas desde un solo constructor nativo, administra multimedia, conecta proveedores
        y publica cambios con borradores, historial y Live Preview.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 10,
          marginTop: 18,
        }}
      >
        <a href="/admin/collections/pages" style={linkStyle}>
          <strong>Editor oficial de páginas →</strong>
          <small style={{ opacity: 0.68, lineHeight: 1.45 }}>
            Ordena bloques, edita contenido, diseño, responsive y SEO desde Payload.
          </small>
        </a>
        <a href="/studio/ia" style={linkStyle}>
          <strong>Chat y propuestas de IA →</strong>
          <small style={{ opacity: 0.68, lineHeight: 1.45 }}>
            Genera ideas y propuestas que después puedes aplicar en el editor de Payload.
          </small>
        </a>
        <a href="/studio/integraciones" style={linkStyle}>
          <strong>Bóveda de integraciones →</strong>
          <small style={{ opacity: 0.68, lineHeight: 1.45 }}>
            Selecciona proveedor, pega la clave y conecta automáticamente con cifrado por registro.
          </small>
        </a>
        <a href="/admin/collections/reusable-components" style={linkStyle}>
          <strong>Componentes reutilizables →</strong>
          <small style={{ opacity: 0.68, lineHeight: 1.45 }}>
            Biblioteca versionada de secciones creadas manualmente o con IA.
          </small>
        </a>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={verify}
          disabled={loading}
          style={{
            border: 0,
            borderRadius: 9,
            minHeight: 42,
            padding: '11px 15px',
            background: 'var(--theme-success-500)',
            color: '#fff',
            cursor: loading ? 'wait' : 'pointer',
            fontWeight: 700,
          }}
        >
          {loading ? 'Verificando…' : 'Verificar sistema'}
        </button>
        {health && (
          <strong style={{ color: health.installed ? 'var(--theme-success-500)' : 'var(--theme-error-500)' }}>
            {health.installed && Object.values(health.checks)
              .filter((value) => typeof value === 'boolean')
              .every(Boolean)
              ? 'Sistema completo y saludable'
              : 'Revisión requerida'}
          </strong>
        )}
        {error && <strong style={{ color: 'var(--theme-error-500)' }}>{error}</strong>}
      </div>

      {health && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 135px), 1fr))',
            gap: 8,
            marginTop: 16,
          }}
        >
          {[
            ['PostgreSQL', health.checks.database],
            ['Esquema', health.checks.schema],
            ['Superusuario', health.checks.superAdmin],
            ['Autenticación', health.checks.authentication],
            ['Contenido', health.checks.seed],
            ['Blob', health.checks.blob],
          ].map(([label, ok]) => (
            <div
              key={String(label)}
              style={{
                border: '1px solid var(--theme-elevation-150)',
                borderRadius: 8,
                padding: 10,
                minWidth: 0,
              }}
            >
              <small style={{ display: 'block', opacity: 0.65 }}>{String(label)}</small>
              <b>{ok ? 'Correcto' : 'Error'}</b>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
