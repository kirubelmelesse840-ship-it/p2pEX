/**
 * POST /api/auth/google - Simulated Google OAuth login
 *
 * Body: { email, name?, avatar? }
 *
 * In production, this endpoint would receive the Google ID token after the
 * Google OAuth redirect and verify it. For this demo, we accept a Google
 * email directly (simulating the post-Google-redirect step) and either:
 *   - Log in the existing user, OR
 *   - Create a new user account with that Google email
 *
 * This mirrors the real Google OAuth UX from the user's perspective:
 * they click "Continue with Google", enter/select their Google email,
 * and are logged in.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, hashPassword } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Find or create the user
    let user = await db.user.findUnique({ where: { email: normalizedEmail } })

    if (!user) {
      // Create new user via Google sign-in
      // Generate a random password hash (Google users don't use password login)
      const randomPassword = crypto.randomBytes(32).toString('hex')
      const derivedName = name || normalizedEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

      user = await db.user.create({
        data: {
          email: normalizedEmail,
          name: derivedName,
          passwordHash: hashPassword(randomPassword),
          // New Google users start as explicitly UNVERIFIED until they submit KYC
          // and an admin approves it.
          kycVerified: false,
          kycLevel: 0,
          kycStatus: 'NONE',
          fiatCurrency: 'USD',
          isActive: true,
        },
      })

      // Create default wallets (empty balances for new Google users)
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
    } else if (user.isBanned) {
      return NextResponse.json({ error: 'This account has been banned. Contact support.' }, { status: 403 })
    } else if (!user.isActive) {
      return NextResponse.json({ error: 'This account has been deactivated.' }, { status: 403 })
    }

    // Create session
    const session = await createSession(
      user.id,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    )

    const response = NextResponse.json({
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
      token: session.token,
      isNewUser: user.createdAt > new Date(Date.now() - 5000), // created in last 5 seconds
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
    console.error('[google auth]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
