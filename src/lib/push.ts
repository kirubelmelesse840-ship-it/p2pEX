import webpush from 'web-push'
import { db } from '@/lib/db'
const publicKey = process.env.VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
const subject = process.env.VAPID_SUBJECT || 'mailto:support@p2pex.com'
if (publicKey && privateKey) webpush.setVapidDetails(subject, publicKey, privateKey)
export interface PushPayload { title: string; body: string; url?: string; tag?: string }
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!publicKey || !privateKey) return
  try {
    const subs = await db.pushSubscription.findMany({ where: { userId } })
    if (subs.length === 0) return
    const pushPayload = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url || '/', tag: payload.tag || 'p2pex', timestamp: Date.now() })
    await Promise.allSettled(subs.map(async (sub) => {
      try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, pushPayload) }
      catch (err: any) { if (err?.statusCode === 410 || err?.statusCode === 404) { try { await db.pushSubscription.delete({ where: { id: sub.id } }) } catch {} } }
    }))
  } catch (e) { console.error('[push] error:', e) }
}
export function getVapidPublicKey(): string | null { return publicKey || null }
