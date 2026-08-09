/**
 * GET /api/notifications - fetch notifications for the current user
 * Returns both broadcast (userId=null) and user-specific notifications
 *
 * POST /api/notifications - mark a notification as read
 * Body: { notificationId }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req as unknown as Request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Get notifications: broadcast (userId=null) OR targeted to this user
  const notifications = await db.adminNotification.findMany({
    where: {
      OR: [
        { userId: null },          // broadcast to all
        { userId: user.id },        // targeted to this user
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  const unreadCount = notifications.filter(n => !n.isRead && (n.userId === null || n.userId === user.id)).length

  return NextResponse.json({
    notifications,
    unreadCount,
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req as unknown as Request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { notificationId } = await req.json()
  if (!notificationId) {
    return NextResponse.json({ error: 'notificationId required' }, { status: 400 })
  }

  // Mark as read (only if it belongs to this user or is a broadcast)
  const notif = await db.adminNotification.findUnique({ where: { id: notificationId } })
  if (!notif) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (notif.userId !== null && notif.userId !== user.id) {
    return NextResponse.json({ error: 'Not your notification' }, { status: 403 })
  }

  await db.adminNotification.update({
    where: { id: notificationId },
    data: { isRead: true },
  })

  return NextResponse.json({ ok: true })
}
