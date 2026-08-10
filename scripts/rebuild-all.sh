#!/bin/bash
# Regenerate all missing P2PEX files
cd /home/z/my-project

# Create directories
mkdir -p src/app/api/support
mkdir -p src/app/api/push/subscribe
mkdir -p src/app/api/admin/transactions/action
mkdir -p src/app/api/admin/users/details
mkdir -p src/app/api/admin/listings/create

# ===== 1. src/lib/push.ts =====
cat > src/lib/push.ts << 'PUSHEOF'
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
PUSHEOF

# ===== 2. src/lib/welcome-bonus.ts =====
cat > src/lib/welcome-bonus.ts << 'WBEOF'
import { db } from '@/lib/db'
const AMOUNT = 10
const ASSET = 'USDT'
export async function creditWelcomeBonus(userId: string): Promise<void> {
  try {
    let wallet = await db.wallet.findUnique({ where: { userId_asset: { userId, asset: ASSET } } })
    if (!wallet) { wallet = await db.wallet.create({ data: { userId, asset: ASSET, assetName: 'Tether', balance: 0, available: 0, locked: 0, depositAddress: 'T' + Math.random().toString(36).slice(2, 34).toUpperCase() } }) }
    await db.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: AMOUNT }, available: { increment: AMOUNT } } })
    await db.transaction.create({ data: { userId, asset: ASSET, type: 'DEPOSIT', amount: AMOUNT, fee: 0, network: 'WELCOME_BONUS', fromAddress: 'P2PEX Welcome Bonus', toAddress: 'internal', txHash: 'welcome-' + userId.slice(-8), status: 'COMPLETED', confirmations: 1, requiredConfirmations: 1, note: `Welcome bonus — ${AMOUNT} USDT` } })
    await db.adminNotification.create({ data: { userId, title: '🎁 Welcome Bonus Received!', message: `You have received the welcome bonus of ${AMOUNT} USDT. It has been credited to your wallet.`, type: 'success', isRead: false } })
    try { const { sendPushToUser } = await import('@/lib/push'); sendPushToUser(userId, { title: '🎁 Welcome Bonus Received!', body: `You have received the welcome bonus of ${AMOUNT} USDT.`, url: '/wallet', tag: 'welcome-bonus' }).catch(() => {}) } catch {}
    console.log(`[welcome-bonus] Credited ${AMOUNT} USDT to user ${userId}`)
  } catch (e: any) { console.error('[welcome-bonus] Failed:', e?.message) }
}
WBEOF

# ===== 3. src/lib/p2p-notifications.ts =====
cat > src/lib/p2p-notifications.ts << 'P2PNOTEOF'
import { db } from '@/lib/db'
export async function notifyUserP2PApproved(buyerId: string, asset: string, amount: number) {
  try { await db.adminNotification.create({ data: { userId: buyerId, title: 'Payment Approved', message: `Your P2P order has been approved. ${amount} ${asset} has been credited to your wallet.`, type: 'success', isRead: false } }) } catch (e) { console.error(e) }
}
export async function notifyUserP2PRejected(buyerId: string, asset: string, amount: number) {
  try { await db.adminNotification.create({ data: { userId: buyerId, title: 'Payment Rejected', message: `Your P2P order for ${amount} ${asset} was rejected.`, type: 'warning', isRead: false } }) } catch (e) { console.error(e) }
}
P2PNOTEOF

# ===== 4. src/lib/admin-email-notifications.ts =====
cat > src/lib/admin-email-notifications.ts << 'MAILEOF'
import nodemailer from 'nodemailer'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kirubelmelesse840@gmail.com'
let transporter: nodemailer.Transporter | null = null
async function getTransporter() {
  if (transporter) return transporter
  const testAccount = await nodemailer.createTestAccount()
  transporter = nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, auth: { user: testAccount.user, pass: testAccount.pass } })
  return transporter
}
async function sendEmail(subject: string, text: string) {
  try { const t = await getTransporter(); await t.sendMail({ from: 'P2PEX <noreply@p2pex.com>', to: ADMIN_EMAIL, subject, text }) } catch (e) { console.error('[email]', e) }
}
export async function notifyAdminUserSignup(name: string, email: string, userId: string) { await sendEmail('New User Signup', `Name: ${name}\nEmail: ${email}\nID: ${userId}`) }
export async function notifyAdminKycSubmission(name: string, email: string, userId: string) { await sendEmail('KYC Submission', `Name: ${name}\nEmail: ${email}\nID: ${userId}`) }
export async function notifyAdminP2POrder(name: string, email: string, asset: string, amount: number, total: number, currency: string, method: string) { await sendEmail('New P2P Order', `Buyer: ${name} (${email})\nAsset: ${amount} ${asset}\nTotal: ${total} ${currency}\nMethod: ${method}`) }
export async function notifyAdminSupportMessage(name: string, email: string, userId: string, message: string) { await sendEmail('New Support Message', `From: ${name} (${email})\nID: ${userId}\nMessage: ${message}`) }
MAILEOF

