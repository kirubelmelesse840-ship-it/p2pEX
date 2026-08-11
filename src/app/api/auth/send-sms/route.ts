/**
 * POST /api/auth/send-sms
 * Body: { phone }
 *
 * Generates a 6-digit SMS verification code and "sends" it to the phone number.
 *
 * SMS sending:
 * - Uses Twilio if env vars are configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_FROM)
 * - Falls back to logging the code to the server console if no Twilio configured
 * - The code is NEVER returned in the API response
 *
 * In production, set these env vars to enable real SMS delivery:
 *   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN=your_auth_token
 *   TWILIO_PHONE_FROM=+1234567890
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// In-memory store for SMS codes
const smsCodes = new Map<string, { code: string; expiresAt: number; attempts: number }>()

async function sendSmsCode(phone: string, code: string): Promise<void> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const twilioFrom = process.env.TWILIO_PHONE_FROM

  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')
      const body = new URLSearchParams({
        From: twilioFrom,
        To: phone,
        Body: `Your P2PEX verification code is: ${code}. It expires in 5 minutes.`,
      })
      await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })
      console.log(`[sms] Code sent to ${phone} via Twilio`)
    } catch (e: any) {
      console.error(`[sms] Twilio failed:`, e.message)
      console.log(`[sms] (fallback) Code for ${phone}: ${code}`)
    }
  } else {
    // No Twilio configured - log to console
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📱 SMS VERIFICATION CODE`)
    console.log(`${'='.repeat(60)}`)
    console.log(`To: ${phone}`)
    console.log(`Code: ${code}`)
    console.log(`Expires: 5 minutes`)
    console.log(`${'='.repeat(60)}\n`)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // Basic phone validation (E.164 format: + followed by 8-15 digits)
    const cleanPhone = phone.replace(/[\s\-()]/g, '')
    if (!/^\+\d{8,15}$/.test(cleanPhone)) {
      return NextResponse.json({
        error: 'Invalid phone format. Use international format: +251912345678',
      }, { status: 400 })
    }

    // Rate limit: 1 code per 60 seconds
    const existing = smsCodes.get(cleanPhone)
    if (existing && existing.expiresAt - Date.now() > 4 * 60 * 1000) {
      return NextResponse.json({
        ok: true,
        message: 'A code was already sent. Please wait before requesting another.',
      })
    }

    const code = crypto.randomInt(100000, 999999).toString()
    smsCodes.set(cleanPhone, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    })

    await sendSmsCode(cleanPhone, code)

    return NextResponse.json({
      ok: true,
      message: `A 6-digit code has been sent to ${cleanPhone}`,
    })
  } catch (e: any) {
    console.error('[send-sms]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}

export function verifySmsCode(phone: string, code: string): boolean {
  const cleanPhone = phone.replace(/[\s\-()]/g, '')
  const stored = smsCodes.get(cleanPhone)
  if (!stored) return false
  if (stored.expiresAt < Date.now()) {
    smsCodes.delete(cleanPhone)
    return false
  }
  if (stored.attempts >= 5) {
    smsCodes.delete(cleanPhone)
    return false
  }
  stored.attempts++
  if (stored.code !== code) return false
  smsCodes.delete(cleanPhone)
  return true
}
