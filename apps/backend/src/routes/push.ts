import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
})

export default async function pushRoutes(app: FastifyInstance) {
  // Save or update subscription for the current user
  app.post('/subscribe', { preHandler: authenticate }, async (request, reply) => {
    const body = subscribeSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid subscription' })

    const { endpoint, keys } = body.data
    const userId = request.user.sub

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId },
      create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId },
    })

    return { ok: true }
  })

  // Remove subscription (unsubscribe)
  app.delete('/subscribe', { preHandler: authenticate }, async (request, reply) => {
    const body = z.object({ endpoint: z.string() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid' })

    await prisma.pushSubscription.deleteMany({
      where: { endpoint: body.data.endpoint, userId: request.user.sub },
    })

    return { ok: true }
  })

  // Return the server's VAPID public key so frontend can subscribe
  app.get('/vapid-public-key', async () => ({
    key: process.env.VAPID_PUBLIC_KEY ?? '',
  }))

  // Check if current user has an active subscription
  app.get('/status', { preHandler: authenticate }, async (request) => {
    const count = await prisma.pushSubscription.count({
      where: { userId: request.user.sub },
    })
    return { subscribed: count > 0 }
  })
}
