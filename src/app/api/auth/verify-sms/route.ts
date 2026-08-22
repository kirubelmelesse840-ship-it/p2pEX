/**
 * POST /api/auth/verify-sms
 * Body: { phone, code }
 *
 * Verifies a 6-digit SMS code against the stored code for the phone number.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifySmsCode } from '../send-sms/route'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { phone, code } = body
    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and code are required' }, { status: 400 })
    }

    const isValid = verifySmsCode(phone, code.toString().trim())

    return NextResponse.json({
      valid: isValid,
      message: isValid ? 'Phone verified successfully' : 'Invalid or expired code',
    })
  } catch (e: any) {
    console.error('[verify-sms]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
