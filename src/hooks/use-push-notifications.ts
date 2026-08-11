'use client'
import { useState, useEffect, useCallback } from 'react'
interface PushState { supported: boolean; permission: NotificationPermission | 'unsupported'; subscribed: boolean; loading: boolean; error: string | null }
function urlBase64ToUint8Array(b: string): Uint8Array { const p = '='.repeat((4 - b.length % 4) % 4); const base64 = (b + p).replace(/-/g, '+').replace(/_/g, '/'); const raw = window.atob(base64); const arr = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i); return arr }
export function usePushNotifications() {
  const [state, setState] = useState<PushState>({ supported: false, permission: 'unsupported', subscribed: false, loading: false, error: null })
  useEffect(() => { if (typeof window === 'undefined') return; if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setState(s => ({ ...s, supported: false, permission: 'unsupported' })); return } setState(s => ({ ...s, supported: true, permission: Notification.permission })) }, [])
  useEffect(() => { if (!state.supported) return; (async () => { try { await navigator.serviceWorker.register('/sw.js', { scope: '/' }) } catch {} })() }, [state.supported])
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.supported) return false
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const perm = await Notification.requestPermission(); setState(s => ({ ...s, permission: perm }))
      if (perm !== 'granted') { setState(s => ({ ...s, loading: false, subscribed: false, error: 'Denied' })); return false }
      const keyRes = await fetch('/api/push/subscribe'); const keyData = await keyRes.json()
      if (!keyData.publicKey) throw new Error('Not configured')
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(keyData.publicKey) })
      const s = sub.toJSON()
      const res = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: s.endpoint, keys: s.keys }) })
      const d = await res.json(); if (d.error) throw new Error(d.error)
      setState(s => ({ ...s, loading: false, subscribed: true })); return true
    } catch (e: any) { setState(s => ({ ...s, loading: false, error: e?.message || 'Failed' })); return false }
  }, [state.supported])
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState(s => ({ ...s, loading: true })); try { const reg = await navigator.serviceWorker.ready; const ex = await reg.pushManager.getSubscription(); if (ex) { await ex.unsubscribe(); await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: ex.endpoint }) }) } setState(s => ({ ...s, loading: false, subscribed: false })); return true } catch { setState(s => ({ ...s, loading: false })); return false }
  }, [])
  return { ...state, subscribe, unsubscribe }
}
