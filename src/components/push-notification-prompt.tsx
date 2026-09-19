'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Bell, X, CheckCircle2, BellRing } from 'lucide-react'

const DISMISS_KEY = 'p2pex_push_dismissed'
const GRANTED_KEY = 'p2pex_push_granted'
const USER_GRANTED_KEY = 'p2pex_push_user_granted_'

/**
 * PushNotificationPrompt
 *
 * Shows a banner asking ALL visitors (logged in OR not) to enable
 * push notifications. Works like Telegram/WhatsApp:
 *   - User taps "Enable"
 *   - Browser shows permission prompt
 *   - If granted → registers service worker + subscribes to push
 *   - Push notifications appear on phone even when browser is closed
 *
 * The banner shows for:
 *   - Non-logged-in users (first visit)
 *   - Logged-in users (first login on this device)
 *   - Anyone who hasn't granted permission yet
 */
export function PushNotificationPrompt() {
  const { user } = useAppStore()
  const [showBanner, setShowBanner] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>('unknown')

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if push is supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    // Check current permission
    const perm = Notification.permission
    setStatus(perm as any)

    // Don't show banner if already granted or denied
    if (perm === 'granted') {
      // Already granted — make sure we're subscribed (and linked to user if logged in)
      registerAndSubscribe()
      return
    }
    if (perm === 'denied') return

    // Check if this specific user (or non-logged-in visitor) has dismissed
    // We use a per-user dismiss key so logging in with a different account re-asks
    const dismissKey = user ? `${USER_GRANTED_KEY}${user.id}` : DISMISS_KEY
    if (localStorage.getItem(dismissKey) === 'true') return
    if (localStorage.getItem(GRANTED_KEY) === 'true' && !user) return

    // Show banner after 2-second delay (feels natural, not aggressive)
    const t = setTimeout(() => setShowBanner(true), 2000)
    return () => clearTimeout(t)
  }, [user?.id]) // Re-check when user changes (login/logout)

  const handleEnable = async () => {
    setLoading(true)
    try {
      // Request permission (this is triggered by user tap — satisfies browser requirement)
      const permission = await Notification.requestPermission()
      setStatus(permission as any)

      if (permission !== 'granted') {
        // User denied or dismissed the browser prompt
        setLoading(false)
        return
      }

      // Permission granted — register service worker + subscribe to push
      await registerAndSubscribe()

      // Save to localStorage so we don't ask again
      try {
        localStorage.setItem(GRANTED_KEY, 'true')
      } catch {}

      // Show success message briefly
      setShowBanner(false)
    } catch (e) {
      console.error('[push] failed to enable:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    try {
      // Use per-user dismiss key so the banner re-appears if they log in with a different account
      const dismissKey = user ? `${USER_GRANTED_KEY}${user.id}` : DISMISS_KEY
      localStorage.setItem(dismissKey, 'true')
    } catch {}
    setShowBanner(false)
  }

  // Don't render anything if unsupported, granted, or denied
  if (status === 'unsupported' || status === 'granted' || status === 'denied') {
    return null
  }

  // Don't render if banner shouldn't show
  if (!showBanner) return null

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-1.5rem)] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border-2 border-primary/30 shadow-2xl rounded-xl p-4 flex items-start gap-3 relative glow-card">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 text-primary flex-shrink-0">
          <BellRing className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="text-sm font-bold mb-1 flex items-center gap-1.5">
            Enable Phone Notifications
          </h3>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Get instant alerts on your phone — just like Telegram & WhatsApp. You'll be notified when:
          </p>
          <ul className="text-[11px] text-muted-foreground mb-3 space-y-0.5 ml-3">
            <li>• Your deposit/withdrawal is approved</li>
            <li>• Your P2P order status changes</li>
            <li>• Your KYC is verified</li>
            <li>• You receive a new message from support</li>
            <li>• Important announcements are sent</li>
          </ul>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleEnable}
              disabled={loading}
              className="h-9 text-xs bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
            >
              {loading ? (
                <>
                  <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                  Enabling...
                </>
              ) : (
                <>
                  <Bell className="h-3.5 w-3.5 mr-1.5" />
                  Enable Notifications
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              disabled={loading}
              className="h-9 text-xs"
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1 rounded transition"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * Register service worker + subscribe to push notifications.
 * Works for both logged-in users (links subscription to user account)
 * and anonymous visitors (links to session cookie).
 */
async function registerAndSubscribe() {
  try {
    // Register service worker first
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    await navigator.serviceWorker.ready

    // Check if already subscribed
    const existingSub = await reg.pushManager.getSubscription()
    if (existingSub) {
      // Already subscribed — re-send to server to make sure it's linked
      await sendSubscription(existingSub)
      return
    }

    // Get VAPID public key from server
    const vapidRes = await fetch('/api/push/vapid')
    const vapidText = await vapidRes.text()
    if (!vapidText) return
    const vapidData = JSON.parse(vapidText)
    if (!vapidData.publicKey) return

    // Subscribe to push notifications
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey) as any,
    })

    // Send subscription to server
    await sendSubscription(sub)

    // Show a test notification to confirm it's working
    if (reg.showNotification) {
      reg.showNotification('✅ Notifications Enabled', {
        body: 'You will now receive instant alerts on your phone.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'p2pex-enabled',
        vibrate: [100, 50, 100],
      } as any)
    }
  } catch (e) {
    console.error('[push] registration failed:', e)
  }
}

async function sendSubscription(sub: PushSubscription) {
  try {
    const subJson = sub.toJSON()
    // Try to link to user account first (if logged in)
    const userRes = await fetch('/api/auth')
    const userText = await userRes.text()
    let userId: string | null = null
    if (userText) {
      try {
        const userData = JSON.parse(userText)
        if (userData.user?.id) userId = userData.user.id
      } catch {}
    }

    // If logged in, use the user-specific subscribe endpoint
    // If not logged in, use the public subscribe endpoint
    const endpoint = userId ? '/api/push/subscribe' : '/api/push/public-subscribe'
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: subJson.keys,
      }),
    })
  } catch (e) {
    console.error('[push] failed to send subscription:', e)
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary')
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}
