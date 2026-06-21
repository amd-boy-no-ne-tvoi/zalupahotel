import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireRole, authenticate } from '../middleware/auth.js'

const SELECT_USER = { id: true, email: true, name: true, phone: true, role: true, createdAt: true } as const

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'employee', 'owner']),
  phone: z.string().optional(),
})

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['admin', 'employee', 'owner']).optional(),
  phone: z.string().optional(),
})

export default async function usersRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireRole('admin') }, async () => {
    return prisma.user.findMany({
      select: SELECT_USER,
      orderBy: { createdAt: 'desc' },
    })
  })

  app.post('/', { preHandler: requireRole('admin') }, async (request, reply) => {
    const body = createUserSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() })

    const existing = await prisma.user.findUnique({ where: { email: body.data.email } })
    if (existing) return reply.status(409).send({ error: 'Email already in use' })

    const passwordHash = await bcrypt.hash(body.data.password, 12)
    const user = await prisma.user.create({
      data: { email: body.data.email, passwordHash, name: body.data.name, role: body.data.role, phone: body.data.phone ?? null },
      select: SELECT_USER,
    })
    return reply.status(201).send(user)
  })

  app.get('/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await prisma.user.findUnique({ where: { id }, select: SELECT_USER })
    if (!user) return reply.status(404).send({ error: 'Not found' })
    return user
  })

  app.patch('/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateUserSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() })

    const data: Record<string, unknown> = {}
    if (body.data.name !== undefined) data.name = body.data.name
    if (body.data.email !== undefined) data.email = body.data.email
    if (body.data.role !== undefined) data.role = body.data.role
    if (body.data.phone !== undefined) data.phone = body.data.phone || null
    if (body.data.password) data.passwordHash = await bcrypt.hash(body.data.password, 12)

    const user = await prisma.user.update({
      where: { id }, data, select: SELECT_USER,
    }).catch(() => null)
    if (!user) return reply.status(404).send({ error: 'Not found' })
    return user
  })

  app.delete('/:id', { preHandler: requireRole('admin') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    if (id === (request as { user?: { sub: string } }).user?.sub) {
      return reply.status(400).send({ error: 'Cannot delete yourself' })
    }
    await prisma.user.delete({ where: { id } }).catch(() => null)
    return { ok: true }
  })

  // Список владельцев — для employee при заселении (включаем phone для WhatsApp)
  app.get('/owners/list', { preHandler: authenticate }, async () => {
    return prisma.user.findMany({
      where: { role: 'owner' },
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { name: 'asc' },
    })
  })

  // Создать владельца — для admin и employee (при inline создании в форме заселения)
  app.post('/owners', { preHandler: requireRole('admin', 'employee') }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
      password: z.string().min(8),
      phone: z.string().optional(),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() })

    const existing = await prisma.user.findUnique({ where: { email: body.data.email } })
    if (existing) return reply.status(409).send({ error: 'Email уже используется' })

    const passwordHash = await bcrypt.hash(body.data.password, 12)
    const user = await prisma.user.create({
      data: { email: body.data.email, passwordHash, name: body.data.name, role: 'owner', phone: body.data.phone ?? null },
      select: { id: true, email: true, name: true, phone: true, role: true },
    })
    return reply.status(201).send(user)
  })
}