# ===== 5. src/lib/market-simulation.ts =====
cat > src/lib/market-simulation.ts << 'SIMEOF'
'use client'
import { Ticker, OrderBook, MarketTrade, Kline } from './use-market'
const BASE_PRICES: Record<string, number> = { BTC: 67500, ETH: 3450, BNB: 585, SOL: 165, XRP: 0.62, ADA: 0.45, DOGE: 0.16, AVAX: 38, LINK: 18.5, DOT: 7.2, MATIC: 0.72, LTC: 85, USDT: 1, USDC: 1 }
const ASSET_NAMES: Record<string, string> = { BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'BNB', SOL: 'Solana', XRP: 'XRP', ADA: 'Cardano', DOGE: 'Dogecoin', AVAX: 'Avalanche', LINK: 'Chainlink', DOT: 'Polkadot', MATIC: 'Polygon', LTC: 'Litecoin', USDT: 'Tether', USDC: 'USD Coin' }
const PAIRS: Array<[string, string]> = [['BTC','USDT'],['ETH','USDT'],['BNB','USDT'],['SOL','USDT'],['XRP','USDT'],['ADA','USDT'],['DOGE','USDT'],['AVAX','USDT'],['LINK','USDT'],['DOT','USDT'],['MATIC','USDT'],['LTC','USDT'],['BTC','USDC'],['ETH','USDC']]
const tickerMap: Record<string, Ticker> = {}
const orderBookMap: Record<string, OrderBook> = {}
const tradesMap: Record<string, MarketTrade[]> = {}
const klinesMap: Record<string, Kline[]> = {}
let initialized = false
let intervalId: ReturnType<typeof setInterval> | null = null
const subscribers: Array<() => void> = []
function getBasePrice(base: string, quote: string): number { return (BASE_PRICES[base] || 1) / (BASE_PRICES[quote] || 1) }
function initTickers() {
  if (initialized) return; initialized = true
  for (const [base, quote] of PAIRS) {
    const symbol = `${base}${quote}`; const price = getBasePrice(base, quote); const changePercent = (Math.random() - 0.5) * 8
    tickerMap[symbol] = { symbol, base, quote, baseName: ASSET_NAMES[base] || base, quoteName: ASSET_NAMES[quote] || quote, lastPrice: price, prevPrice: price / (1 + changePercent / 100), changePercent, high24h: price * 1.02, low24h: price * 0.98, volume24h: Math.random() * 50000 + 5000, quoteVolume24h: 0 }
    orderBookMap[symbol] = generateOrderBook(price)
    klinesMap[symbol] = generateKlines(price, 60)
    tradesMap[symbol] = generateTrades(price, 30)
  }
  intervalId = setInterval(updateAll, 2000)
}
function generateOrderBook(price: number): OrderBook { const bids: [number, number][] = []; const asks: [number, number][] = []; for (let i = 0; i < 15; i++) { bids.push([parseFloat((price * (1 - (i + 1) * 0.0003)).toFixed(6)), parseFloat((Math.random() * 5 + 0.1).toFixed(4))]); asks.push([parseFloat((price * (1 + (i + 1) * 0.0003)).toFixed(6)), parseFloat((Math.random() * 5 + 0.1).toFixed(4))]) } return { bids, asks } }
function generateKlines(currentPrice: number, count: number): Kline[] { const klines: Kline[] = []; const now = Date.now(); let price = currentPrice * 0.98; for (let i = count; i > 0; i--) { const openTime = now - i * 60000; const open = price; const vol = currentPrice * 0.003; const close = price + (Math.random() - 0.5) * vol; klines.push({ openTime, open: parseFloat(open.toFixed(6)), high: parseFloat(Math.max(open, close).toFixed(6)), low: parseFloat(Math.min(open, close).toFixed(6)), close: parseFloat(close.toFixed(6)), volume: parseFloat((Math.random() * 100 + 10).toFixed(4)), closeTime: openTime + 59999 }); price = close } return klines }
function generateTrades(price: number, count: number): MarketTrade[] { const trades: MarketTrade[] = []; const now = Date.now(); for (let i = 0; i < count; i++) { trades.push({ id: `sim-${now}-${i}`, price: parseFloat((price * (1 + (Math.random() - 0.5) * 0.001)).toFixed(6)), qty: parseFloat((Math.random() * 2 + 0.01).toFixed(4)), time: now - i * 5000, isBuyerMaker: Math.random() > 0.5 }) } return trades }
function updateAll() { for (const [base, quote] of PAIRS) { const symbol = `${base}${quote}`; const t = tickerMap[symbol]; if (!t) continue; const delta = (Math.random() - 0.5) * t.lastPrice * 0.003; const newPrice = Math.max(t.lastPrice + delta, t.lastPrice * 0.5); t.prevPrice = t.lastPrice; t.lastPrice = parseFloat(newPrice.toFixed(6)); t.changePercent = ((newPrice - (t.prevPrice || newPrice)) / (t.prevPrice || newPrice)) * 100 + t.changePercent * 0.99; t.high24h = Math.max(t.high24h, newPrice); t.low24h = Math.min(t.low24h, newPrice); if (Math.random() > 0.5) orderBookMap[symbol] = generateOrderBook(newPrice); tradesMap[symbol] = [{ id: `sim-${Date.now()}`, price: parseFloat(newPrice.toFixed(6)), qty: parseFloat((Math.random() * 2 + 0.01).toFixed(4)), time: Date.now(), isBuyerMaker: Math.random() > 0.5 }, ...(tradesMap[symbol] || [])].slice(0, 50); const klines = klinesMap[symbol] || []; if (klines.length > 0) { const last = klines[klines.length - 1]; const minute = Math.floor(Date.now() / 60000); if (minute > Math.floor(last.openTime / 60000)) { klines.push({ openTime: minute * 60000, open: last.close, high: Math.max(last.close, newPrice), low: Math.min(last.close, newPrice), close: parseFloat(newPrice.toFixed(6)), volume: Math.random() * 100, closeTime: minute * 60000 + 59999 }); if (klines.length > 200) klines.shift() } else { last.close = parseFloat(newPrice.toFixed(6)); last.high = Math.max(last.high, newPrice); last.low = Math.min(last.low, newPrice) } } } for (const cb of subscribers) cb() }
export function subscribe(cb: () => void): () => void { subscribers.push(cb); return () => { const i = subscribers.indexOf(cb); if (i >= 0) subscribers.splice(i, 1) } }
export function getAllTickers(): Ticker[] { return Object.values(tickerMap) }
export function getTicker(symbol: string): Ticker | null { return tickerMap[symbol.toUpperCase()] || null }
export function getOrderBook(symbol: string): OrderBook { return orderBookMap[symbol.toUpperCase()] || { bids: [], asks: [] } }
export function getTrades(symbol: string): MarketTrade[] { return tradesMap[symbol.toUpperCase()] || [] }
export function getKlines(symbol: string): Kline[] { return klinesMap[symbol.toUpperCase()] || [] }
export { initTickers }
SIMEOF

