'use client'

import { useEffect, useState } from 'react'

import VisualEditorShell from '@/components/admin/VisualEditorShell'
import {
  blockStorageKey,
  cloneEditorValue,
  fallbackEditorPage,
  normalizeEditorPage,
  type EditorPage,
} from '@/lib/visual-editor'

export default function OfflineVisualEditor() {
  const [page, setPage] = useState<EditorPage>(() => cloneEditorValue(fallbackEditorPage))
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(blockStorageKey('home'))
      if (raw) setPage(normalizeEditorPage(JSON.parse(raw)))
    } catch {
      setPage(cloneEditorValue(fallbackEditorPage))
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const timer = window.setTimeout(() => {
      localStorage.setItem(blockStorageKey(page.slug), JSON.stringify(page))
    }, 450)
    return () => window.clearTimeout(timer)
  }, [hydrated, page])

  return <VisualEditorShell mode="local" page={page} onChange={setPage} />
}
