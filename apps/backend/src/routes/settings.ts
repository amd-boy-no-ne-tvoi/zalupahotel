import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireRole } from '../middleware/auth.js'

const DEFAULT_WHATSAPP_TEMPLATE = `Здравствуйте! 🐾

Ежедневный отчёт о питомце *{petName}* за {date} готов.
{warningLine}
Посмотрите его в личном кабинете:
{url}

С уважением, команда Pet Hotel 🏨`

export const SETTING_KEYS = {
  WHATSAPP_TEMPLATE: 'whatsapp_template',
} as const

export { DEFAULT_WHATSAPP_TEMPLATE }

export default async function settingsRoutes(app: FastifyInstance) {
  // GET /settings/:key — доступно всем аутентифицированным
  app.get('/:key', { preHandler: requireRole('admin', 'employee', 'owner') }, async (request, reply) => {
    const { key } = request.params as { key: string }
    const setting = await prisma.setting.findUnique({ where: { key } })
    if (!setting) {
      // Вернуть дефолтное значение
      if (key === SETTING_KEYS.WHATSAPP_TEMPLATE) {
        return { key, value: DEFAULT_WHATSAPP_TEMPLATE }
      }
      return reply.status(404).send({ error: 'Setting not found' })
    }
    return setting
  })

  // PATCH /settings/:key — только admin
  app.patch('/:key', { preHandler: requireRole('admin') }, async (request, reply) => {
    const { key } = request.params as { key: string }
    const body = z.object({ value: z.string() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input' })

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: body.data.value },
      create: { key, value: body.data.value },
    })
    return setting
  })

  // DELETE /settings/:key — сброс к дефолту
  app.delete('/:key', { preHandler: requireRole('admin') }, async (request, reply) => {
    const { key } = request.params as { key: string }
    await prisma.setting.delete({ where: { key } }).catch(() => null)
    if (key === SETTING_KEYS.WHATSAPP_TEMPLATE) {
      return { key, value: DEFAULT_WHATSAPP_TEMPLATE }
    }
    return { ok: true }
  })
}
