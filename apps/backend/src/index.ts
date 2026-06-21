import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import cron from 'node-cron'
import { join } from 'path'
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import petsRoutes from './routes/pets.js'
import cagesRoutes from './routes/cages.js'
import staysRoutes from './routes/stays.js'
import reportsRoutes from './routes/reports.js'
import statsRoutes from './routes/stats.js'
import uploadsRoutes from './routes/uploads.js'
import pushRoutes from './routes/push.js'
import settingsRoutes from './routes/settings.js'
import { notifyEmployeesPendingReports } from './lib/push.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
})

await app.register(cookie)
await app.register(rateLimit, { global: false })
await app.register(multipart, {
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
})
await app.register(staticFiles, {
  root: join(process.cwd(), 'uploads'),
  prefix: '/uploads/',
})

await app.register(authRoutes, { prefix: '/auth' })
app.addHook('onRoute', (routeOptions) => {
  if (routeOptions.url === '/auth/login' || routeOptions.url === '/auth/register') {
    routeOptions.config = {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({ error: 'Too many requests, try again later' }),
      },
    }
  }
})

await app.register(usersRoutes, { prefix: '/users' })
await app.register(petsRoutes, { prefix: '/pets' })
await app.register(cagesRoutes, { prefix: '/cages' })
await app.register(staysRoutes, { prefix: '/stays' })
await app.register(reportsRoutes, { prefix: '/reports' })
await app.register(statsRoutes, { prefix: '/stats' })
await app.register(uploadsRoutes, { prefix: '/upload' })
await app.register(pushRoutes, { prefix: '/push' })
await app.register(settingsRoutes, { prefix: '/settings' })

app.get('/health', async () => ({ status: 'ok' }))

// Daily reminder at 18:00 — notify employees about pets without a report today
cron.schedule('0 18 * * *', () => {
  notifyEmployeesPendingReports().catch(() => {})
}, { timezone: 'Europe/Moscow' })

const port = Number(process.env.PORT) || 3000
await app.listen({ port, host: '0.0.0.0' })
