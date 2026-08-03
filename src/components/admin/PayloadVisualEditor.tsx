'use client'

import { useField } from '@payloadcms/ui'
import { useCallback, useEffect, useMemo } from 'react'

import type { AppearanceValue } from '@/fields/appearance'
import { normalizeEditorPage, type EditorBlock, type EditorPage } from '@/lib/visual-editor'
import VisualEditorShell from './VisualEditorShell'

type Props = {
  path?: string
  readOnly?: boolean
}

export default function PayloadVisualEditor({ path = 'layout', readOnly }: Props) {
  const layoutField = useField<EditorBlock[]>({ path })
  const titleField = useField<string>({ path: 'title' })
  const slugField = useField<string>({ path: 'slug' })
  const pageAppearanceField = useField<AppearanceValue>({ path: 'pageAppearance' })

  const page = useMemo(() => normalizeEditorPage({
    title: typeof titleField.value === 'string' ? titleField.value : 'Página sin título',
    slug: typeof slugField.value === 'string' ? slugField.value : 'home',
    layout: Array.isArray(layoutField.value) ? layoutField.value : [],
    pageAppearance: pageAppearanceField.value && typeof pageAppearanceField.value === 'object'
      ? pageAppearanceField.value
      : {},
  }), [layoutField.value, pageAppearanceField.value, slugField.value, titleField.value])

  useEffect(() => {
    if (readOnly) return
    if (!Array.isArray(layoutField.value) || layoutField.value.length === 0) {
      layoutField.setValue(page.layout)
    }
    if (!pageAppearanceField.value || typeof pageAppearanceField.value !== 'object') {
      pageAppearanceField.setValue(page.pageAppearance)
    }
  }, [layoutField, page, pageAppearanceField, readOnly])

  const handleChange = useCallback((next: EditorPage) => {
    if (readOnly) return
    if (next.title !== titleField.value) titleField.setValue(next.title)
    if (next.slug !== slugField.value) slugField.setValue(next.slug)
    layoutField.setValue(next.layout)
    if (next.pageAppearance !== pageAppearanceField.value) pageAppearanceField.setValue(next.pageAppearance)
  }, [layoutField, pageAppearanceField, readOnly, slugField, titleField])

  return <VisualEditorShell mode="payload" page={page} onChange={handleChange} />
}
