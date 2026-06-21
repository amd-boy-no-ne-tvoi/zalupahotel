import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  species: z.string().min(1).max(50),
  breed: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  ownerId: z.string().uuid(),
})

const updateSchema = createSchema.partial()

export default async function petsRoutes(app: FastifyInstance) {
  // Все питомцы — admin и employee
  app.get('/', { preHandler: requireRole('admin', 'employee') }, async (request) => {
    const { ownerId } = request.query as { ownerId?: string }
    return prisma.pet.findMany({
      where: ownerId ? { ownerId } : undefined,
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { name: 'asc' },
    })
  })

  // Питомцы владельца — только свои
  app.get('/my', { preHandler: authenticate }, async (request) => {
    return prisma.pet.findMany({
      where: { ownerId: request.user.sub },
      orderBy: { name: 'asc' },
    })
  })

  app.post('/', { preHandler: requireRole('admin', 'employee') }, async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() })

    const owner = await prisma.user.findUnique({ where: { id: body.data.ownerId } })
    if (!owner || owner.role !== 'owner') return reply.status(400).send({ error: 'Owner not found' })

    const pet = await prisma.pet.create({
      data: body.data,
      include: { owner: { select: { id: true, name: true, email: true } } },
    })
    return reply.status(201).send(pet)
  })

  app.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const pet = await prisma.pet.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    })
    if (!pet) return reply.status(404).send({ error: 'Not found' })

    const { role, sub } = request.user
    if (role === 'owner' && pet.ownerId !== sub) return reply.status(403).send({ error: 'Forbidden' })

    return pet
  })

  app.patch('/:id', { preHandler: requireRole('admin', 'employee') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() })

    const pet = await prisma.pet.update({ where: { id }, data: body.data }).catch(() => null)
    if (!pet) return reply.status(404).send({ error: 'Not found' })
    return pet
  })

  app.delete('/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.pet.delete({ where: { id } }).catch(() => null)
    return { ok: true }
  })
}
