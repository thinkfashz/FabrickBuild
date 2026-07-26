import type { Endpoint } from 'payload'
import { seedDatabase } from '@/seed/database'

export const seedEndpoint: Endpoint = {
  path: '/seed',
  method: 'post',
  handler: async (req) => {
    const expected = process.env.SEED_SECRET
    const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

    if (!expected || provided !== expected) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    const result = await seedDatabase(req.payload)
    return Response.json(result)
  }
}
