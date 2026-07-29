import type { ReactNode } from 'react'

/**
 * Studio used to render a second, blue page builder. Routes are kept only as
 * backwards-compatible aliases for bookmarked links; all editing now happens
 * in Payload's native admin.
 */
export default function StudioLayout({ children }: { children: ReactNode }) {
  return children
}
