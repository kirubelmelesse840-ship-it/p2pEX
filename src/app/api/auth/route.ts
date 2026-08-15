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

    // Validate email format
    const normalizedEmail = email.toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    // Block disposable/fake email domains
    const BLOCKED_DOMAINS = [
      'tempmail', 'guerrillamail', 'mailinator', '10minutemail', 'throwaway',
      'temp-mail', 'fakeinbox', 'getnada', 'maildrop', 'dispostable',
      'sharklasers', 'guerrilla', 'spam4', 'yopmail', 'mintemail',
      'mailnesia', 'trashmail', 'tempinbox', 'fakeemail', 'mailcatch',
      'emailondeck', 'mohmal', 'tempmailo', 'mytemp', 'tempr.email',
    ]
    const domain = normalizedEmail.split('@')[1] || ''
    if (BLOCKED_DOMAINS.some(d => domain.includes(d))) {
      return NextResponse.json({ error: 'Disposable email addresses are not allowed. Please use your real email (Gmail, Outlook, iCloud, etc.)' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }
    // Auto-generate numerical userId and username
    const userCount = await db.user.count()
    const newUserId = String(userCount + 1).padStart(6, '0')
    const baseName = (name || normalizedEmail.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '')
    const newUsername = baseName + Math.floor(Math.random() * 9000 + 1000)

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        userId: newUserId,
        username: newUsername,
        passwordHash: hashPassword(password),
        kycVerified: false,
        kycLevel: 0,
        kycStatus: 'NONE',
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

    // Welcome bonus is now credited ONLY when KYC is approved by admin
    // (see /api/admin/users/action verifyKyc case)

    // Notify admin
    import('@/lib/admin-email-notifications').then(m => { m.notifyAdminUserSignup(user.name, user.email, user.userId) }).catch(() => {})

    const session = await createSession(user.id, req.headers.get('x-forwarded-for') || undefined, req.headers.get('user-agent') || undefined)

    const response = NextResponse.json({
      user: { id: user.id, userId: user.userId, email: user.email, name: user.name, username: user.username, kycVerified: user.kycVerified, kycLevel: user.kycLevel, kycStatus: user.kycStatus, fiatCurrency: user.fiatCurrency, isAdmin: user.isAdmin },
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
      userId: user.userId,
      email: user.email,
      name: user.name,
      username: user.username,
      kycVerified: user.kycVerified,
      kycLevel: user.kycLevel,
      kycStatus: user.kycStatus,
      fiatCurrency: user.fiatCurrency,
      isAdmin: user.isAdmin,
      isBanned: user.isBanned,
    },
  })
}
