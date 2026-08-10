'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { Button } from '@/components/ui/button'
import { Bell, X, CheckCircle2 } from 'lucide-react'
const ASKED_KEY = 'p2pex_push_asked'
const GRANTED_KEY = 'p2pex_push_granted'
export function PushNotificationProvider() {
  const { user } = useAppStore()
  const { supported, permission, subscribed, loading, subscribe } = usePushNotifications()
  const [showBanner, setShowBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!user || !supported || subscribed || permission === 'denied') { setShowBanner(false); return }
    if (localStorage.getItem(GRANTED_KEY) === 'true') { setShowBanner(false); return }
    if (localStorage.getItem(ASKED_KEY) === 'true' && dismissed) { setShowBanner(false); return }
    const t = setTimeout(() => setShowBanner(true), 2000); return () => clearTimeout(t)
  }, [user, supported, subscribed, permission, dismissed])
  const handleEnable = async () => { const ok = await subscribe(); if (ok) { try { localStorage.setItem(GRANTED_KEY, 'true'); localStorage.setItem(ASKED_KEY, 'true') } catch {}; setShowBanner(false) } }
  const handleDismiss = () => { try { localStorage.setItem(ASKED_KEY, 'true') } catch {}; setDismissed(true); setShowBanner(false) }
  if (!showBanner) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md">
      <div className="bg-card border border-border shadow-2xl rounded-xl p-4 flex items-start gap-3 relative">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary flex-shrink-0"><Bell className="h-5 w-5" /></div>
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="text-sm font-semibold mb-0.5">Enable Push Notifications</h3>
          <p className="text-xs text-muted-foreground mb-3">Get instant alerts on your phone when your deposit/withdraw is approved, P2P orders update, or KYC status changes.</p>
          <div className="flex gap-2"><Button size="sm" onClick={handleEnable} disabled={loading} className="h-8 text-xs">{loading ? 'Enabling...' : 'Enable'}</Button><Button size="sm" variant="ghost" onClick={handleDismiss} disabled={loading} className="h-8 text-xs">Not now</Button></div>
        </div>
        <button onClick={handleDismiss} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1 rounded" aria-label="Dismiss"><X className="h-4 w-4" /></button>
      </div>
    </div>
  )
}
export function PushNotificationToggle() {
  const { supported, permission, subscribed, loading, subscribe, unsubscribe } = usePushNotifications()
  if (!supported) return <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">Push notifications are not supported in this browser.</div>
  if (permission === 'denied') return <div className="text-xs text-orange-600 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">Push notifications are blocked. Enable in browser settings.</div>
  if (subscribed) return (<div className="space-y-2"><div className="flex items-center gap-2 text-xs text-green-600 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"><CheckCircle2 className="h-4 w-4" /><span>Push notifications enabled.</span></div><Button variant="outline" size="sm" onClick={unsubscribe} disabled={loading} className="w-full h-8 text-xs">{loading ? 'Disabling...' : 'Disable'}</Button></div>)
  return (<div className="space-y-2"><div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">Enable push notifications for instant alerts.</div><Button onClick={subscribe} disabled={loading} className="w-full h-9 text-sm">{loading ? 'Enabling...' : 'Enable Push Notifications'}</Button></div>)
}
