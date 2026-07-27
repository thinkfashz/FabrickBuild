'use client'

import { RefreshRouteOnSave as PayloadRefresh } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'

export function RefreshRouteOnSave() {
  const router = useRouter()
  return (
    <PayloadRefresh
      refresh={router.refresh}
      serverURL={process.env.NEXT_PUBLIC_SERVER_URL || (typeof window !== 'undefined' ? window.location.origin : '')}
    />
  )
}
