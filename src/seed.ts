import config from '@payload-config'
import { getPayload } from 'payload'
import { seedDatabase } from '@/seed/database'

async function run() {
  const payload = await getPayload({ config })
  const result = await seedDatabase(payload)
  payload.logger.info(result)
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
