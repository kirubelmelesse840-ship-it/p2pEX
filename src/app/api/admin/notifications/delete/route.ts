/**
 * POST /api/admin/notifications/delete - delete a sent notification
 * Body: { notificationId }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    const { error, status } = await requireAdmin(req as unknown as Request)
    if (error) return NextResponse.json({ error }, { status })

    const { notificationId } = await req.json()
    if (!notificationId) {
      return NextResponse.json({ error: 'notificationId required' }, { status: 400 })
    }

    try {
      // Synthetic IDs (payment-xxx, kyc-xxx, user-xxx, trade-xxx) are generated
      // by the notifications list route — they don't exist as DB rows.
      // Just acknowledge deletion for these.
      if (/^(payment|kyc|user|trade|order|transaction|listing|support)-/.test(notificationId)) {
        return NextResponse.json({ ok: true, message: 'Cleared' })
      }
      await db.adminNotification.delete({ where: { id: notificationId } })
      return NextResponse.json({ ok: true, message: 'Notification deleted' })
    } catch (e: any) {
      if (e.code === 'P2025') {
        return NextResponse.json({ ok: true, message: 'Already cleared' })
      }
      return NextResponse.json({ error: e.message }, { status: 500 })
    }

  } catch (e: any) {
    console.error('[admin route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
