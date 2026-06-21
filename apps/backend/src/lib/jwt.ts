import jwt from 'jsonwebtoken'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m'
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d'

export interface AccessTokenPayload {
  sub: string
  role: string
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions)
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions)
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, REFRESH_SECRET) as { sub: string }
}
