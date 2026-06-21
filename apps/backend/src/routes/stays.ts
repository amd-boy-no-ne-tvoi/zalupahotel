import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const createSchema = z.object({
  petId: z.string().uuid(),
  cageId: z.string().uuid(),
  employeeId: z.string().uuid(),
  checkIn: z.string().datetime(),
  plannedCheckOut: z.string().datetime().optional(),
})

const include = {
  pet: { include: { owner: { select: { id: true, name: true, email: true, phone: true } } } },
  cage: true,
  reports: {
    take: 1,
    orderBy: { date: 'desc' as const },
    select: { dayStatus: true, date: true },
  },
  employee: { select: { id: true, name: true } },
}

const includeWithPlannedCheckOut = {
  ...include,
}

export default async function staysRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (request) => {
    const { role, sub } = request.user
    const { status } = request.query as { status?: string }

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (role === 'owner') where.pet = { ownerId: sub }
    // employee видит только свои заселения; admin видит все
    if (role === 'employee') where.employeeId = sub

    return prisma.stay.findMany({
      where,
      include: includeWithPlannedCheckOut,
      orderBy: { checkIn: 'desc' },
    })
  })

  app.post('/', { preHandler: requireRole('admin', 'employee') }, async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() })

    const cage = await prisma.cage.findUnique({ where: { id: body.data.cageId } })
    if (!cage) return reply.status(404).send({ error: 'Cage not found' })
    if (cage.isOccupied) return reply.status(400).send({ error: 'Cage is already occupied' })

    const activeStay = await prisma.stay.findFirst({
      where: { petId: body.data.petId, status: 'active' },
    })
    if (activeStay) return reply.status(400).send({ error: 'Pet already has an active stay' })

    const [stay] = await prisma.$transaction([
      prisma.stay.create({
        data: {
          petId: body.data.petId,
          cageId: body.data.cageId,
          employeeId: body.data.employeeId,
          checkIn: body.data.checkIn,
          plannedCheckOut: body.data.plannedCheckOut ?? null,
        },
        include: includeWithPlannedCheckOut,
      }),
      prisma.cage.update({ where: { id: body.data.cageId }, data: { isOccupied: true } }),
    ])
    return reply.status(201).send(stay)
  })

  app.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const stay = await prisma.stay.findUnique({ where: { id }, include: includeWithPlannedCheckOut })
    if (!stay) return reply.status(404).send({ error: 'Not found' })

    const { role, sub } = request.user
    if (role === 'owner' && stay.pet.ownerId !== sub) return reply.status(403).send({ error: 'Forbidden' })

    return stay
  })

  // Выезд питомца
  app.post('/:id/checkout', { preHandler: requireRole('admin', 'employee') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const stay = await prisma.stay.findUnique({ where: { id } })
    if (!stay) return reply.status(404).send({ error: 'Not found' })
    if (stay.status === 'completed') return reply.status(400).send({ error: 'Stay already completed' })

    const [updated] = await prisma.$transaction([
      prisma.stay.update({
        where: { id },
        data: { status: 'completed', checkOut: new Date() },
        include: includeWithPlannedCheckOut,
      }),
      prisma.cage.update({ where: { id: stay.cageId }, data: { isOccupied: false } }),
    ])
    return updated
  })

  // GET /stays/:id/notes
  app.get('/:id/notes', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const notes = await prisma.stayNote.findMany({
      where: { stayId: id },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return notes
  })

  // POST /stays/:id/notes
  app.post('/:id/notes', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({ content: z.string().min(1).max(500) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input' })
    const note = await prisma.stayNote.create({
      data: { stayId: id, authorId: request.user.sub, content: body.data.content },
      include: { author: { select: { id: true, name: true, role: true } } },
    })
    return reply.status(201).send(note)
  })

  // DELETE /stays/:id/notes/:noteId
  app.delete('/:id/notes/:noteId', { preHandler: authenticate }, async (request, reply) => {
    const { noteId } = request.params as { id: string; noteId: string }
    await prisma.stayNote.delete({ where: { id: noteId } }).catch(() => null)
    return { ok: true }
  })
}
