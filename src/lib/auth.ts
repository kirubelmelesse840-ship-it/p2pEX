/**
 * Simple session-based authentication for the exchange.
 *
 * In production this would use NextAuth, JWT, OAuth, etc.
 * For this demo we use a simple email + password with bcrypt-style hashing
 * and a session token stored in the Session table.
 */

import { db } from '@/lib/db'
import crypto from 'crypto'

// Simple hash (NOT for production - use bcrypt/argon2 in real apps)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  const verify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return hash === verify
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createSession(userId: string, ip?: string, ua?: string) {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days
  const session = await db.session.create({
    data: { userId, token, expiresAt, ipAddress: ip, userAgent: ua },
  })
  return session
}

export async function getUserFromToken(token: string | undefined | null) {
  if (!token) return null
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  return session.user
}

export async function getSessionTokenFromRequest(req: Request): Promise<string | null> {
  // Check Authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  // Check cookies
  const cookieHeader = req.headers.get('cookie') || ''
  for (const c of cookieHeader.split(';')) {
    const [k, v] = c.trim().split('=')
    if (k === 'session_token' && v) return v
  }
  return null
}

export async function getCurrentUser(req: Request) {
  const token = await getSessionTokenFromRequest(req)
  return await getUserFromToken(token)
}

/**
 * Require an authenticated admin user. Returns { user, error }.
 * Use in admin API routes: const { user, error } = await requireAdmin(req)
 * if (error) return NextResponse.json({ error }, { status: 403 })
 */
export async function requireAdmin(req: Request) {
  const user = await getCurrentUser(req)
  if (!user) return { user: null, error: 'Not authenticated', status: 401 }
  if (!user.isAdmin) return { user: null, error: 'Admin access required', status: 403 }
  if (user.isBanned) return { user: null, error: 'Account banned', status: 403 }
  return { user, error: null, status: 200 }
}

/**
 * Get a system setting value by key (with default).
 */
export async function getSetting(key: string, defaultValue = ''): Promise<string> {
  const s = await db.setting.findUnique({ where: { key } })
  return s?.value ?? defaultValue
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await db.setting.findMany({ where: { key: { in: keys } } })
  const out: Record<string, string> = {}
  for (const k of keys) out[k] = rows.find(r => r.key === k)?.value ?? ''
  return out
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}
