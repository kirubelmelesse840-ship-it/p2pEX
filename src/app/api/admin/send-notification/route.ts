/**
 * POST /api/admin/send-notification - admin sends a notification to a user or all users
 * Body: { userId?, title, message, type }
 *   userId = null → broadcast to ALL users (including anonymous visitors via web push)
 *   userId = specific user ID → send to that user only
 *
 * Also sends web push notifications to all subscribers.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import webpush from 'web-push'

export async function POST(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    const { error, status } = await requireAdmin(req as unknown as Request)
    if (error) return NextResponse.json({ error }, { status })

    const { userId, title, message, type } = await req.json()
    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
    }

    // Create in-app notification
    const notification = await db.adminNotification.create({
      data: {
        userId: userId || null, // null = broadcast to all
        title,
        message,
        type: type || 'info',
      },
    })

    // Send web push notifications
    let pushSent = 0
    let pushFailed = 0
    try {
      const publicKey = process.env.VAPID_PUBLIC_KEY
      const privateKey = process.env.VAPID_PRIVATE_KEY
      const subject = process.env.VAPID_SUBJECT || 'mailto:support@p2pex.com'

      if (publicKey && privateKey) {
        webpush.setVapidDetails(subject, publicKey, privateKey)

        // Get all push subscriptions
        // If userId is null (broadcast), send to ALL subscribers
        // If userId is specific, send only to that user's subscriptions
        const subs = await db.pushSubscription.findMany({
          where: userId ? { userId } : {},
        })

        const payload = JSON.stringify({
          title,
          body: message,
          url: '/',
          tag: `notif-${notification.id}`,
          timestamp: Date.now(),
        })

        const results = await Promise.allSettled(
          subs.map(sub =>
            webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            )
          )
        )

        for (const r of results) {
          if (r.status === 'fulfilled') pushSent++
          else pushFailed++
        }

        // Clean up expired subscriptions (410 Gone)
        const expired = results
          .map((r, i) => r.status === 'rejected' && r.reason?.statusCode === 410 ? subs[i].endpoint : null)
          .filter(Boolean) as string[]

        if (expired.length > 0) {
          await db.pushSubscription.deleteMany({ where: { endpoint: { in: expired } } }).catch(() => {})
        }
      }
    } catch (e) {
      console.error('[send-notification] push error:', e)
    }

    const target = userId ? 'specific user' : 'all users (broadcast)'
    return NextResponse.json({
      ok: true,
      message: `Notification sent to ${target}${pushSent > 0 ? ` (${pushSent} push sent, ${pushFailed} failed)` : ''}`,
      notification,
      pushSent,
      pushFailed,
    })

  } catch (e: any) {
    console.error('[admin route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/admin/send-notification - list all sent notifications
 */
export async function GET(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    const { error, status } = await requireAdmin(req as unknown as Request)
    if (error) return NextResponse.json({ error }, { status })

    const notifications = await db.adminNotification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ notifications })

  } catch (e: any) {
    console.error('[admin route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