echo "Created lib files"

# ===== 6. public/sw.js =====
cat > public/sw.js << 'SWEOF'
self.addEventListener('install', (e) => { self.skipWaiting() })
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()) })
self.addEventListener('push', (event) => {
  let p = {}; try { p = event.data ? event.data.json() : {} } catch { p = { title: 'P2PEX', body: event.data ? event.data.text() : 'Notification' } }
  const { title = 'P2PEX', body = 'New update', url = '/', tag = 'p2pex' } = p
  event.waitUntil(self.registration.showNotification(title, { body, icon: '/logo.png', badge: '/logo.png', tag, data: { url }, vibrate: [100, 50, 100] }))
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil((async () => { const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); for (const c of cs) { if ('focus' in c) { try { await c.focus(); if ('navigate' in c) await c.navigate(url); return } catch {} } } if (self.clients.openWindow) { try { await self.clients.openWindow(url) } catch {} } })())
})
SWEOF

# ===== 7. src/hooks/use-push-notifications.ts =====
cat > src/hooks/use-push-notifications.ts << 'HOOKEOF'
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
HOOKEOF

# ===== 8. src/components/signup-prompt.tsx =====
cat > src/components/signup-prompt.tsx << 'SIGNEOF'
'use client'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { BackButton } from '@/components/back-button'
interface Props { icon: React.ReactNode; title: string; description: string; features?: Array<{ icon: React.ReactNode; label: string }>; backTo?: 'home' | 'markets' }
export function SignupPrompt({ icon, title, description, features, backTo = 'home' }: Props) {
  const openAuth = (mode: 'signup' | 'login') => window.dispatchEvent(new CustomEvent('open-auth', { detail: mode }))
  return (
    <div className="container mx-auto px-4 py-4 max-w-6xl">
      <BackButton to={backTo} />
      <div className="max-w-md mx-auto py-8 text-center">
        <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white mb-4">{icon}</div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6" dangerouslySetInnerHTML={{ __html: description }} />
        <div className="space-y-2">
          <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white" onClick={() => openAuth('signup')}>Create Account</Button>
          <Button variant="outline" className="w-full" onClick={() => openAuth('login')}>Log In</Button>
        </div>
        {features && features.length > 0 && (
          <div className="mt-6 grid gap-2 text-xs text-muted-foreground" style={{ gridTemplateColumns: `repeat(${features.length}, minmax(0, 1fr))` }}>
            {features.map((f, i) => (<div key={i} className="p-2 bg-muted/30 rounded-lg"><div className="flex justify-center mb-1 text-primary">{f.icon}</div><p>{f.label}</p></div>))}
          </div>
        )}
      </div>
    </div>
  )
}
SIGNEOF

