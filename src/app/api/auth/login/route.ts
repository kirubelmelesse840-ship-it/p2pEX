/**
 * POST /api/auth/login - login with email + password
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession } from '@/lib/auth'

// Prevent static generation — this route must run as a serverless function
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 26

export async function POST(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    try {
      const body = await req.json().catch(() => ({}))
      let { email, password } = body
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
      }
      // Normalize email — case-insensitive login (signup also normalizes to lowercase)
      email = String(email).toLowerCase().trim()
      const user = await db.user.findUnique({ where: { email } })
      if (!user || !user.isActive) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }
      if (!verifyPassword(password, user.passwordHash)) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }
      const session = await createSession(user.id, req.headers.get('x-forwarded-for') || undefined, req.headers.get('user-agent') || undefined)
      const response = NextResponse.json({
        user: { id: user.id, userId: user.userId, email: user.email, name: user.name, username: user.username, kycVerified: user.kycVerified, kycLevel: user.kycLevel, kycStatus: user.kycStatus, fiatCurrency: user.fiatCurrency, isAdmin: user.isAdmin, isBanned: user.isBanned },
        token: session.token,
      })
      response.cookies.set('session_token', session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      })
      return response
    } catch (e: any) {
      console.error('[login]', e)
      return NextResponse.json(
        { error: e.message || 'Internal error', stack: process.env.NODE_ENV === 'production' ? undefined : e.stack },
        { status: 500 }
      )
    }

  } catch (e: any) {
    console.error('[user route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
