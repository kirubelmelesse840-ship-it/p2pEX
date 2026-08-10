import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getVapidPublicKey } from '@/lib/push'
export async function GET(req: NextRequest) {
  const publicKey = getVapidPublicKey()
  if (!publicKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const user = await getCurrentUser(req as unknown as Request)
  if (!user) return NextResponse.json({ publicKey, subscribed: false })
  const count = await db.pushSubscription.count({ where: { userId: user.id } })
  return NextResponse.json({ publicKey, subscribed: count > 0 })
}
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req as unknown as Request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { endpoint, keys } = await req.json()
  if (!endpoint || !keys?.p256dh || !keys?.auth) return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  const userAgent = req.headers.get('user-agent') || undefined
  await db.pushSubscription.upsert({ where: { endpoint }, create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent }, update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth, userAgent, updatedAt: new Date() } })
  return NextResponse.json({ ok: true })
}
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser(req as unknown as Request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { endpoint } = await req.json()
  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 })
  await db.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } })
  return NextResponse.json({ ok: true })
}
