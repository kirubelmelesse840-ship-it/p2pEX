/**
 * POST /api/auth/login - login with email + password
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    const user = await db.user.findUnique({ where: { email } })
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    const session = await createSession(user.id, req.headers.get('x-forwarded-for') || undefined, req.headers.get('user-agent') || undefined)
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, kycVerified: user.kycVerified, kycLevel: user.kycLevel, kycStatus: user.kycStatus, fiatCurrency: user.fiatCurrency, isAdmin: user.isAdmin, isBanned: user.isBanned },
      token: session.token,
    })
    response.cookies.set('session_token', session.token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return response
  } catch (e: any) {
    console.error('[login]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
