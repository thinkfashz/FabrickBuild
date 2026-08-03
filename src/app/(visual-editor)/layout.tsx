import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import '../(frontend)/globals.css'
import '../(frontend)/generated.css'
import '../(frontend)/audio-controls.css'
import '../(frontend)/experience-enhancements.css'
import '../(frontend)/digital-brand.css'
import '../(frontend)/motion-system.css'
import '../(frontend)/mobile-refinement.css'
import '../(frontend)/home-cinematic-continuum.css'
import '../(frontend)/experience-polish.css'
import '../(frontend)/final-overrides.css'
import '../(frontend)/editorial-cinematic.css'
import './visual-editor-root.css'

export const metadata: Metadata = {
  title: 'Editor visual FabrickBuild',
  robots: { index: false, follow: false },
}

export default function VisualEditorRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="digital-site visual-editor-root">{children}</body>
    </html>
  )
}
