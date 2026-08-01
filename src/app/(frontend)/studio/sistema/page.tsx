'use client'

import { useEffect, useMemo, useState } from 'react'

type Status = 'connected' | 'warning' | 'disconnected'
type Check = { id: string; label: string; status: Status; latency?: number; detail: string; solution?: string }
type Health = {
  ok: boolean
  generatedAt: string
  responseTime: number
  environment: string
  region: string
  checks: Check[]
  performance: { apiResponseMs: number; rating: string }
}

const statusLabel: Record<Status, string> = {
  connected: 'Conectado',
  warning: 'Atención',
  disconnected: 'Desconectado',
}

export default function SystemStudioPage() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [navigationMs, setNavigationMs] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/system-health', { cache: 'no-store', credentials: 'include' })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data) throw new Error(data?.message || `Diagnóstico HTTP ${response.status}`)
      setHealth(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible ejecutar el diagnóstico.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (entry) setNavigationMs(Math.round(entry.loadEventEnd || entry.duration))
  }, [])

  const disconnected = useMemo(() => health?.checks.filter((check) => check.status === 'disconnected') || [], [health])

  return (
    <main className="system-studio">
      <header>
        <div>
          <span>FABRICKBUILD CONTROL CENTER</span>
          <h1>Arquitectura, conexiones y rendimiento</h1>
          <p>Mapa vivo del sistema. Cada módulo muestra su estado, latencia, causa exacta y una solución recomendada.</p>
        </div>
        <div className="actions">
          <a href="/admin">Volver al admin</a>
          <button type="button" onClick={() => void load()} disabled={loading}>{loading ? 'Analizando…' : 'Actualizar diagnóstico'}</button>
        </div>
      </header>

      <section className="summary">
        <article><small>Estado general</small><strong>{health?.ok ? 'Operativo' : loading ? 'Analizando' : 'Requiere atención'}</strong></article>
        <article><small>Respuesta API</small><strong>{health ? `${health.responseTime} ms` : '—'}</strong></article>
        <article><small>Carga del navegador</small><strong>{navigationMs ? `${navigationMs} ms` : 'Midiendo'}</strong></article>
        <article><small>Entorno / región</small><strong>{health ? `${health.environment} · ${health.region}` : '—'}</strong></article>
      </section>

      {error && <section className="fatal"><strong>No se pudo completar el diagnóstico</strong><p>{error}</p><code>Comprueba /api/system-health y los registros Runtime de Vercel.</code></section>}

      <section className="graph" aria-label="Grafo de arquitectura">
        <svg viewBox="0 0 1000 560" role="img" aria-label="Conexiones de FabrickBuild">
          <defs><linearGradient id="wire" x1="0" x2="1"><stop stopColor="#d33b58"/><stop offset="1" stopColor="#e9b52b"/></linearGradient></defs>
          <path d="M500 280 L170 105 M500 280 L500 85 M500 280 L830 105 M500 280 L160 440 M500 280 L500 475 M500 280 L840 440" />
          <circle cx="500" cy="280" r="78" />
          <text x="500" y="272" textAnchor="middle">FABRICKBUILD</text><text x="500" y="298" textAnchor="middle" className="sub">núcleo</text>
          {health?.checks.slice(0, 6).map((check, index) => {
            const points = [[170,105],[500,85],[830,105],[160,440],[500,475],[840,440]][index]
            return <g key={check.id} className={`node ${check.status}`}><circle cx={points[0]} cy={points[1]} r="62"/><text x={points[0]} y={points[1]-5} textAnchor="middle">{check.label.slice(0,18)}</text><text x={points[0]} y={points[1]+18} textAnchor="middle" className="sub">{statusLabel[check.status]}</text></g>
          })}
        </svg>
      </section>

      <section className="checks">
        {(health?.checks || []).map((check) => (
          <article key={check.id} data-status={check.status}>
            <div className="check-title"><i/><div><strong>{check.label}</strong><small>{statusLabel[check.status]}{typeof check.latency === 'number' ? ` · ${check.latency} ms` : ''}</small></div></div>
            <p>{check.detail}</p>
            {check.status !== 'connected' && <div className="solution"><b>Cómo solucionarlo</b><span>{check.solution || 'Revisa los registros del módulo y su configuración.'}</span></div>}
          </article>
        ))}
      </section>

      {disconnected.length > 0 && <section className="incident"><strong>{disconnected.length} conexión(es) requieren atención</strong><p>Abre cada tarjeta roja para seguir la solución indicada. Ningún secreto o token se muestra en esta pantalla.</p></section>}

      <style jsx>{`
        :global(body){margin:0;background:#090a0c;color:#f5f5f5;font-family:Inter,system-ui,sans-serif}.system-studio{min-height:100vh;padding:clamp(22px,4vw,56px);background:radial-gradient(circle at 50% 0,rgba(211,59,88,.14),transparent 38%),#090a0c}header{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;max-width:1280px;margin:auto}header span{font-size:11px;font-weight:900;letter-spacing:.18em;color:#e9b52b}h1{font-size:clamp(30px,5vw,64px);line-height:1;margin:10px 0 14px;max-width:850px}header p{color:#aaa;max-width:760px;line-height:1.6}.actions{display:flex;gap:10px;flex-wrap:wrap}.actions a,.actions button{border:1px solid #34363d;border-radius:12px;padding:12px 15px;background:#17181c;color:#fff;text-decoration:none;font-weight:800}.actions button{background:linear-gradient(135deg,#d33b58,#79152b);cursor:pointer}.summary{max-width:1280px;margin:28px auto 18px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.summary article,.checks article,.fatal,.incident{border:1px solid #292b31;border-radius:16px;background:rgba(24,25,29,.82);backdrop-filter:blur(14px)}.summary article{padding:18px}.summary small{display:block;color:#8f929b;margin-bottom:8px}.summary strong{font-size:20px}.graph{max-width:1280px;margin:auto;border:1px solid #292b31;border-radius:22px;background:linear-gradient(145deg,rgba(21,22,26,.96),rgba(11,12,14,.96));overflow:hidden}.graph svg{display:block;width:100%;max-height:620px}.graph path{stroke:url(#wire);stroke-width:2;fill:none;stroke-dasharray:8 10;opacity:.7}.graph circle{fill:#17191e;stroke:#d33b58;stroke-width:2}.graph text{fill:#fff;font-size:15px;font-weight:900}.graph .sub{fill:#a5a7ad;font-size:11px;font-weight:700}.node.connected circle{stroke:#35c477}.node.warning circle{stroke:#e9b52b}.node.disconnected circle{stroke:#ff506d}.checks{max-width:1280px;margin:18px auto;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.checks article{padding:18px}.check-title{display:flex;align-items:center;gap:11px}.check-title i{width:11px;height:11px;border-radius:50%;background:#35c477;box-shadow:0 0 18px #35c477}.checks article[data-status=warning] i{background:#e9b52b;box-shadow:0 0 18px #e9b52b}.checks article[data-status=disconnected] i{background:#ff506d;box-shadow:0 0 18px #ff506d}.check-title strong{display:block}.check-title small{color:#92959d}.checks p{color:#b9bbc1;line-height:1.55}.solution{display:grid;gap:5px;padding:12px;border-radius:11px;background:#101115;border-left:3px solid #ff506d}.solution b{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#ff748a}.solution span{font-size:13px;color:#ddd}.fatal,.incident{max-width:1280px;margin:18px auto;padding:18px;border-color:#ff506d}.fatal code{color:#e9b52b}.incident{border-color:#e9b52b}@media(max-width:900px){header{align-items:flex-start;flex-direction:column}.summary{grid-template-columns:1fr 1fr}.checks{grid-template-columns:1fr}.graph svg{min-width:760px}.graph{overflow:auto}}@media(max-width:520px){.summary{grid-template-columns:1fr}.system-studio{padding:18px}.actions{width:100%}.actions a,.actions button{flex:1;text-align:center}}
      `}</style>
    </main>
  )
}
