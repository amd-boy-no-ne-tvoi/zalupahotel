import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken, AccessTokenPayload } from '../lib/jwt.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: AccessTokenPayload
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
  const token = authHeader.slice(7)
  try {
    request.user = verifyAccessToken(token)
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
}

export function requireRole(...roles: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply)
    if (reply.sent) return
    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' })
    }
  }
}
