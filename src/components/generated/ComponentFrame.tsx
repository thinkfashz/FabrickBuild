import type { ReactNode } from 'react'

type Props = {
  anchor?: null | string
  background?: null | string
  componentSlug: string
  spacing?: null | string
  styles?: null | string
  children: ReactNode
}

export function ComponentFrame({
  anchor,
  background = 'inherit',
  componentSlug,
  spacing = 'normal',
  styles,
  children,
}: Props) {
  const safeAnchor = anchor?.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || undefined
  return (
    <section
      id={safeAnchor}
      className={`generated-component generated-component-${background} generated-component-spacing-${spacing}`}
      data-component={componentSlug}
    >
      {styles ? <style data-generated-component-style dangerouslySetInnerHTML={{ __html: styles }} /> : null}
      {children}
    </section>
  )
}
