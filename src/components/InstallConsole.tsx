'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import styles from '@/app/(frontend)/instalar/install.module.css'

type Status = {
  installed?: boolean
  status?: string
}

type Result = {
  ok: boolean
  error?: string
  installed?: boolean
  checks?: {
    authentication: boolean
    blob: boolean
    collections: Record<string, number>
    database: boolean
    schema: boolean
    seed: boolean
    superAdmin: boolean
  }
}

export function InstallConsole() {
  const [status, setStatus] = useState<Status>({})
  const [secret, setSecret] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    fetch('/api/system/bootstrap', { cache: 'no-store' })
      .then((response) => response.json())
      .then(setStatus)
      .catch(() => setStatus({ status: 'unavailable' }))
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/system/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          confirmation: confirmed ? 'INSTALAR FABRICKBUILD' : '',
        }),
      })
      const data = (await response.json()) as Result
      setResult(data)
      if (data.ok) {
        setSecret('')
        setStatus({ installed: true, status: 'completed' })
      }
    } catch {
      setResult({ ok: false, error: 'No se pudo conectar con el instalador.' })
    } finally {
      setLoading(false)
    }
  }

  if (status.installed || status.status === 'completed') {
    return (
      <section className={`${styles.notice} ${styles.success}`}>
        <strong>Instalación completada y bloqueada.</strong>
        <p>El creador de superusuario ya no puede volver a ejecutarse.</p>
        <a className={styles.link} href="/admin">Entrar al administrador</a>
      </section>
    )
  }

  return (
    <>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.label}>
          Clave de instalación
          <input
            className={styles.input}
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            minLength={32}
            required
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            required
          />
          <span>
            Confirmo que deseo crear las tablas, verificar servicios y registrar el superusuario configurado en Vercel.
          </span>
        </label>
        <button className={styles.button} type="submit" disabled={loading || !confirmed}>
          {loading ? 'Verificando e instalando…' : 'Instalar y blindar FabrickBuild'}
        </button>
      </form>

      {result && !result.ok && (
        <div className={`${styles.notice} ${styles.error}`}>
          <strong>La instalación no se completó.</strong>
          <p>{result.error || 'Revisa la configuración e inténtalo nuevamente.'}</p>
        </div>
      )}

      {result?.ok && result.checks && (
        <div className={`${styles.notice} ${styles.success}`}>
          <strong>FabrickBuild quedó instalado.</strong>
          <ul className={styles.list}>
            <li><span>PostgreSQL</span><b>{result.checks.database ? 'Verificado' : 'Error'}</b></li>
            <li><span>Tablas Payload</span><b>{result.checks.schema ? 'Verificadas' : 'Error'}</b></li>
            <li><span>Superusuario</span><b>{result.checks.superAdmin ? 'Verificado' : 'Error'}</b></li>
            <li><span>Inicio de sesión</span><b>{result.checks.authentication ? 'Verificado' : 'Error'}</b></li>
            <li><span>Contenido inicial</span><b>{result.checks.seed ? 'Verificado' : 'Error'}</b></li>
            <li><span>Vercel Blob</span><b>{result.checks.blob ? 'Conectado' : 'Error'}</b></li>
          </ul>
          <a className={styles.link} href="/admin">Entrar al administrador</a>
        </div>
      )}
    </>
  )
}
