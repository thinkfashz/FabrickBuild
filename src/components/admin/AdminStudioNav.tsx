'use client'

export default function AdminStudioNav() {
  return (
    <section
      aria-label="IA y automatización"
      style={{
        margin: '4px 8px 14px',
        padding: '10px',
        border: '1px solid var(--theme-elevation-100)',
        borderRadius: 12,
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--theme-elevation-50) 92%, #f4c84b 8%), var(--theme-elevation-50))',
      }}
    >
      <p
        style={{
          margin: '0 8px 8px',
          color: 'var(--theme-elevation-500)',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
        }}
      >
        IA y automatización
      </p>

      <a
        href="/studio/integraciones"
        style={{
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
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 34,
            height: 34,
            display: 'grid',
            placeItems: 'center',
            color: '#141414',
            borderRadius: 9,
            background: '#f4c84b',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v4" />
            <path d="M12 18v4" />
            <path d="m4.93 4.93 2.83 2.83" />
            <path d="m16.24 16.24 2.83 2.83" />
            <path d="M2 12h4" />
            <path d="M18 12h4" />
            <path d="m4.93 19.07 2.83-2.83" />
            <path d="m16.24 7.76 2.83-2.83" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </span>

        <span style={{ minWidth: 0, display: 'grid', gap: 2 }}>
          <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Integraciones
          </strong>
          <small
            style={{
              overflow: 'hidden',
              color: 'var(--theme-elevation-500)',
              fontSize: 10,
              lineHeight: 1.3,
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Proveedores, modelos y bóveda cifrada
          </small>
        </span>
      </a>
    </section>
  )
}
