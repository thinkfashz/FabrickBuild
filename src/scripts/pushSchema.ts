import config from '@payload-config'
import { getPayload } from 'payload'

async function run() {
  const payload = await getPayload({ config })
  payload.logger.info('Esquema PostgreSQL de FabrickBuild sincronizado.')
  if (typeof payload.db.destroy === 'function') await payload.db.destroy()
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
