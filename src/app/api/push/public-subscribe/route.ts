/**
 * POST /api/push/public-subscribe - subscribe to push notifications WITHOUT auth
 * For visitors who are not logged in. Stores subscription with userId=null.
 * Body: { endpoint, keys: { p256dh, auth } }
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Missing subscription fields' }, { status: 400 })
    }

    // Check if this endpoint already exists
    const existing = await db.pushSubscription.findUnique({
      where: { endpoint },
    })

    if (existing) {
      // Update if it was tied to a user before but now anonymous, or just return
      return NextResponse.json({ ok: true, message: 'Already subscribed' })
    }

    // Create new anonymous subscription (userId = 'anonymous')
    await db.pushSubscription.create({
      data: {
        userId: 'anonymous',
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers.get('user-agent') || null,
      },
    })

    return NextResponse.json({ ok: true, message: 'Subscribed to push notifications' })
  } catch (e: any) {
    console.error('[push/public-subscribe]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}

/**
 * DELETE /api/push/public-subscribe - unsubscribe
 * Body: { endpoint }
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
    }

    await db.pushSubscription.deleteMany({
      where: { endpoint },
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
