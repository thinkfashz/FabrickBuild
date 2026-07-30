import type { CSSProperties } from 'react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { RichText as LexicalRichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'

import { textStateConfig } from '@/fields/textStateConfig'

const hyphenToCamel = (value: string) => value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  text: (args) => {
    const base = typeof defaultConverters.text === 'function' ? defaultConverters.text(args) : args.node.text
    const state = (args.node as unknown as { $?: Record<string, string> }).$
    if (!state) return base
    const style: CSSProperties = {}
    for (const [key, value] of Object.entries(state)) {
      const css = (textStateConfig as unknown as Record<string, Record<string, { css: Record<string, string> }>>)[key]?.[value]?.css
      if (!css) continue
      Object.entries(css).forEach(([property, cssValue]) => { (style as Record<string, string>)[hyphenToCamel(property)] = cssValue })
    }
    return Object.keys(style).length ? <span style={style}>{base}</span> : base
  },
})

export function RichText({ data }: { data?: SerializedEditorState | null }) {
  if (!data) return null
  return <LexicalRichText data={data} converters={converters} className="richtext" />
}
