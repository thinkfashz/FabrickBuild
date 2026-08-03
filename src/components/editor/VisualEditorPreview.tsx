'use client'

import { useEffect, useState } from 'react'

type EditorMessage = {
  type?: string
  page?: { slug?: string }
}

export default function VisualEditorPreview() {
  const [message, setMessage] = useState('Abriendo la página real…')

  useEffect(() => {
    let redirected = false

    const openRealPreview = (slugValue?: string) => {
      if (redirected) return
      const slug = typeof slugValue === 'string' && slugValue.trim() ? slugValue.trim() : 'home'
      redirected = true
      setMessage(`Cargando /${slug === 'home' ? '' : slug}`)
      window.location.replace(`/preview-page/${encodeURIComponent(slug)}?visualEditor=1`)
    }

    const onMessage = (event: MessageEvent<EditorMessage>) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'fabrick-editor:update') return
      openRealPreview(event.data.page?.slug)
    }

    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'fabrick-editor:ready' }, window.location.origin)

    const fallbackTimer = window.setTimeout(() => openRealPreview('home'), 5000)
    return () => {
      window.clearTimeout(fallbackTimer)
      window.removeEventListener('message', onMessage)
    }
  }, [])

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, color: '#f4f5f2', background: '#080b0c' }}>
      <div style={{ display: 'grid', justifyItems: 'center', gap: 10, textAlign: 'center' }}>
        <span style={{ width: 38, height: 38, borderRadius: '50%', border: '3px solid rgba(244,200,75,.24)', borderTopColor: '#f4c84b' }} />
        <strong>{message}</strong>
        <small style={{ opacity: .6 }}>Usando el mismo render que ve el usuario final.</small>
      </div>
    </main>
  )
}
