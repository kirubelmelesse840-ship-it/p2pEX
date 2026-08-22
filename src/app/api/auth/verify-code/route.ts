/**
 * POST /api/auth/verify-code
 * Body: { email, code }
 *
 * Verifies a 6-digit code against the stored code for the email.
 * Returns { valid: true } if the code matches, { valid: false } otherwise.
 *
 * The code itself is never returned to the client - only a boolean.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyCode } from '../send-verification/route'

export async function POST(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    try {
      const body = await req.json().catch(() => ({}))
      const { email, code } = body
      if (!email || !code) {
        return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
      }

      const isValid = verifyCode(email, code.toString().trim())

      return NextResponse.json({
        valid: isValid,
        message: isValid ? 'Code verified successfully' : 'Invalid or expired code',
      })
    } catch (e: any) {
      console.error('[verify-code]', e)
      return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
    }

  } catch (e: any) {
    console.error('[user route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
