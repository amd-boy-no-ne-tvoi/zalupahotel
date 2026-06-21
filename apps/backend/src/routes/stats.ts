import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'

export default async function statsRoutes(app: FastifyInstance) {
  // Статистика для admin
  app.get('/admin', { preHandler: requireRole('admin') }, async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [
      activeStays,
      totalPets,
      freeCages,
      totalCages,
      reportsToday,
      staysWithoutReportToday,
      recentReports,
    ] = await Promise.all([
      prisma.stay.count({ where: { status: 'active' } }),
      prisma.pet.count(),
      prisma.cage.count({ where: { isOccupied: false } }),
      prisma.cage.count(),
      prisma.report.count({ where: { date: { gte: today, lt: tomorrow } } }),
      // Активные заселения у которых нет отчёта сегодня
      prisma.stay.count({
        where: {
          status: 'active',
          reports: { none: { date: { gte: today, lt: tomorrow } } },
        },
      }),
      prisma.report.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          stay: { include: { pet: true } },
          employee: { select: { name: true } },
        },
      }),
    ])

    return {
      activeStays,
      totalPets,
      freeCages,
      totalCages,
      reportsToday,
      staysWithoutReportToday,
      recentReports,
    }
  })

  // Статистика для employee — только своя нагрузка
  app.get('/employee', { preHandler: authenticate }, async (request) => {
    const { sub } = request.user
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [myStays, reportsToday, pendingToday] = await Promise.all([
      prisma.stay.count({ where: { status: 'active', employeeId: sub } }),
      prisma.report.count({ where: { employeeId: sub, date: { gte: today, lt: tomorrow } } }),
      prisma.stay.count({
        where: {
          status: 'active',
          employeeId: sub,
          reports: { none: { date: { gte: today, lt: tomorrow } } },
        },
      }),
    ])

    return { myStays, reportsToday, pendingToday }
  })

  // GET /stats/occupancy — занятость клеток по дням
  app.get('/occupancy', { preHandler: requireRole('admin') }, async (request) => {
    const days = Number((request.query as { days?: string }).days) || 30
    const result: { date: string; occupied: number; free: number }[] = []
    const totalCages = await prisma.cage.count()

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const nextD = new Date(d)
      nextD.setDate(nextD.getDate() + 1)

      const occupied = await prisma.stay.count({
        where: {
          checkIn: { lt: nextD },
          OR: [{ checkOut: null }, { checkOut: { gte: d } }],
        },
      })
      result.push({
        date: d.toISOString().slice(0, 10),
        occupied: Math.min(occupied, totalCages),
        free: Math.max(0, totalCages - occupied),
      })
    }
    return result
  })

  // GET /stats/period — сводка за диапазон дат
  app.get('/period', { preHandler: requireRole('admin') }, async (request) => {
    const q = request.query as { from?: string; to?: string }
    const from = q.from ? new Date(q.from) : new Date(Date.now() - 30 * 86400000)
    const to = q.to ? new Date(q.to) : new Date()
    to.setHours(23, 59, 59, 999)

    const [stays, reports, totalCages] = await Promise.all([
      prisma.stay.findMany({
        where: { checkIn: { gte: from, lte: to } },
        include: { pet: { select: { name: true, ownerId: true, owner: { select: { name: true } } } } },
      }),
      prisma.report.count({ where: { date: { gte: from, lte: to } } }),
      prisma.cage.count(),
    ])

    // avg duration in nights
    const completed = stays.filter(s => s.checkOut)
    const avgNights = completed.length
      ? completed.reduce((sum, s) => sum + Math.round((s.checkOut!.getTime() - s.checkIn.getTime()) / 86400000), 0) / completed.length
      : 0

    // top owners by stay count
    const ownerMap = new Map<string, { name: string; count: number }>()
    stays.forEach(s => {
      const key = s.pet.ownerId
      const cur = ownerMap.get(key) ?? { name: s.pet.owner.name, count: 0 }
      ownerMap.set(key, { ...cur, count: cur.count + 1 })
    })
    const topOwners = [...ownerMap.values()].sort((a, b) => b.count - a.count).slice(0, 5)

    // unique pets
    const uniquePets = new Set(stays.map(s => s.petId)).size

    return {
      totalStays: stays.length,
      uniquePets,
      avgNights: Math.round(avgNights * 10) / 10,
      totalReports: reports,
      totalCages,
      topOwners,
    }
  })
}
