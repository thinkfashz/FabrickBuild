'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Experience = { loaderEnabled?: boolean; loaderDuration?: number; loaderTitle?: string; loaderMessage?: string; consentEnabled?: boolean; consentVersion?: string }

export function SiteExperience({ experience }: { experience?: Experience | null }) {
  const [loading, setLoading] = useState(Boolean(experience?.loaderEnabled))
  const [showConsent, setShowConsent] = useState(false)
  const version = experience?.consentVersion || '2026-07'

  useEffect(() => {
    const duration = Math.min(4, Math.max(0, Number(experience?.loaderDuration ?? 4))) * 1000
    const timer = window.setTimeout(() => setLoading(false), duration)
    try { setShowConsent(experience?.consentEnabled !== false && localStorage.getItem('fabrick-consent-version') !== version) } catch { setShowConsent(experience?.consentEnabled !== false) }
    return () => window.clearTimeout(timer)
  }, [experience?.consentEnabled, experience?.loaderDuration, version])

  const accept = (choice: 'necessary' | 'all') => {
    try { localStorage.setItem('fabrick-consent-version', version); localStorage.setItem('fabrick-consent-choice', choice) } catch {}
    setShowConsent(false)
  }

  return <>
    {loading && <div className="site-loader" role="status" aria-live="polite"><div className="site-loader__mark">F</div><strong>{experience?.loaderTitle || 'FabrickBuild'}</strong><span>{experience?.loaderMessage || 'Preparando la experiencia'}</span><i /></div>}
    {showConsent && <aside className="consent-banner" aria-label="Privacidad y cookies"><div><b>Tu privacidad importa</b><p>Usamos datos estrictamente necesarios para que el sitio funcione y para responder tus solicitudes. Puedes revisar cómo tratamos datos y cookies antes de aceptar.</p></div><div className="consent-banner__actions"><button className="consent-secondary" onClick={() => accept('necessary')}>Solo necesarias</button><button onClick={() => accept('all')}>Aceptar y continuar</button></div><p className="consent-banner__links"><Link href="/privacidad">Privacidad</Link><Link href="/cookies">Cookies</Link><Link href="/terminos">Términos</Link></p></aside>}
  </>
}
