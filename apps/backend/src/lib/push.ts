import webpush from 'web-push'
import prisma from './prisma.js'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? 'mailto:admin@pethotel.ru',
  process.env.VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY ?? '',
)

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

async function sendToUser(userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  const json = JSON.stringify({ ...payload, icon: payload.icon ?? '/icon-192.png' })

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        json,
      ).catch(async (err: { statusCode?: number }) => {
        // 410 Gone — subscription expired, remove it
        if (err.statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: s.endpoint } })
        }
        throw err
      }),
    ),
  )

  return results
}

export async function notifyOwnerReportReady(ownerId: string, petName: string, date: string) {
  const d = new Date(date).toLocaleDateString('ru', { day: 'numeric', month: 'long' })
  return sendToUser(ownerId, {
    title: '🐾 Готов отчёт о питомце',
    body: `${petName} · ${d}`,
    url: '/owner/reports',
  })
}

export async function notifyEmployeesPendingReports() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Find active stays that have no report today
  const staysWithoutReport = await prisma.stay.findMany({
    where: {
      status: 'active',
      reports: { none: { date: { gte: today, lt: tomorrow } } },
    },
    include: { employee: true },
  })

  if (staysWithoutReport.length === 0) return

  // Group by employee
  const byEmployee: Record<string, { name: string; count: number }> = {}
  for (const stay of staysWithoutReport) {
    const id = stay.employeeId
    if (!byEmployee[id]) byEmployee[id] = { name: stay.employee.name, count: 0 }
    byEmployee[id].count++
  }

  await Promise.allSettled(
    Object.entries(byEmployee).map(([employeeId, { count }]) =>
      sendToUser(employeeId, {
        title: '⏰ Пора заполнить отчёты',
        body: `${count} ${count === 1 ? 'питомец ждёт' : count < 5 ? 'питомца ждут' : 'питомцев ждут'} отчёт сегодня`,
        url: '/employee/stays',
      }),
    ),
  )
}
