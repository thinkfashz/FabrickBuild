'use client'

import { ArrowUpRight, Blocks, Image, PanelsTopLeft, Settings2, Sparkles, SwatchBook } from 'lucide-react'
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

const workstations = [
  { href: '/admin/collections/pages', title: 'Páginas y visor', detail: 'Edita bloques y abre Live Preview sin salir de Payload.', label: 'CANVAS EN VIVO', icon: PanelsTopLeft, featured: true },
  { href: '/admin/collections/media', title: 'Biblioteca multimedia', detail: 'Organiza imágenes, folders y proveedores en un solo lugar.', label: 'ACTIVOS', icon: Image },
  { href: '/admin/collections/integrations', title: 'Conexiones', detail: 'Guarda claves y conecta Blob, Cloudinary, S3 e IA.', label: 'BÓVEDA', icon: Settings2 },
  { href: '/admin/collections/ai-changes', title: 'Asistente de IA', detail: 'Revisa propuestas antes de aplicarlas a una página.', label: 'PROPUESTAS', icon: Sparkles },
  { href: '/admin/globals/site-settings', title: 'Marca y configuración', detail: 'Identidad, SEO, navegación y pie de página.', label: 'SISTEMA', icon: SwatchBook },
  { href: '/admin/collections/reusable-components', title: 'Componentes', detail: 'Secciones versionadas para reutilizar en cada página.', label: 'BIBLIOTECA', icon: Blocks },
]

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

  return (
    <section
      className="fabrick-control-hub"
      style={{
        marginBottom: 24,
      }}
    >
      <p className="fabrick-control-hub__eyebrow">
        FABRICKBUILD / CONTROL
      </p>
      <h2 className="fabrick-control-hub__title">
        Administra la obra digital.
      </h2>
      <p className="fabrick-control-hub__intro">
        Edita páginas, construye componentes reutilizables, conecta proveedores de IA, publica
        proyectos y controla el contenido desde una interfaz preparada para móvil y escritorio.
      </p>

      <div className="fabrick-control-hub__grid">
        {workstations.map(({ href, title, detail, label, icon: Icon, featured }) => (
          <a href={href} className={`fabrick-control-hub__action${featured ? ' is-featured' : ''}`} key={href}>
            <span className="fabrick-control-hub__icon"><Icon size={19} /></span>
            <span className="fabrick-control-hub__copy"><small>{label}</small><strong>{title}</strong><em>{detail}</em></span>
            <ArrowUpRight className="fabrick-control-hub__arrow" size={17} />
          </a>
        ))}
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
