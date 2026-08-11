/**
 * POST /api/auth/logout - clear session
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionTokenFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = await getSessionTokenFromRequest(req as unknown as Request)
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {})
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('session_token')
  return response
}
