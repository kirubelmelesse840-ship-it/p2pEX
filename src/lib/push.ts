import { db } from '@/lib/db'

const publicKey = process.env.VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
const subject = process.env.VAPID_SUBJECT || 'mailto:support@p2pex.com'

export interface PushPayload { title: string; body: string; url?: string; tag?: string }

// Cache the webpush module after first dynamic import
let _webpush: any = null
let _webpushInitialized = false

async function getWebpush() {
  if (_webpush) return _webpush
  try {
    const mod = await import('web-push')
    _webpush = mod.default || mod
    if (publicKey && privateKey) {
      _webpush.setVapidDetails(subject, publicKey, privateKey)
    }
    _webpushInitialized = true
    return _webpush
  } catch (e) {
    console.error('[push] failed to load web-push module:', e)
    return null
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!publicKey || !privateKey) return
  try {
    const webpush = await getWebpush()
    if (!webpush) return

    const subs = await db.pushSubscription.findMany({ where: { userId } })
    if (subs.length === 0) return

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      tag: payload.tag || 'p2pex',
      timestamp: Date.now(),
    })

    await Promise.allSettled(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload
        )
      } catch (err: any) {
        // Clean up expired subscriptions (410 Gone, 404 Not Found)
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          try { await db.pushSubscription.delete({ where: { id: sub.id } }) } catch {}
        }
      }
    }))
  } catch (e) {
    console.error('[push] sendPushToUser error:', e)
  }
}

export function getVapidPublicKey(): string | null {
  return publicKey || null
}
