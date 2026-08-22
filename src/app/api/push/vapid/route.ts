/**
 * GET /api/push/vapid - returns the VAPID public key (no auth required)
 */
import { NextResponse } from 'next/server'

export async function GET() {
// AUTO-TRY-CATCH
  try {

    const publicKey = process.env.VAPID_PUBLIC_KEY
    if (!publicKey) {
      return NextResponse.json({ error: 'VAPID not configured' }, { status: 500 })
    }
    return NextResponse.json({ publicKey })

  } catch (e: any) {
    console.error('[user route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
