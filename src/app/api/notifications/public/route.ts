/**
 * GET /api/notifications/public - get broadcast notifications (no auth required)
 * Returns announcements that should be visible to ALL users (including not signed in)
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    try {
      const notifications = await db.adminNotification.findMany({
        where: { userId: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
      return NextResponse.json({ notifications })
    } catch (e: any) {
      return NextResponse.json({ notifications: [] })
    }

  } catch (e: any) {
    console.error('[user route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
