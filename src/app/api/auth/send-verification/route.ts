/**
 * POST /api/auth/send-verification
 * Body: { email }
 *
 * Generates a 6-digit verification code and "sends" it to the user's email.
 * In production, this would use an email service (SendGrid, AWS SES, etc.).
 * For this demo, we generate the code and return it in the response (so the
 * UI can display it for testing). In a real app, the code would only be sent
 * via email and never returned in the API response.
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// In-memory store for verification codes (resets on server restart).
// In production, use Redis or another persistent store with TTL.
const verificationCodes = new Map<string, { code: string; expiresAt: number }>()

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Rate limit: max 1 code per 60 seconds per email
    const existing = verificationCodes.get(normalizedEmail)
    if (existing && existing.expiresAt - Date.now() > 4 * 60 * 1000) {
      // Code still valid (less than 1 minute old since 5-min TTL)
      return NextResponse.json({
        ok: true,
        message: 'A verification code was already sent. Please check your email.',
        // In demo mode, return the code so the UI can display it
        code: existing.code,
      })
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString()

    // Store code with 5-minute expiry
    verificationCodes.set(normalizedEmail, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
    })

    // In production, send the email here using an email service:
    // await sendEmail({
    //   to: normalizedEmail,
    //   subject: 'Your CrypEx Verification Code',
    //   body: `Your verification code is: ${code}. It expires in 5 minutes.`,
    // })

    console.log(`[send-verification] Code for ${normalizedEmail}: ${code}`)

    return NextResponse.json({
      ok: true,
      message: `Verification code sent to ${normalizedEmail}`,
      // Demo only: return the code so the UI can display it for testing
      code,
    })
  } catch (e: any) {
    console.error('[send-verification]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
