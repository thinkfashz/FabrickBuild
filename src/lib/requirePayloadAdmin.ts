import config from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

export async function requirePayloadAdmin(returnTo = '/admin/studio') {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()
  const auth = await payload.auth({ headers: requestHeaders })

  if (!auth.user) {
    redirect(`/admin/login?redirect=${encodeURIComponent(returnTo)}`)
  }

  if (auth.user.role !== 'admin') {
    redirect('/admin?studio=forbidden')
  }

  return auth.user
}
