'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ShieldCheck, X } from 'lucide-react'

type ConsentSettings = {
  enabled?: boolean
  version?: string
  title?: string
  message?: string
  acceptAllLabel?: string
  rejectOptionalLabel?: string
  settingsLabel?: string
  saveLabel?: string
  privacyURL?: string
  cookiesURL?: string
  termsURL?: string
}

type ConsentChoice = {
  version: string
  necessary: true
  analytics: boolean
  personalization: boolean
  marketing: boolean
  decidedAt: string
}

const STORAGE_KEY = 'fabrick-consent'

const emptyChoice = (version: string): ConsentChoice => ({
  version,
  necessary: true,
  analytics: false,
  personalization: false,
  marketing: false,
  decidedAt: '',
})

export function ConsentBanner({ settings }: { settings?: ConsentSettings | null }) {
  const version = String(settings?.version || '2026-07')
  const initial = useMemo(() => emptyChoice(version), [version])
  const [choice, setChoice] = useState<ConsentChoice>(initial)
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const publish = useCallback((next: ConsentChoice) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    document.documentElement.dataset.consentAnalytics = String(next.analytics)
    document.documentElement.dataset.consentPersonalization = String(next.personalization)
    document.documentElement.dataset.consentMarketing = String(next.marketing)
    window.dispatchEvent(new CustomEvent('fabrick:consent', { detail: next }))
    setChoice(next)
    setVisible(false)
    setExpanded(false)
  }, [])

  useEffect(() => {
    if (settings?.enabled === false) return
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as ConsentChoice | null
      if (stored?.version === version && stored.necessary === true) {
        setChoice(stored)
        document.documentElement.dataset.consentAnalytics = String(Boolean(stored.analytics))
        document.documentElement.dataset.consentPersonalization = String(Boolean(stored.personalization))
        document.documentElement.dataset.consentMarketing = String(Boolean(stored.marketing))
      } else {
        setVisible(true)
      }
    } catch {
      setVisible(true)
    }

    const reopen = () => {
      setExpanded(true)
      setVisible(true)
    }
    window.addEventListener('fabrick:privacy-settings', reopen)
    return () => window.removeEventListener('fabrick:privacy-settings', reopen)
  }, [settings?.enabled, version])

  if (settings?.enabled === false || !visible) return null

  const commit = (partial: Partial<ConsentChoice>) =>
    publish({ ...choice, ...partial, version, necessary: true, decidedAt: new Date().toISOString() })

  return (
    <div className="consent-layer" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className={`consent-card ${expanded ? 'consent-card--expanded' : ''}`}>
        <div className="consent-card__icon"><ShieldCheck aria-hidden="true" /></div>
        <div className="consent-card__content">
          <div className="consent-card__head">
            <div>
              <span>PRIVACIDAD Y NAVEGACIÓN</span>
              <h2 id="consent-title">{settings?.title || 'Tu privacidad importa'}</h2>
            </div>
            <button type="button" className="consent-close" onClick={() => setVisible(false)} aria-label="Cerrar temporalmente">
              <X size={20} />
            </button>
          </div>
          <p>{settings?.message || 'Usamos datos necesarios para el funcionamiento del sitio. Las categorías opcionales permanecen desactivadas hasta que las autorices.'}</p>

          {expanded && (
            <div className="consent-options">
              <label>
                <span><strong>Necesarias</strong><small>Seguridad, sesión, preferencias básicas y funcionamiento del sitio.</small></span>
                <input type="checkbox" checked disabled aria-label="Cookies necesarias siempre activas" />
              </label>
              <label>
                <span><strong>Analítica</strong><small>Nos ayuda a comprender el uso del sitio sin activar publicidad.</small></span>
                <input type="checkbox" checked={choice.analytics} onChange={(event) => setChoice((current) => ({ ...current, analytics: event.target.checked }))} />
              </label>
              <label>
                <span><strong>Personalización</strong><small>Recuerda opciones visuales y contenido preferido.</small></span>
                <input type="checkbox" checked={choice.personalization} onChange={(event) => setChoice((current) => ({ ...current, personalization: event.target.checked }))} />
              </label>
              <label>
                <span><strong>Marketing</strong><small>Permite medir campañas o mostrar comunicaciones comerciales relevantes.</small></span>
                <input type="checkbox" checked={choice.marketing} onChange={(event) => setChoice((current) => ({ ...current, marketing: event.target.checked }))} />
              </label>
            </div>
          )}

          <div className="consent-links">
            <Link href={settings?.privacyURL || '/privacidad'}>Privacidad</Link>
            <Link href={settings?.cookiesURL || '/cookies'}>Cookies</Link>
            <Link href={settings?.termsURL || '/terminos'}>Términos</Link>
          </div>

          <div className="consent-actions">
            <button type="button" className="button button-ghost-dark" onClick={() => commit({ analytics: false, personalization: false, marketing: false })}>
              {settings?.rejectOptionalLabel || 'Solo necesarias'}
            </button>
            {expanded ? (
              <button type="button" className="button button-outline" onClick={() => commit({})}>
                {settings?.saveLabel || 'Guardar preferencias'}
              </button>
            ) : (
              <button type="button" className="button button-outline" onClick={() => setExpanded(true)}>
                {settings?.settingsLabel || 'Configurar'}
              </button>
            )}
            <button type="button" className="button button-yellow" onClick={() => commit({ analytics: true, personalization: true, marketing: true })}>
              {settings?.acceptAllLabel || 'Aceptar todo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
