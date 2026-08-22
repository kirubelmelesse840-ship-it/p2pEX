/**
 * POST /api/auth/logout - clear session
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionTokenFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const token = await getSessionTokenFromRequest(req as unknown as Request)
    if (token) {
      await db.session.deleteMany({ where: { token } }).catch(() => {})
    }
    const response = NextResponse.json({ ok: true })
    response.cookies.delete('session_token')
    return response
  } catch (e: any) {
    console.error('[logout]', e)
    // Even on error, clear the cookie so the user is logged out client-side
    const response = NextResponse.json({ ok: true })
    response.cookies.delete('session_token')
    return response
  }
}
