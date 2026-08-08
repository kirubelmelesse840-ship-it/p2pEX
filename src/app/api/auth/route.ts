/**
 * Auth API - signup + get current user
 * POST /api/auth       - signup
 * GET  /api/auth       - get current user
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession, getUserFromToken, getSessionTokenFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name } = body
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }
    const user = await db.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash: hashPassword(password),
        kycVerified: false,
        kycLevel: 0,
        fiatCurrency: 'USD',
      },
    })

    // Create default wallets for new user (start with zero balances)
    const defaultAssets = [
      { symbol: 'BTC',  name: 'Bitcoin' },
      { symbol: 'ETH',  name: 'Ethereum' },
      { symbol: 'USDT', name: 'Tether' },
      { symbol: 'USDC', name: 'USD Coin' },
      { symbol: 'BNB',  name: 'BNB' },
      { symbol: 'SOL',  name: 'Solana' },
      { symbol: 'XRP',  name: 'XRP' },
      { symbol: 'ADA',  name: 'Cardano' },
      { symbol: 'DOGE', name: 'Dogecoin' },
    ]
    for (const a of defaultAssets) {
      await db.wallet.create({
        data: {
          userId: user.id,
          asset: a.symbol,
          assetName: a.name,
          balance: 0,
          available: 0,
          depositAddress: 'T' + Math.random().toString(36).slice(2, 34).toUpperCase(),
        },
      })
    }

    const session = await createSession(user.id, req.headers.get('x-forwarded-for') || undefined, req.headers.get('user-agent') || undefined)

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, kycVerified: user.kycVerified, kycLevel: user.kycLevel, kycStatus: user.kycStatus, fiatCurrency: user.fiatCurrency, isAdmin: user.isAdmin },
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
    console.error('[auth POST]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const token = await getSessionTokenFromRequest(req as unknown as Request)
  const user = await getUserFromToken(token)
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 })
  }
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      kycVerified: user.kycVerified,
      kycLevel: user.kycLevel,
      kycStatus: user.kycStatus,
      fiatCurrency: user.fiatCurrency,
      isAdmin: user.isAdmin,
      isBanned: user.isBanned,
    },
  })
}
