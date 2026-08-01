'use client'

import Link from 'next/link'
import { useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'

type ServiceOption = {
  id?: string | number | null
  title?: string | null
}

type Props = {
  services?: ServiceOption[]
  successMessage?: string
  consentVersion?: string
}

export function LeadForm({ services = [], successMessage, consentVersion = '2026-07' }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const serviceOptions = useMemo(
    () =>
      services.filter(
        (item): item is ServiceOption & { id: string | number } =>
          item?.id !== undefined && item.id !== null,
      ),
    [services],
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setState('loading')
    setError('')

    const form = new FormData(formElement)
    const payload = {
      name: form.get('name'),
      phone: form.get('phone'),
      email: form.get('email') || undefined,
      commune: form.get('commune') || undefined,
      service: form.get('service') || undefined,
      projectType: form.get('projectType') || undefined,
      area: form.get('area') ? Number(form.get('area')) : undefined,
      budget: form.get('budget') || 'unknown',
      message: form.get('message'),
      company: form.get('company') || undefined,
      privacyConsent: form.get('privacyConsent') === 'yes',
      consentVersion,
    }

    try {
      const response = await fetch('/api/public/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(result.error || 'No fue posible registrar la solicitud.')
      formElement.reset()
      setState('success')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ocurrió un error.')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="form-success" role="status">
        <CheckCircle2 size={34} />
        <h3>Solicitud recibida</h3>
        <p>{successMessage || 'Te contactaremos para revisar el proyecto.'}</p>
        <button type="button" className="button button-dark" onClick={() => setState('idle')}>
          Enviar otra solicitud
        </button>
      </div>
    )
  }

  return (
    <form className="lead-form" onSubmit={submit}>
      <label className="form-honeypot" aria-hidden="true">
        Empresa
        <input name="company" type="text" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="field-grid">
        <label>Nombre<input name="name" required minLength={2} maxLength={100} autoComplete="name" /></label>
        <label>Teléfono<input name="phone" required minLength={8} maxLength={32} inputMode="tel" autoComplete="tel" /></label>
        <label>Correo<input name="email" type="email" maxLength={160} autoComplete="email" /></label>
        <label>Comuna o ciudad<input name="commune" maxLength={120} autoComplete="address-level2" /></label>
        <label>
          Tipo de proyecto
          <select name="projectType" defaultValue="">
            <option value="">Seleccionar</option><option value="new-home">Casa nueva</option><option value="remodeling">Remodelación</option><option value="repair">Reparación</option><option value="other">Otro</option>
          </select>
        </label>
        <label>
          Servicio
          <select name="service" defaultValue="">
            <option value="">Seleccionar</option>
            {serviceOptions.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
          </select>
        </label>
        <label>Superficie aproximada<input name="area" type="number" min="0" max="100000" placeholder="m²" /></label>
        <label>
          Presupuesto
          <select name="budget" defaultValue="unknown">
            <option value="unknown">Por definir</option><option value="under-1m">Menos de $1.000.000 CLP</option><option value="1m-5m">$1.000.000 a $5.000.000 CLP</option><option value="5m-20m">$5.000.000 a $20.000.000 CLP</option><option value="over-20m">Más de $20.000.000 CLP</option>
          </select>
        </label>
      </div>
      <label>Cuéntanos qué necesitas<textarea name="message" required minLength={10} maxLength={2500} rows={5} /></label>
      <label className="privacy-consent-check">
        <input name="privacyConsent" type="checkbox" value="yes" required />
        <span>
          Autorizo el tratamiento de estos datos para recibir respuesta a mi solicitud. Leí la <Link href="/privacidad">política de privacidad</Link> y los <Link href="/terminos">términos de navegación</Link>.
        </span>
      </label>
      {state === 'error' && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="button button-dark" disabled={state === 'loading'}>
        {state === 'loading' ? <><Loader2 className="spin" size={18} /> Enviando</> : 'Solicitar contacto'}
      </button>
    </form>
  )
}
