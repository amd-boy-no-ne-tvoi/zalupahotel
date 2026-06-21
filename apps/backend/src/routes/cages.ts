import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const createSchema = z.object({
  number: z.string().min(1).max(20),
  zone: z.string().min(1).max(50),
  type: z.enum(['dog', 'cat', 'other']),
})

const updateSchema = createSchema.partial()

export default async function cagesRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (request) => {
    const { type, free } = request.query as { type?: string; free?: string }
    return prisma.cage.findMany({
      where: {
        ...(type ? { type: type as 'dog' | 'cat' | 'other' } : {}),
        ...(free === 'true' ? { isOccupied: false } : {}),
      },
      orderBy: [{ zone: 'asc' }, { number: 'asc' }],
    })
  })

  app.post('/', { preHandler: requireRole('admin') }, async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() })

    const existing = await prisma.cage.findUnique({ where: { number: body.data.number } })
    if (existing) return reply.status(409).send({ error: 'Cage number already exists' })

    const cage = await prisma.cage.create({ data: body.data })
    return reply.status(201).send(cage)
  })

  app.patch('/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() })

    const cage = await prisma.cage.update({ where: { id }, data: body.data }).catch(() => null)
    if (!cage) return reply.status(404).send({ error: 'Not found' })
    return cage
  })

  app.delete('/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const cage = await prisma.cage.findUnique({ where: { id } })
    if (!cage) return reply.status(404).send({ error: 'Not found' })
    if (cage.isOccupied) return reply.status(400).send({ error: 'Cannot delete occupied cage' })
    await prisma.cage.delete({ where: { id } })
    return { ok: true }
  })
}