# ===== 9. src/components/push-notification-provider.tsx =====
cat > src/components/push-notification-provider.tsx << 'PUSHPROVEOF'
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
PUSHPROVEOF

# ===== 10. src/components/support-chat-dialog.tsx =====
cat > src/components/support-chat-dialog.tsx << 'SUPPORTEOF'
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Send, Image as ImageIcon, Mic, Video, X, Play, Pause, Headphones, Square } from 'lucide-react'
interface Props { open: boolean; onClose: () => void }
export function SupportChatDialog({ open, onClose }: Props) {
  const { user } = useAppStore()
  const { toast } = useToast()
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [viewer, setViewer] = useState<string | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [recTime, setRecTime] = useState(0)
  const mr = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const fImg = useRef<HTMLInputElement>(null)
  const fVid = useRef<HTMLInputElement>(null)
  const load = useCallback(async () => { if (!user) return; try { const r = await fetch('/api/support?markRead=true'); const d = await r.json(); if (!d.error) setMessages(d.messages || []) } catch {} }, [user])
  useEffect(() => { if (open && user) { load(); const t = setInterval(load, 2000); return () => clearInterval(t) } }, [open, user, load])
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight }, [messages])
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); if (stream.current) stream.current.getTracks().forEach(t => t.stop()); if (audio.current) audio.current.pause() }, [])
  const send = async (type: string, data?: any) => {
    if (type === 'text' && !text.trim()) return
    setBusy(true)
    try {
      const body: any = { type, message: type === 'text' ? text.trim() : (data?.message || '') }
      if (data?.imageData) body.imageData = data.imageData
      if (data?.voiceData) body.voiceData = data.voiceData
      if (data?.videoData) body.videoData = data.videoData
      const r = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json(); if (d.error) throw new Error(d.error)
      if (type === 'text') setText('')
      await load()
    } catch (e: any) { toast({ title: 'Send failed', description: e.message, variant: 'destructive' }) } finally { setBusy(false) }
  }
  const startRec = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.current = s; chunks.current = []
      let mt = 'audio/webm'; if (!MediaRecorder.isTypeSupported(mt)) { mt = 'audio/mp4'; if (!MediaRecorder.isTypeSupported(mt)) mt = '' }
      const r = mt ? new MediaRecorder(s, { mimeType: mt }) : new MediaRecorder(s); mr.current = r
      r.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data) }
      r.onstop = async () => { const b = new Blob(chunks.current, { type: mt || 'audio/webm' }); if (b.size > 5e6) { toast({ title: 'Too long', description: 'Keep under 1 min', variant: 'destructive' }); return } const rd = new FileReader(); rd.onload = async () => await send('voice', { voiceData: rd.result as string, message: 'Voice' }); rd.readAsDataURL(b); if (stream.current) { stream.current.getTracks().forEach(t => t.stop()); stream.current = null } }
      r.start(1000); setRecording(true); setRecTime(0)
      timer.current = setInterval(() => setRecTime(p => { if (p >= 60) { stopRec(); return 60 }; return p + 1 }), 1000)
    } catch { toast({ title: 'Mic denied', description: 'Allow microphone access', variant: 'destructive' }) }
  }
  const stopRec = () => { if (mr.current?.state === 'recording') mr.current.stop(); setRecording(false); if (timer.current) { clearInterval(timer.current); timer.current = null } }
  const cancelRec = () => { if (mr.current?.state === 'recording') { mr.current.onstop = null; mr.current.stop() } setRecording(false); setRecTime(0); if (timer.current) { clearInterval(timer.current); timer.current = null }; if (stream.current) { stream.current.getTracks().forEach(t => t.stop()); stream.current = null } }
  const onImg = (f: File) => { const r = new FileReader(); r.onload = () => { const b = r.result as string; const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); const m = 600; let { width: w, height: h } = img; if (w > h && w > m) { h = h * m / w; w = m } else if (h > m) { w = w * m / h; h = m }; c.width = w; c.height = h; c.getContext('2d')?.drawImage(img, 0, 0, w, h); send('image', { imageData: c.toDataURL('image/jpeg', 0.6), message: f.name }) }; img.src = b }; r.readAsDataURL(f) }
  const onVid = (f: File) => { if (f.size > 3e6) { toast({ title: 'Too large', description: 'Under 3MB', variant: 'destructive' }); return } const r = new FileReader(); r.onload = () => send('video', { videoData: r.result as string, message: f.name }); r.readAsDataURL(f) }
  const play = (d: string, id: string) => { if (playing === id) { audio.current?.pause(); setPlaying(null); return } if (audio.current) audio.current.pause(); try { const b = d.includes(',') ? d.split(',')[1] : d; const m = d.match(/data:(.*?);/)?.[1] || 'audio/webm'; const bs = atob(b); const ab = new ArrayBuffer(bs.length); const ia = new Uint8Array(ab); for (let i = 0; i < bs.length; i++) ia[i] = bs.charCodeAt(i); audio.current = new Audio(URL.createObjectURL(new Blob([ab], { type: m }))); audio.current.onended = () => setPlaying(null); audio.current.onerror = () => setPlaying(null); audio.current.play().catch(() => setPlaying(null)); setPlaying(id) } catch {} }
  if (!open) return null
  const ft = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const fd = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogTitle className="sr-only">Support Chat</DialogTitle>
          <div className="flex items-center gap-2 p-3 border-b border-border bg-gradient-to-r from-yellow-500/10 to-orange-500/10 flex-shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white"><Headphones className="h-4 w-4" /></div>
            <div className="flex-1"><p className="font-medium text-sm">P2PEX Support</p><p className="text-xs text-green-500">● Online</p></div>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
          </div>
          <div ref={scroll} className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: '200px', maxHeight: '45vh' }}>
            {messages.length === 0 ? (<div className="text-center py-8 text-muted-foreground"><Headphones className="h-12 w-12 mx-auto mb-2 opacity-30" /><p className="text-sm font-medium">No messages yet</p><p className="text-xs">Send a message, image, voice, or video</p></div>) : messages.map(m => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-2.5 ${m.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {m.type === 'text' && <p className="text-sm break-words whitespace-pre-wrap">{m.message}</p>}
                  {m.type === 'image' && m.imageData && <img src={m.imageData} alt="img" className="rounded-lg max-w-full max-h-36 cursor-pointer" onClick={() => setViewer(m.imageData)} />}
                  {m.type === 'voice' && m.voiceData && <button onClick={() => play(m.voiceData, m.id)} className="flex items-center gap-2 p-1.5 w-full">{playing === m.id ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}<span className="text-xs">Voice</span></button>}
                  {m.type === 'video' && m.videoData && <video src={m.videoData} controls className="rounded-lg max-w-full max-h-36" />}
                  <p className={`text-[10px] mt-1 ${m.sender === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{fd(m.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          {recording && (<div className="flex items-center gap-2 p-2 bg-red-500/10 border-t border-red-500/30 flex-shrink-0"><span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" /><span className="text-sm text-red-500 font-medium flex-1">Recording {ft(recTime)}</span><button onClick={cancelRec} className="text-xs px-2 py-1 rounded text-muted-foreground hover:bg-muted">Cancel</button><button onClick={stopRec} className="text-xs px-3 py-1 rounded bg-red-500 text-white font-medium">Send</button></div>)}
          <div className="border-t border-border p-2 flex-shrink-0">
            <div className="flex items-center gap-1">
              <input ref={fImg} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) onImg(e.target.files[0]); e.target.value = '' }} />
              <input ref={fVid} type="file" accept="video/*" className="hidden" onChange={e => { if (e.target.files?.[0]) onVid(e.target.files[0]); e.target.value = '' }} />
              <button onClick={() => fImg.current?.click()} disabled={busy || recording} className="p-2 rounded-lg hover:bg-muted disabled:opacity-50"><ImageIcon className="h-5 w-5" /></button>
              <button onClick={recording ? stopRec : startRec} disabled={busy} className={`p-2 rounded-lg hover:bg-muted ${recording ? 'text-red-500' : ''}`}>{recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</button>
              <button onClick={() => fVid.current?.click()} disabled={busy || recording} className="p-2 rounded-lg hover:bg-muted disabled:opacity-50"><Video className="h-5 w-5" /></button>
              <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !busy && !recording) send('text') }} placeholder={recording ? 'Recording...' : 'Type...'} className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm" disabled={busy || recording} />
              <button onClick={() => send('text')} disabled={busy || recording || !text.trim()} className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"><Send className="h-5 w-5" /></button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {viewer && (<div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={() => setViewer(null)}><button className="absolute top-4 right-4 text-white p-2 z-10" onClick={() => setViewer(null)}><X className="h-8 w-8" /></button><img src={viewer} alt="Full" className="max-w-full max-h-full object-contain" /></div>)}
    </>
  )
}
SUPPORTEOF

# ===== 11. src/app/api/support/route.ts =====
cat > src/app/api/support/route.ts << 'APISUPPORTEOF'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
export const bodySizeLimit = '10mb'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req as unknown as Request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const url = new URL(req.url)
  const targetUserId = url.searchParams.get('userId')
  const markRead = url.searchParams.get('markRead') === 'true'
  if (user.isAdmin && targetUserId) {
    const messages = await db.supportMessage.findMany({ where: { userId: targetUserId }, orderBy: { createdAt: 'asc' }, take: 500 })
    await db.supportMessage.updateMany({ where: { userId: targetUserId, sender: 'user', isRead: false }, data: { isRead: true } })
    return NextResponse.json({ messages })
  }
  if (user.isAdmin) {
    const all = await db.supportMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 1000, include: { user: { select: { id: true, name: true, email: true, userId: true } } } })
    const map = new Map<string, any>()
    for (const m of all) { if (!map.has(m.userId)) map.set(m.userId, { userId: m.userId, userName: m.user.name, userEmail: m.user.email, userDisplayId: m.user.userId, lastMessage: m.type === 'text' ? m.message : `[${m.type}]`, lastTime: m.createdAt, unreadCount: 0 }); if (m.sender === 'user' && !m.isRead) map.get(m.userId).unreadCount++ }
    return NextResponse.json({ conversations: Array.from(map.values()).sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()) })
  }
  const messages = await db.supportMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' }, take: 500 })
  if (markRead) await db.supportMessage.updateMany({ where: { userId: user.id, sender: 'admin', isRead: false }, data: { isRead: true } })
  const unreadCount = messages.filter(m => m.sender === 'admin' && !m.isRead).length
  return NextResponse.json({ messages, unreadCount })
}
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req as unknown as Request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { message, type, imageData, voiceData, videoData, userId: targetUserId } = await req.json()
  const msgType = type || 'text'
  if (msgType === 'text' && (!message || !message.trim())) return NextResponse.json({ error: 'Empty message' }, { status: 400 })
  if (user.isAdmin && targetUserId) {
    const msg = await db.supportMessage.create({ data: { userId: targetUserId, sender: 'admin', message: message?.trim() || '', type: msgType, imageData: imageData || null, voiceData: voiceData || null, videoData: videoData || null } })
    try { const { sendPushToUser } = await import('@/lib/push'); sendPushToUser(targetUserId, { title: '💬 Support Reply', body: msgType === 'text' ? (message?.trim() || 'New message') : `New ${msgType}`, url: '/', tag: 'support' }).catch(() => {}) } catch {}
    return NextResponse.json({ ok: true, message: msg })
  }
  const msg = await db.supportMessage.create({ data: { userId: user.id, sender: 'user', message: message?.trim() || '', type: msgType, imageData: imageData || null, voiceData: voiceData || null, videoData: videoData || null } })
  try { const m = await import('@/lib/admin-email-notifications'); m.notifyAdminSupportMessage(user.name, user.email, user.userId, msgType === 'text' ? message.trim() : `[${msgType}]`) } catch {}
  return NextResponse.json({ ok: true, message: msg })
}
APISUPPORTEOF

# ===== 12. src/app/api/push/subscribe/route.ts =====
cat > src/app/api/push/subscribe/route.ts << 'PUSHAPIEOF'
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
PUSHAPIEOF

# ===== 13. src/app/api/admin/transactions/action/route.ts =====
cat > src/app/api/admin/transactions/action/route.ts << 'TXACTIONEOF'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
export async function POST(req: NextRequest) {
  const { user: admin, error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })
  const { transactionId, action } = await req.json()
  if (!transactionId || !action) return NextResponse.json({ error: 'transactionId and action required' }, { status: 400 })
  const tx = await db.transaction.findUnique({ where: { id: transactionId }, include: { user: true } })
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tx.status !== 'PENDING') return NextResponse.json({ error: 'Not pending' }, { status: 400 })
  if (action === 'approve') {
    if (tx.type === 'DEPOSIT') {
      let wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: tx.userId, asset: tx.asset } } })
      if (!wallet) wallet = await db.wallet.create({ data: { userId: tx.userId, asset: tx.asset, assetName: tx.asset, balance: 0, available: 0, locked: 0, depositAddress: 'internal' } })
      await db.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: tx.amount }, available: { increment: tx.amount } } })
      await db.transaction.update({ where: { id: transactionId }, data: { status: 'COMPLETED', note: 'Approved by admin' } })
    } else if (tx.type === 'WITHDRAW') {
      await db.transaction.update({ where: { id: transactionId }, data: { status: 'COMPLETED', note: 'Approved by admin' } })
    } else if (tx.type === 'INTERNAL_TRANSFER') {
      const idMatch = tx.toAddress?.match(/user:(\d+)/)
      if (idMatch) {
        const recipient = await db.user.findUnique({ where: { userId: idMatch[1] } })
        if (recipient) {
          let rw = await db.wallet.findUnique({ where: { userId_asset: { userId: recipient.id, asset: tx.asset } } })
          if (!rw) rw = await db.wallet.create({ data: { userId: recipient.id, asset: tx.asset, assetName: tx.asset, balance: 0, available: 0, locked: 0, depositAddress: 'T' + Math.random().toString(36).slice(2, 34).toUpperCase() } })
          await db.wallet.update({ where: { id: rw.id }, data: { balance: { increment: tx.amount }, available: { increment: tx.amount } } })
          await db.transaction.create({ data: { userId: recipient.id, asset: tx.asset, type: 'INTERNAL_TRANSFER', amount: tx.amount, fee: 0, network: 'P2PEX', fromAddress: `user:${tx.user.userId} (${tx.user.name})`, note: `Transfer from ${tx.user.name} — approved`, status: 'COMPLETED', confirmations: 1, requiredConfirmations: 1 } })
        }
      }
      await db.transaction.update({ where: { id: transactionId }, data: { status: 'COMPLETED', note: 'Transfer approved' } })
    }
    try { await db.adminNotification.create({ data: { userId: tx.userId, title: `${tx.type === 'DEPOSIT' ? 'Deposit' : tx.type === 'WITHDRAW' ? 'Withdrawal' : 'Transfer'} Approved`, message: `Your ${tx.type.toLowerCase()} of ${tx.amount} ${tx.asset} has been approved.`, type: 'success', isRead: false } }) } catch {}
    return NextResponse.json({ ok: true, message: `${tx.type} approved` })
  }
  if (action === 'reject') {
    if (tx.type === 'WITHDRAW' || tx.type === 'INTERNAL_TRANSFER') {
      const refund = tx.amount + tx.fee
      const wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: tx.userId, asset: tx.asset } } })
      if (wallet) await db.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: refund }, available: { increment: refund } } })
    }
    await db.transaction.update({ where: { id: transactionId }, data: { status: 'REJECTED', note: 'Rejected by admin' } })
    try { await db.adminNotification.create({ data: { userId: tx.userId, title: `${tx.type} Rejected`, message: `Your ${tx.type.toLowerCase()} of ${tx.amount} ${tx.asset} was rejected.`, type: 'warning', isRead: false } }) } catch {}
    return NextResponse.json({ ok: true, message: `${tx.type} rejected` })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
TXACTIONEOF

# ===== 14. src/app/api/admin/users/details/route.ts =====
cat > src/app/api/admin/users/details/route.ts << 'USERDETAILSEOF'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
export async function GET(req: NextRequest) {
  const { error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, userId: true, username: true, email: true, name: true, kycVerified: true, kycLevel: true, kycStatus: true, kycFullName: true, kycDateOfBirth: true, kycNationality: true, kycIdType: true, kycIdNumber: true, kycAddress: true, kycDocumentFront: true, kycDocumentBack: true, kycSubmittedAt: true, kycReviewedAt: true, kycRejectionReason: true, isAdmin: true, isActive: true, isBanned: true, banReason: true, fiatCurrency: true, createdAt: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  const [wallets, transactions, p2pOrders, orders] = await Promise.all([
    db.wallet.findMany({ where: { userId }, orderBy: { asset: 'asc' } }),
    db.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.p2POrder.findMany({ where: { OR: [{ buyerId: userId }, { sellerId: userId }] }, orderBy: { createdAt: 'desc' }, take: 30, include: { listing: { select: { asset: true, fiatCurrency: true, side: true } } } }),
    db.order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
  ])
  return NextResponse.json({ user, wallets, transactions, p2pOrders, orders })
}
USERDETAILSEOF

# ===== 15. src/app/api/admin/listings/create/route.ts =====
cat > src/app/api/admin/listings/create/route.ts << 'CREATELISTINGEOF'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
export async function POST(req: NextRequest) {
  const { user: admin, error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })
  const { asset, fiatCurrency, side, price, amount, minOrder, maxOrder, paymentMethods, paymentDetails, terms } = await req.json()
  if (!asset || !fiatCurrency || !side || !price || !amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (!Array.isArray(paymentMethods) || paymentMethods.length === 0) return NextResponse.json({ error: 'Payment method required' }, { status: 400 })
  if (side === 'SELL') {
    let wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: admin.id, asset } } })
    if (!wallet || wallet.available < amount) {
      const credit = amount * 2
      if (wallet) await db.wallet.update({ where: { id: wallet.id }, data: { available: { increment: credit }, balance: { increment: credit } } })
      else wallet = await db.wallet.create({ data: { userId: admin.id, asset, assetName: asset, balance: credit, available: credit, locked: 0, depositAddress: 'internal-admin' } })
    }
    await db.wallet.update({ where: { id: wallet.id }, data: { available: { decrement: amount }, locked: { increment: amount } } })
  }
  const listing = await db.p2PListing.create({ data: { userId: admin.id, asset, fiatCurrency, side, price, amount, available: amount, minOrder: minOrder || 3, maxOrder: maxOrder || amount * price, paymentMethods: JSON.stringify(paymentMethods), paymentDetails: paymentDetails ? JSON.stringify(paymentDetails) : null, terms: terms || '', status: 'ACTIVE', tradesCount: 128, rating: 4.9 } })
  return NextResponse.json({ ok: true, listing })
}
CREATELISTINGEOF

echo "=== All missing files created! ==="
ls -la src/lib/push.ts src/lib/welcome-bonus.ts src/lib/p2p-notifications.ts src/lib/admin-email-notifications.ts src/lib/market-simulation.ts src/components/support-chat-dialog.tsx src/components/push-notification-provider.tsx src/components/signup-prompt.tsx src/hooks/use-push-notifications.ts src/app/api/support/route.ts src/app/api/push/subscribe/route.ts src/app/api/admin/transactions/action/route.ts src/app/api/admin/users/details/route.ts src/app/api/admin/listings/create/route.ts public/sw.js 2>&1
