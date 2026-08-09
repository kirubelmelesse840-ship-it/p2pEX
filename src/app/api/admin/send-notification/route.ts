/**
 * POST /api/admin/send-notification - admin sends a notification to a user or all users
 * Body: { userId?, title, message, type }
 *   userId = null → broadcast to ALL users
 *   userId = specific user ID → send to that user only
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })

  const { userId, title, message, type } = await req.json()
  if (!title || !message) {
    return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
  }

  const notification = await db.adminNotification.create({
    data: {
      userId: userId || null, // null = broadcast to all
      title,
      message,
      type: type || 'info',
    },
  })

  const target = userId ? 'specific user' : 'all users (broadcast)'
  return NextResponse.json({
    ok: true,
    message: `Notification sent to ${target}`,
    notification,
  })
}

/**
 * GET /api/admin/send-notification - list all sent notifications
 */
export async function GET(req: NextRequest) {
  const { error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })

  const notifications = await db.adminNotification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ notifications })
}
