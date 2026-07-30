import Link from 'next/link'
import type { ReactNode } from 'react'

export default function LegalLayout({ children }: { children: ReactNode }) {
  return <main className="legal-page"><div className="shell"><Link className="legal-back" href="/">← Volver al inicio</Link>{children}</div></main>
}
