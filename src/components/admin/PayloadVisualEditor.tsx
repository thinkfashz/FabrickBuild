'use client'

import { useField } from '@payloadcms/ui'
import { useCallback, useEffect, useMemo } from 'react'

import type { AppearanceValue } from '@/fields/appearance'
import { portfolioHomeLayout } from '@/lib/home-template'
import { normalizeEditorPage, type EditorBlock, type EditorPage } from '@/lib/visual-editor'
import VisualEditorShell from './VisualEditorShell'

type Props = {
  path?: string
  readOnly?: boolean
}

const isPortfolioLayout = (layout: EditorBlock[]) =>
  layout.some((block) => block?.blockType === 'portfolioShowcase')

export default function PayloadVisualEditor({ path = 'layout', readOnly }: Props) {
  const layoutField = useField<EditorBlock[]>({ path })
  const titleField = useField<string>({ path: 'title' })
  const slugField = useField<string>({ path: 'slug' })
  const pageAppearanceField = useField<AppearanceValue>({ path: 'pageAppearance' })

  const slug = typeof slugField.value === 'string' && slugField.value.trim()
    ? slugField.value.trim()
    : 'home'
  const storedLayout = Array.isArray(layoutField.value) ? layoutField.value : []
  const needsPortfolioSource = slug === 'home' && !isPortfolioLayout(storedLayout)
  const editorLayout = needsPortfolioSource
    ? (portfolioHomeLayout(null) as EditorBlock[])
    : storedLayout

  const page = useMemo(() => normalizeEditorPage({
    title: typeof titleField.value === 'string' ? titleField.value : 'Página sin título',
    slug,
    layout: editorLayout,
    pageAppearance: pageAppearanceField.value && typeof pageAppearanceField.value === 'object'
      ? pageAppearanceField.value
      : {},
  }), [editorLayout, pageAppearanceField.value, slug, titleField.value])

  useEffect(() => {
    if (readOnly) return
    if (!Array.isArray(layoutField.value) || layoutField.value.length === 0 || needsPortfolioSource) {
      layoutField.setValue(page.layout)
    }
    if (!pageAppearanceField.value || typeof pageAppearanceField.value !== 'object') {
      pageAppearanceField.setValue(page.pageAppearance)
    }
  }, [layoutField, needsPortfolioSource, page.layout, page.pageAppearance, pageAppearanceField, readOnly])

  useEffect(() => {
    const redirectAdvancedDesign = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('button,[role="tab"],a')
        : null
      if (!target || !/diseño avanzado/i.test(target.textContent || '')) return

      const editor = document.querySelector<HTMLElement>('[aria-label="Editor visual global de páginas"]')
      if (!editor) return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      editor.scrollIntoView({ behavior: 'smooth', block: 'start' })

      const designButton = Array.from(editor.querySelectorAll<HTMLButtonElement>('button'))
        .find((button) => button.textContent?.trim() === 'Diseño')
      window.setTimeout(() => designButton?.click(), 120)
    }

    document.addEventListener('click', redirectAdvancedDesign, true)
    return () => document.removeEventListener('click', redirectAdvancedDesign, true)
  }, [])

  const handleChange = useCallback((next: EditorPage) => {
    if (readOnly) return
    if (next.title !== titleField.value) titleField.setValue(next.title)
    if (next.slug !== slugField.value) slugField.setValue(next.slug)
    layoutField.setValue(next.layout)
    if (next.pageAppearance !== pageAppearanceField.value) pageAppearanceField.setValue(next.pageAppearance)
  }, [layoutField, pageAppearanceField, readOnly, slugField, titleField])

  return <VisualEditorShell mode="payload" page={page} onChange={handleChange} />
}
