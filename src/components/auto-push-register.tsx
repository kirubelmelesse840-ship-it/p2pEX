'use client'

import { useEffect } from 'react'

/**
 * Auto-registers push notifications for ALL visitors (logged in or not).
 * Shows a permission prompt on first visit.
 * Once granted, subscribes to push notifications.
 */
export function AutoPushRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    // Register immediately (no delay)
    const doRegister = async () => {
      try {
        // Check if already have permission
        if (Notification.permission === 'denied') return

        // If not granted yet, ask for permission
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission()
          if (permission !== 'granted') return
        }

        // Register service worker
        const reg = await navigator.serviceWorker.ready

        // Check if already subscribed
        const existingSub = await reg.pushManager.getSubscription()
        if (existingSub) {
          // Already subscribed — make sure it's registered on the server
          await sendSubscription(existingSub)
          return
        }

        // Get VAPID public key
        const vapidRes = await fetch('/api/push/vapid')
        if (!vapidRes.ok) return
        const vapidData = await vapidRes.json()
        if (!vapidData.publicKey) return

        // Subscribe to push
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
        })

        // Send subscription to server
        await sendSubscription(sub)
      } catch (e) {
        // Silent fail — don't bother the user
      }
    }

    // Run immediately on page load
    doRegister()

    return undefined
  }, [])

  return null
}

async function sendSubscription(sub: PushSubscription) {
  try {
    const subJson = sub.toJSON()
    await fetch('/api/push/public-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: subJson.keys,
      }),
    })
  } catch {}
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
