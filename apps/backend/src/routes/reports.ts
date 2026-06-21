import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { notifyOwnerReportReady } from '../lib/push.js'

const metricSchema = z.object({
  category: z.enum(['appetite', 'water', 'toilet', 'activity', 'mood', 'contact']),
  value: z.string().min(1),
  comment: z.string().max(500).optional(),
})

const activitySchema = z.object({
  activityType: z.string().min(1),
  completed: z.boolean(),
})

const observationSchema = z.object({
  observation: z.string().min(1).max(500),
  action: z.string().max(500).optional(),
  notifyOwner: z.boolean(),
})

const createSchema = z.object({
  stayId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayStatus: z.enum(['adaptation', 'calm', 'active', 'needs_control']),
  metrics: z.array(metricSchema),
  activities: z.array(activitySchema),
  observations: z.array(observationSchema),
  photoUrls: z.array(z.string()).optional(),
  ownerText: z.string().max(2000).optional(),
})

const include = {
  employee: { select: { id: true, name: true } },
  stay: {
    include: {
      pet: { include: { owner: { select: { id: true, name: true } } } },
      cage: true,
    },
  },
  metrics: true,
  activities: true,
  observations: true,
}

export default async function reportsRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (request) => {
    const { role, sub } = request.user
    const q = request.query as { stayId?: string; petId?: string }

    const where: Record<string, unknown> = {}
    if (q.stayId) where.stayId = q.stayId
    if (role === 'employee') where.employeeId = sub
    if (role === 'owner') {
      where.stay = { pet: { ownerId: sub } }
    }

    return prisma.report.findMany({
      where,
      include,
      orderBy: { date: 'desc' },
    })
  })

  app.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const report = await prisma.report.findUnique({ where: { id }, include })
    if (!report) return reply.status(404).send({ error: 'Not found' })

    const { role, sub } = request.user
    if (role === 'owner' && report.stay.pet.ownerId !== sub) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    return report
  })

  app.post('/', { preHandler: requireRole('admin', 'employee') }, async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() })
    }

    const stay = await prisma.stay.findUnique({ where: { id: body.data.stayId } })
    if (!stay) return reply.status(404).send({ error: 'Stay not found' })
    if (stay.status !== 'active') return reply.status(400).send({ error: 'Stay is not active' })

    const { stayId, date, dayStatus, metrics, activities, observations, photoUrls, ownerText } = body.data

    const report = await prisma.report.create({
      data: {
        stayId,
        employeeId: request.user.sub,
        date: new Date(date),
        dayStatus,
        photoUrls: photoUrls ?? [],
        ownerText: ownerText ?? null,
        metrics: { create: metrics },
        activities: { create: activities },
        observations: { create: observations },
      },
      include,
    })

    // Push notification to owner (fire-and-forget, don't block response)
    const ownerId = report.stay.pet.owner.id
    notifyOwnerReportReady(ownerId, report.stay.pet.name, date).catch(() => {})

    return reply.status(201).send(report)
  })

  app.patch('/:id', { preHandler: requireRole('admin', 'employee') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createSchema.partial().safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() })
    }

    const existing = await prisma.report.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Not found' })

    const { metrics, activities, observations, ...scalar } = body.data

    await prisma.$transaction(async (tx) => {
      if (metrics) {
        await tx.reportMetric.deleteMany({ where: { reportId: id } })
        await tx.reportMetric.createMany({ data: metrics.map((m) => ({ ...m, reportId: id })) })
      }
      if (activities) {
        await tx.reportActivity.deleteMany({ where: { reportId: id } })
        await tx.reportActivity.createMany({ data: activities.map((a) => ({ ...a, reportId: id })) })
      }
      if (observations) {
        await tx.reportObservation.deleteMany({ where: { reportId: id } })
        await tx.reportObservation.createMany({ data: observations.map((o) => ({ ...o, reportId: id })) })
      }
      if (Object.keys(scalar).length) {
        await tx.report.update({ where: { id }, data: scalar })
      }
    })

    return prisma.report.findUnique({ where: { id }, include })
  })
}
