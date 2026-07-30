import config from '@payload-config'
import { getPayload } from 'payload'
import { ensureRuntimeSchema } from '@/system/runtimeSchema'

// Frontend queries also read Pages. Repair the additive Payload schema before
// the first query so a partially upgraded database cannot silently turn Home
// into an empty fallback while the admin is being repaired.
export const getCMS = async () => {
  const payload = await getPayload({ config })
  await ensureRuntimeSchema(payload)
  return payload
}
