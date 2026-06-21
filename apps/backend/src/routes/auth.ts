import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js'
import { authenticate } from '../middleware/auth.js'

const REFRESH_COOKIE = 'refresh_token'
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  role: z.enum(['employee', 'owner']),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8).optional(),
}).refine(
  (d) => !(d.newPassword && !d.currentPassword),
  { message: 'currentPassword required when setting newPassword', path: ['currentPassword'] }
)

export default async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() })
    }
    const { email, password, name, role } = body.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({ error: 'Email already in use' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role },
      select: { id: true, email: true, name: true, role: true },
    })

    return reply.status(201).send({ user })
  })

  app.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid input' })
    }
    const { email, password } = body.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role })
    const refreshToken = signRefreshToken(user.id)
    const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE)

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    })

    reply.setCookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: COOKIE_MAX_AGE / 1000,
    })

    return { accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } }
  })

  app.post('/refresh', async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE]
    if (!token) {
      return reply.status(401).send({ error: 'No refresh token' })
    }

    let payload: { sub: string }
    try {
      payload = verifyRefreshToken(token)
    } catch {
      return reply.status(401).send({ error: 'Invalid refresh token' })
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token } })
    if (!stored || stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'Refresh token expired or revoked' })
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) {
      return reply.status(401).send({ error: 'User not found' })
    }

    await prisma.refreshToken.deleteMany({ where: { token } })

    const newRefreshToken = signRefreshToken(user.id)
    const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE)
    await prisma.refreshToken.create({
      data: { token: newRefreshToken, userId: user.id, expiresAt },
    })

    reply.setCookie(REFRESH_COOKIE, newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: COOKIE_MAX_AGE / 1000,
    })

    const accessToken = signAccessToken({ sub: user.id, role: user.role })
    return { accessToken }
  })

  app.post('/logout', { preHandler: authenticate }, async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE]
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } })
    }
    reply.clearCookie(REFRESH_COOKIE, { path: '/auth/refresh' })
    return { ok: true }
  })

  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { id: true, email: true, name: true, phone: true, role: true },
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return { user }
  })

  app.patch('/profile', { preHandler: authenticate }, async (request, reply) => {
    const body = updateProfileSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() })
    }

    const current = await prisma.user.findUnique({ where: { id: request.user.sub } })
    if (!current) return reply.status(404).send({ error: 'User not found' })

    const data: Record<string, unknown> = {}

    if (body.data.name) data.name = body.data.name
    if (body.data.phone !== undefined) data.phone = body.data.phone || null

    if (body.data.email && body.data.email !== current.email) {
      const taken = await prisma.user.findUnique({ where: { email: body.data.email } })
      if (taken) return reply.status(409).send({ error: 'Email already in use' })
      data.email = body.data.email
    }

    if (body.data.newPassword) {
      const valid = await bcrypt.compare(body.data.currentPassword!, current.passwordHash)
      if (!valid) return reply.status(400).send({ error: 'Wrong current password' })
      data.passwordHash = await bcrypt.hash(body.data.newPassword, 12)
    }

    const user = await prisma.user.update({
      where: { id: request.user.sub },
      data,
      select: { id: true, email: true, name: true, phone: true, role: true },
    })
    return { user }
  })
}
