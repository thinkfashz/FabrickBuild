'use client'

import { useField } from '@payloadcms/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { AppearanceValue } from '@/fields/appearance'
import { portfolioHomeLayout } from '@/lib/home-template'
import { normalizeEditorPage, type EditorBlock, type EditorPage } from '@/lib/visual-editor'
import VisualEditorShell from './VisualEditorShell'

type Props = {
  path?: string
  readOnly?: boolean
}

type SessionState = 'checking' | 'ready' | 'expired' | 'error'

const isPortfolioLayout = (layout: EditorBlock[]) =>
  layout.some((block) => block?.blockType === 'portfolioShowcase')

export default function PayloadVisualEditor({ path = 'layout', readOnly }: Props) {
  const layoutField = useField<EditorBlock[]>({ path })
  const titleField = useField<string>({ path: 'title' })
  const slugField = useField<string>({ path: 'slug' })
  const pageAppearanceField = useField<AppearanceValue>({ path: 'pageAppearance' })
  const [sessionState, setSessionState] = useState<SessionState>('checking')
  const [editorEnabled, setEditorEnabled] = useState(false)

  const slug = typeof slugField.value === 'string' && slugField.value.trim()
    ? slugField.value.trim()
    : 'home'
  const storedLayout = Array.isArray(layoutField.value) ? layoutField.value : []
  const needsPortfolioSource = slug === 'home' && !isPortfolioLayout(storedLayout)
  const editorLayout = useMemo(
    () => needsPortfolioSource
      ? (portfolioHomeLayout(null) as EditorBlock[])
      : storedLayout,
    [needsPortfolioSource, storedLayout],
  )

  const page = useMemo(() => normalizeEditorPage({
    title: typeof titleField.value === 'string' ? titleField.value : 'Página sin título',
    slug,
    layout: editorLayout,
    pageAppearance: pageAppearanceField.value && typeof pageAppearanceField.value === 'object'
      ? pageAppearanceField.value
      : {},
  }), [editorLayout, pageAppearanceField.value, slug, titleField.value])

  const checkSession = useCallback(async (showChecking = true) => {
    if (showChecking) setSessionState('checking')

    try {
      const response = await fetch('/api/users/me', {
        cache: 'no-store',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      const result = await response.json().catch(() => null) as { user?: unknown } | null

      if (!response.ok || !result?.user) {
        setSessionState('expired')
        setEditorEnabled(false)
        return false
      }

      setSessionState('ready')
      return true
    } catch {
      setSessionState('error')
      setEditorEnabled(false)
      return false
    }
  }, [])

  useEffect(() => {
    void checkSession(true)

    const interval = window.setInterval(() => {
      void checkSession(false)
    }, 120_000)
    const recheckWhenVisible = () => {
      if (document.visibilityState === 'visible') void checkSession(false)
    }

    document.addEventListener('visibilitychange', recheckWhenVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', recheckWhenVisible)
    }
  }, [checkSession])

  const openLogin = useCallback(() => {
    const redirect = `${window.location.pathname}${window.location.search}`
    window.location.assign(`/admin/login?redirect=${encodeURIComponent(redirect)}`)
  }, [])

  const handleChange = useCallback((next: EditorPage) => {
    if (readOnly || sessionState !== 'ready' || !editorEnabled) return
    if (next.title !== titleField.value) titleField.setValue(next.title)
    if (next.slug !== slugField.value) slugField.setValue(next.slug)
    layoutField.setValue(next.layout)
    if (next.pageAppearance !== pageAppearanceField.value) pageAppearanceField.setValue(next.pageAppearance)
  }, [editorEnabled, layoutField, pageAppearanceField, readOnly, sessionState, slugField, titleField])

  if (sessionState === 'checking') {
    return (
      <section aria-label="Comprobando sesión del editor" style={{ minHeight: 240, display: 'grid', placeItems: 'center', padding: 24, border: '1px solid rgba(244,200,75,.24)', borderRadius: 22, background: '#11110f', color: '#f5f1e9' }}>
        <div style={{ display: 'grid', justifyItems: 'center', gap: 10, textAlign: 'center' }}>
          <span style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid rgba(244,200,75,.2)', borderTopColor: '#f4c84b' }} />
          <strong>Comprobando la sesión de Payload…</strong>
          <small style={{ opacity: .68 }}>No se cargará el canvas hasta confirmar que puedes editar y guardar.</small>
        </div>
      </section>
    )
  }

  if (sessionState === 'expired') {
    return (
      <section aria-label="Sesión de Payload vencida" style={{ minHeight: 260, display: 'grid', placeItems: 'center', padding: 24, border: '1px solid rgba(255,93,93,.35)', borderRadius: 22, background: '#1b0f0f', color: '#fff4f2' }}>
        <div style={{ maxWidth: 560, display: 'grid', justifyItems: 'center', gap: 12, textAlign: 'center' }}>
          <strong style={{ fontSize: 20 }}>Tu sesión administrativa venció o pertenece a otro dominio.</strong>
          <p style={{ margin: 0, lineHeight: 1.55, opacity: .82 }}>Payload detuvo el editor antes de enviar cambios. Inicia sesión en esta misma dirección del preview y vuelve directamente a esta página.</p>
          <button type="button" onClick={openLogin} style={{ minHeight: 46, padding: '0 20px', border: 0, borderRadius: 14, background: '#f4c84b', color: '#17140d', fontWeight: 800, cursor: 'pointer' }}>Iniciar sesión y volver</button>
          <button type="button" onClick={() => void checkSession(true)} style={{ minHeight: 40, padding: '0 16px', border: '1px solid rgba(255,255,255,.2)', borderRadius: 12, background: 'transparent', color: 'inherit', fontWeight: 700, cursor: 'pointer' }}>Ya inicié sesión · comprobar</button>
        </div>
      </section>
    )
  }

  if (sessionState === 'error') {
    return (
      <section aria-label="Error de conexión del editor" style={{ minHeight: 240, display: 'grid', placeItems: 'center', padding: 24, border: '1px solid rgba(244,200,75,.28)', borderRadius: 22, background: '#15130f', color: '#f5f1e9' }}>
        <div style={{ maxWidth: 520, display: 'grid', justifyItems: 'center', gap: 12, textAlign: 'center' }}>
          <strong>No fue posible comprobar la sesión.</strong>
          <small style={{ opacity: .72 }}>El editor permanece detenido para evitar cierres, autosaves fallidos y pérdida de cambios.</small>
          <button type="button" onClick={() => void checkSession(true)} style={{ minHeight: 44, padding: '0 18px', border: 0, borderRadius: 14, background: '#f4c84b', color: '#17140d', fontWeight: 800, cursor: 'pointer' }}>Reintentar conexión</button>
        </div>
      </section>
    )
  }

  if (!editorEnabled) {
    return (
      <section aria-label="Activar editor visual" style={{ minHeight: 280, display: 'grid', placeItems: 'center', padding: 24, border: '1px solid rgba(244,200,75,.24)', borderRadius: 22, background: 'linear-gradient(145deg,#15140f,#0d0f10)', color: '#f5f1e9' }}>
        <div style={{ maxWidth: 620, display: 'grid', justifyItems: 'center', gap: 12, textAlign: 'center' }}>
          <small style={{ letterSpacing: '.14em', color: '#f4c84b', fontWeight: 800 }}>EDITOR GLOBAL · CARGA SEGURA</small>
          <strong style={{ fontSize: 24 }}>{page.title}</strong>
          <p style={{ margin: 0, lineHeight: 1.6, opacity: .78 }}>La sesión está activa. El canvas se mantiene apagado durante el arranque para que Páginas no cargue de golpe el formulario, las imágenes y el preview. Tampoco se modifica ni se guarda la plantilla de Inicio hasta que tú hagas un cambio real.</p>
          <button type="button" onClick={() => setEditorEnabled(true)} style={{ minHeight: 50, padding: '0 22px', border: 0, borderRadius: 15, background: '#f4c84b', color: '#17140d', fontWeight: 900, cursor: 'pointer' }}>Cargar editor visual</button>
          <small style={{ opacity: .58 }}>Ruta pública: {page.slug === 'home' ? '/' : `/${page.slug}`}</small>
        </div>
      </section>
    )
  }

  return <VisualEditorShell mode="payload" page={page} onChange={handleChange} />
}
