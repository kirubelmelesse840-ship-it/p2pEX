/**
 * POST /api/admin/notifications/delete - delete a sent notification
 * Body: { notificationId }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })

  const { notificationId } = await req.json()
  if (!notificationId) {
    return NextResponse.json({ error: 'notificationId required' }, { status: 400 })
  }

  try {
    await db.adminNotification.delete({ where: { id: notificationId } })
    return NextResponse.json({ ok: true, message: 'Notification deleted' })
  } catch (e: any) {
    if (e.code === 'P2025') {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
