import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, hashPassword } from '@/lib/auth'
import crypto from 'crypto'

/**
 * GET /api/auth/google/callback
 * Handles the OAuth callback from Google after the user selects their account.
 * Exchanges the authorization code for user info (email, name).
 */
export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get('code')
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${new URL(req.url).origin}/api/auth/google/callback`

  if (!code || !clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/?auth_error=google_not_configured', req.url))
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL('/?auth_error=token_failed', req.url))
    }

    const tokens = await tokenRes.json()

    // Get user info from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userRes.ok) {
      return NextResponse.redirect(new URL('/?auth_error=userinfo_failed', req.url))
    }

    const googleUser = await userRes.json()
    const email = googleUser.email?.toLowerCase().trim()
    const name = googleUser.name || googleUser.given_name || email?.split('@')[0] || 'Google User'

    if (!email) {
      return NextResponse.redirect(new URL('/?auth_error=no_email', req.url))
    }

    // Find or create the user
    let user = await db.user.findUnique({ where: { email } })

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex')
      user = await db.user.create({
        data: {
          email,
          name,
          passwordHash: hashPassword(randomPassword),
          kycVerified: false,
          kycLevel: 0,
          kycStatus: 'NONE',
          fiatCurrency: 'USD',
          isActive: true,
        },
      })

      const defaultAssets = [
        { symbol: 'BTC', name: 'Bitcoin' }, { symbol: 'ETH', name: 'Ethereum' },
        { symbol: 'USDT', name: 'Tether' }, { symbol: 'USDC', name: 'USD Coin' },
        { symbol: 'BNB', name: 'BNB' }, { symbol: 'SOL', name: 'Solana' },
        { symbol: 'XRP', name: 'XRP' }, { symbol: 'ADA', name: 'Cardano' },
        { symbol: 'DOGE', name: 'Dogecoin' },
      ]
      for (const a of defaultAssets) {
        await db.wallet.create({
          data: {
            userId: user.id, asset: a.symbol, assetName: a.name,
            balance: 0, available: 0, depositAddress: 'T' + Math.random().toString(36).slice(2, 34).toUpperCase(),
          },
        })
      }
    } else if (user.isBanned) {
      return NextResponse.redirect(new URL('/?auth_error=banned', req.url))
    } else if (!user.isActive) {
      return NextResponse.redirect(new URL('/?auth_error=deactivated', req.url))
    }

    const session = await createSession(user.id, req.headers.get('x-forwarded-for') || undefined, req.headers.get('user-agent') || undefined)

    const response = NextResponse.redirect(new URL('/', req.url))
    response.cookies.set('session_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return response
  } catch (e: any) {
    console.error('[google callback] error:', e)
    return NextResponse.redirect(new URL('/?auth_error=exception', req.url))
  }
}
