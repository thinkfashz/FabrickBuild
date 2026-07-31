'use client'

import { useEffect, useState } from 'react'

import type { FrameSequence } from '@/lib/appearance'
import { FrameSequenceBackground } from './FrameSequenceBackground'

type Manifest = {
  desktopFrames?: string[]
  mobileFrames?: string[]
  poster?: string | null
}

const baseSequence: FrameSequence = {
  desktopFrames: [],
  mobileFrames: [],
  poster: null,
  trigger: 'scroll',
  fit: 'cover',
  scrub: 0.32,
  pin: true,
  overlayOpacity: 18,
}

export function RuntimeBlobFrameBackground() {
  const [sequence, setSequence] = useState<FrameSequence | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/blob-frame/manifest', {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`)
        return response.json() as Promise<Manifest>
      })
      .then((manifest) => {
        const desktopFrames = Array.isArray(manifest.desktopFrames)
          ? manifest.desktopFrames.filter(Boolean)
          : []
        const mobileFrames = Array.isArray(manifest.mobileFrames)
          ? manifest.mobileFrames.filter(Boolean)
          : []
        if (!desktopFrames.length && !mobileFrames.length) {
          throw new Error('El manifiesto no contiene frames.')
        }
        setSequence({
          ...baseSequence,
          desktopFrames,
          mobileFrames,
          poster: typeof manifest.poster === 'string' ? manifest.poster : null,
        })
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.error('[runtime-blob-frames] No fue posible cargar la secuencia.', error)
      })

    return () => controller.abort()
  }, [])

  return sequence ? <FrameSequenceBackground sequence={sequence} forceScroll /> : null
}
