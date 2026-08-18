'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users, Shield, Check, Clock, X, MessageCircle, Plus, Star,
  ArrowDownToLine, ArrowUpFromLine, AlertCircle, Banknote, CreditCard, BadgeCheck, Smartphone, Upload,
  CheckCircle2, XCircle,
  RefreshCw, Copy, Wallet, Bitcoin,
} from 'lucide-react'
import { formatPrice, formatQty, formatDateTime, formatCompact } from '@/lib/utils'
import { BackButton } from '@/components/back-button'
import { compressImageToBase64, formatFileSize } from '@/lib/image-compression'
import { SignupPrompt } from '@/components/signup-prompt'

interface Listing {
  id: string
  asset: string
  fiatCurrency: string
  side: 'BUY' | 'SELL'
  price: number
  amount: number
  available: number
  minOrder: number
  maxOrder: number
  paymentMethods: string[]
  paymentDetails?: Record<string, { phone?: string; name?: string; account?: string; email?: string; iban?: string; cashtag?: string; network?: string; address?: string }> | null
  terms?: string
  tradesCount?: number
  rating?: number
  status: string
  createdAt: string
  user: { name: string; kycVerified: boolean; kycLevel: number }
}

interface P2POrder {
  id: string
  asset: string
  fiatCurrency: string
  amount: number
  price: number
  total: number
  paymentMethod: string
  status: string
  myRole: 'BUYER' | 'SELLER'
  buyerName: string
  sellerName: string
  createdAt: string
  completedAt?: string | null
}

const PAYMENT_METHODS = [
  // Ethiopian payment methods
  'Telebirr', 'CBE', 'Awash Bank', 'Dashen Bank', 'Hibret Bank', 'Wegagen Bank',
  'Abay Bank', 'Coopbank', 'Bank Transfer (ETB)',
  // Global payment methods
  'Bank Transfer', 'Wise', 'PayPal', 'Cash App', 'SEPA', 'Alipay',
  'WeChat Pay', 'UPI', 'IMPS', 'PayNow', 'Zelle', 'Venmo',
]

// Map fiat currency to commonly-used payment methods (for filtering UI)
const FIAT_PAYMENT_METHODS: Record<string, string[]> = {
  ETB: ['Telebirr', 'CBE', 'Awash Bank', 'Dashen Bank', 'Hibret Bank', 'Wegagen Bank', 'Abay Bank', 'Coopbank', 'Bank Transfer (ETB)'],
  USD: ['Bank Transfer', 'Wise', 'PayPal', 'Cash App', 'Zelle', 'Venmo'],
  EUR: ['SEPA', 'Wise', 'PayPal', 'Bank Transfer'],
  GBP: ['Bank Transfer', 'Wise', 'PayPal'],
  CNY: ['Alipay', 'WeChat Pay', 'Bank Transfer'],
  JPY: ['Bank Transfer'],
  KRW: ['Bank Transfer'],
  INR: ['UPI', 'IMPS', 'Bank Transfer'],
  SGD: ['PayNow', 'Bank Transfer'],
  AUD: ['Bank Transfer', 'PayPal'],
  CAD: ['Bank Transfer', 'PayPal'],
}

const FIAT_CURRENCIES = ['ETB', 'USD', 'EUR', 'GBP', 'CNY', 'JPY', 'KRW', 'INR', 'SGD', 'AUD', 'CAD']
const CRYPTO_ASSETS = ['USDT', 'BTC', 'ETH', 'BNB', 'SOL']

export function P2PView() {
  const { user, setView } = useAppStore()
  const { toast } = useToast()
  const [listings, setListings] = useState<Listing[]>([])
  const [orders, setOrders] = useState<P2POrder[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'buy' | 'sell' | 'orders' | 'create'>('buy')
  const [filters, setFilters] = useState({ asset: 'USDT', fiat: 'ETB', paymentMethod: 'ALL' })
  const [tradeDialog, setTradeDialog] = useState<Listing | null>(null)
  const [orderDialog, setOrderDialog] = useState<P2POrder | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const [prevOrderStatuses, setPrevOrderStatuses] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      // Show cached listings immediately (instant load)
      const cacheKey = `p2p-listings-${filters.asset}-${filters.fiat}`
      const cached = sessionStorage.getItem(cacheKey)
      if (cached && listings.length === 0) {
        try {
          const cachedData = JSON.parse(cached)
          setListings(cachedData.listings || [])
          setLoading(false) // Stop loading immediately
        } catch {}
      }

      const [listRes, ordersRes] = await Promise.all([
        fetch(`/api/p2p/listings?asset=${filters.asset}&fiat=${filters.fiat}`),
        user ? fetch('/api/p2p/orders?role=all') : Promise.resolve(null),
      ])
      const listData = await listRes.json()
      setListings(listData.listings || [])
      // Cache the listings for instant load next time
      sessionStorage.setItem(cacheKey, JSON.stringify({ listings: listData.listings || [] }))
      if (ordersRes) {
        const ordersData = await ordersRes.json()
        const newOrders = ordersData.orders || []
        // Detect status changes and notify the user
        for (const o of newOrders) {
          const prevStatus = prevOrderStatuses[o.id]
          if (prevStatus && prevStatus !== o.status) {
            // Status changed — show notification
            if (o.status === 'PENDING_REVIEW' && prevStatus !== 'PENDING_REVIEW') {
              toast({
                title: '⏳ Order Under Review',
                description: o.myRole === 'SELLER'
                  ? `New order for ${o.amount} ${o.asset}. Verify you received the payment, then click "Payment Received".`
                  : `Your order for ${o.amount} ${o.asset} is pending. The seller needs to confirm payment received.`,
                duration: 8000,
              })
            } else if (o.status === 'PAYMENT_RECEIVED') {
              toast({
                title: '✅ Payment Confirmed by Seller',
                description: o.myRole === 'BUYER'
                  ? `The seller confirmed receiving your payment for ${o.amount} ${o.asset}. We are reviewing — please wait patiently.`
                  : `You confirmed payment for ${o.amount} ${o.asset}. We are reviewing — your ${o.asset} will be debited after approval.`,
                duration: 8000,
              })
            } else if (o.status === 'CANCELED' && o.myRole === 'BUYER') {
              toast({ title: '❌ Order Rejected', description: `Your order for ${o.amount} ${o.asset} was rejected. The order has been canceled.`, variant: 'destructive' })
            } else if (o.status === 'CANCELED' && o.myRole === 'SELLER') {
              toast({ title: '❌ Order Rejected', description: `Your order for ${o.amount} ${o.asset} was rejected. Your ${o.asset} has been returned to your wallet.`, variant: 'destructive' })
            } else if (o.status === 'COMPLETED' && o.myRole === 'BUYER') {
              toast({ title: '🎉 Order Completed!', description: `Your buy order for ${o.amount} ${o.asset} has been approved. The crypto has been credited to your wallet.`, duration: 8000 })
            } else if (o.status === 'COMPLETED' && o.myRole === 'SELLER') {
              toast({ title: '🎉 Order Completed!', description: `Your sell order for ${o.amount} ${o.asset} has been approved. The crypto has been debited from your wallet and sent to the buyer.`, duration: 8000 })
            }
          }
        }
        // Update previous statuses
        const newStatuses: Record<string, string> = {}
        for (const o of newOrders) newStatuses[o.id] = o.status
        setPrevOrderStatuses(newStatuses)
        setOrders(newOrders)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters.asset, filters.fiat, user, prevOrderStatuses, toast])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!user) return
    // Poll every 5 seconds for faster status updates
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [user, load])

  // Reset payment method filter when fiat changes
  useEffect(() => {
    setFilters(f => ({ ...f, paymentMethod: 'ALL' }))
  }, [filters.fiat])

  const buyListings = listings.filter(l => l.side === 'SELL') // user wants to BUY, so look for SELL listings
  const sellListings = listings.filter(l => l.side === 'BUY')

  // Apply payment method filter (matches listings that include the selected method)
  const filterByPayment = (list: Listing[]) => {
    if (filters.paymentMethod === 'ALL') return list
    return list.filter(l => l.paymentMethods.includes(filters.paymentMethod))
  }

  const displayed = tab === 'buy' ? filterByPayment(buyListings) : tab === 'sell' ? filterByPayment(sellListings) : []

  // Available payment methods for the selected fiat currency
  const availablePaymentMethods = FIAT_PAYMENT_METHODS[filters.fiat] || ['Bank Transfer']

  // Show signup prompt for non-authenticated users
  if (!user) {
    return (
      <SignupPrompt
        icon={<Users className="h-10 w-10" />}
        title="Sign in to P2P Marketplace"
        description="Log in or create an account to buy and sell USDT with Telebirr, CBE, and crypto networks. Get verified to receive a <strong class='text-primary'>10 USDT welcome bonus</strong>!"
        features={[
          { icon: <Smartphone className="h-5 w-5" />, label: 'Telebirr' },
          { icon: <CreditCard className="h-5 w-5" />, label: 'CBE' },
          { icon: <Bitcoin className="h-5 w-5" />, label: 'Crypto' },
        ]}
      />
    )
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 max-w-6xl w-full">
      <BackButton to="home" />

      <div className="flex items-center justify-between mb-4 mt-1">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            P2P Marketplace
          </h1>
          <p className="text-sm text-muted-foreground">Trade crypto directly with other users in your local currency</p>
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { load() }} className="gap-1.5 cursor-pointer hover:bg-primary/10">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            {user.isAdmin && (
              <Button onClick={() => setCreateOpen(true)} className="hidden sm:flex">
                <Plus className="h-4 w-4 mr-1.5" /> Post Ad
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-card rounded-lg border border-border">
        <div className="flex items-center gap-1">
          <Button
            variant={tab === 'buy' ? 'default' : 'outline'}
            size="sm"
            className={tab === 'buy' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
            onClick={() => setTab('buy')}
          >
            Buy
          </Button>
          <Button
            variant={tab === 'sell' ? 'default' : 'outline'}
            size="sm"
            className={tab === 'sell' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
            onClick={() => setTab('sell')}
          >
            Sell
          </Button>
          {user && (
            <Button
              variant={tab === 'orders' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTab('orders')}
            >
              My Orders ({orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELED').length})
            </Button>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={filters.asset} onValueChange={(v) => setFilters(f => ({ ...f, asset: v }))}>
            <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CRYPTO_ASSETS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.fiat} onValueChange={(v) => setFilters(f => ({ ...f, fiat: v }))}>
            <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FIAT_CURRENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.paymentMethod} onValueChange={(v) => setFilters(f => ({ ...f, paymentMethod: v }))}>
            <SelectTrigger className="w-32 h-8"><SelectValue placeholder="Payment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Methods</SelectItem>
              {availablePaymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Listings grid */}
      {tab === 'buy' || tab === 'sell' ? (
        loading && displayed.length === 0 ? (
          <div className="grid gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="h-2 w-32 bg-muted rounded" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 w-16 bg-muted rounded" />
                    <div className="h-2 w-12 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No {tab === 'buy' ? 'sellers' : 'buyers'} available for {filters.asset}/{filters.fiat}</p>
            {user?.isAdmin && (
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Post the first ad
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-2">
            {displayed.map(l => (
              <ListingCard key={l.id} listing={l} onTrade={() => setTradeDialog(l)} />
            ))}
          </div>
        )
      ) : null}

      {/* My Orders */}
      {tab === 'orders' && (
        <div className="space-y-2">
          {!user ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-3">Log in to view your orders</p>
              <Button onClick={() => setView('home')}>Back to Home</Button>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3" />
              <p>No P2P orders yet</p>
            </div>
          ) : (
            orders.map(o => <OrderCard key={o.id} order={o} onClick={() => setOrderDialog(o)} />)
          )}
        </div>
      )}

      {/* Trade dialog */}
      {tradeDialog && (
        <TradeDialog
          listing={tradeDialog}
          onClose={() => setTradeDialog(null)}
          onSuccess={() => { load(); setTab('orders') }}
        />
      )}

      {/* Order detail dialog */}
      {orderDialog && (
        <OrderDialog
          order={orderDialog}
          onClose={() => setOrderDialog(null)}
          onSuccess={() => { load(); setOrderDialog(null) }}
        />
      )}

      {/* Create listing dialog */}
      {createOpen && user && (
        <CreateListingDialog
          onClose={() => setCreateOpen(false)}
          onSuccess={() => { load(); setCreateOpen(false) }}
        />
      )}
    </div>
  )
}

function ListingCard({ listing, onTrade }: { listing: Listing; onTrade: () => void }) {
  const { user } = useAppStore()
  const isMine = user && listing.user.name === user.name
  const hasVerification = listing.user.kycVerified
  const kycLevel = listing.user.kycLevel || 0
  // Use real trades count and rating from the listing (set by admin)
  const tradesCount = listing.tradesCount || 0
  const rating = listing.rating || 4.9
  // Use advertiser name from payment details if available
  const firstMethod = listing.paymentMethods[0]
  const paymentDetail = listing.paymentDetails?.[firstMethod]
  const advertiserName = paymentDetail?.name || listing.user.name

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
        {/* Advertiser with verification status */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
            {advertiserName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-sm flex items-center gap-1">
              {advertiserName}
              {hasVerification && (
                <span
                  className={`inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded ${
                    kycLevel >= 2
                      ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                      : 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                  }`}
                  title={`KYC Level ${kycLevel} verified`}
                >
                  <BadgeCheck className="h-3 w-3" />
                  L{kycLevel}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {hasVerification ? (
                <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                  <Shield className="h-3 w-3" /> Verified
                </span>
              ) : (
                <span className="text-muted-foreground">Unverified</span>
              )}
              <span className="mx-1">·</span>
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              <span>{rating.toFixed(1)}</span>
              <span className="mx-1">·</span>
              <span>{tradesCount} trades</span>
            </div>
          </div>
        </div>

        {/* Price */}
        <div>
          <div className="text-xs text-muted-foreground">Price</div>
          <div className="font-bold tabular-nums">
            {formatPrice(listing.price)} {listing.fiatCurrency}
          </div>
        </div>

        {/* Limit */}
        <div className="hidden md:block">
          <div className="text-xs text-muted-foreground">Limit</div>
          <div className="text-sm tabular-nums">
            {formatPrice(listing.minOrder)} - {formatPrice(listing.maxOrder)}
          </div>
        </div>

        {/* Payment - show all methods with matched highlight */}
        <div className="hidden md:block">
          <div className="text-xs text-muted-foreground">Payment</div>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {listing.paymentMethods.slice(0, 3).map(m => (
              <Badge key={m} variant="secondary" className="text-[10px] py-0 px-1.5">{m}</Badge>
            ))}
            {listing.paymentMethods.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{listing.paymentMethods.length - 3}</span>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="flex justify-end">
          <Button
            variant={listing.side === 'SELL' ? 'default' : 'outline'}
            className={listing.side === 'SELL' ? 'bg-green-500 hover:bg-green-600 text-white' : 'border-red-500 text-red-500 hover:bg-red-500/10'}
            onClick={onTrade}
            disabled={!!isMine}
          >
            {listing.side === 'SELL' ? 'Buy' : 'Sell'} {listing.asset}
          </Button>
        </div>
      </div>

      {/* Available amount */}
      <div className="mt-2 pt-2 border-t border-border/40 text-xs text-muted-foreground flex justify-between">
        <span>Available: {formatQty(listing.available)} {listing.asset}</span>
        <span>Trade limit: {formatPrice(listing.minOrder)} - {formatPrice(listing.maxOrder)} {listing.fiatCurrency}</span>
      </div>
    </div>
  )
}

function TradeDialog({ listing, onClose, onSuccess }: {
  listing: Listing
  onClose: () => void
  onSuccess: () => void
}) {
  const { user, setView } = useAppStore()
  const { toast } = useToast()
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState(listing.paymentMethods[0])
  const [loading, setLoading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [paymentScreenshot, setPaymentScreenshot] = useState<{ data: string; name: string; size: number } | null>(null)
  const fileScreenshotRef = useRef<HTMLInputElement>(null)
  // Seller payment details (used when user is selling USDT — providing their own payment info to receive fiat)
  const [sellerPaymentMethod, setSellerPaymentMethod] = useState(listing.paymentMethods[0])
  const [sellerAccountNumber, setSellerAccountNumber] = useState('')
  const [sellerAccountName, setSellerAccountName] = useState('')

  // Available fiat payment methods for the listing's currency
  const sellerPaymentOptions = FIAT_PAYMENT_METHODS[listing.fiatCurrency] || listing.paymentMethods

  const amountNum = parseFloat(amount) || 0
  const fiatTotal = amountNum * listing.price
  const minCrypto = listing.minOrder / listing.price
  const maxCrypto = Math.min(listing.available, listing.maxOrder / listing.price)
  const isBuying = listing.side === 'SELL' // SELL listing means buyer is buying

  // Get the merchant name from paymentDetails (the name field of the first payment method)
  // Falls back to listing.user.name if not found
  const merchantName = (() => {
    try {
      const firstMethod = listing.paymentMethods[0]
      const details = listing.paymentDetails?.[firstMethod]
      if (details?.name) return details.name
    } catch {}
    return listing.user.name
  })()

  // Helper to render a payment detail field with a copy button
  const copyField = (label: string, value: string) => (
    <div className="flex items-center justify-between p-2 bg-card rounded-lg border border-blue-500/20">
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground block">{label}</span>
        <span className="font-mono font-bold text-foreground text-sm break-all">{value}</span>
      </div>
      <button
        onClick={() => { navigator.clipboard.writeText(value); toast({ title: 'Copied!', description: label + ' copied' }) }}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition flex-shrink-0 ml-2"
      >
        <Copy className="h-3 w-3" /> Copy
      </button>
    </div>
  )

  // Handle screenshot upload with compression
  const handleScreenshotUpload = async (file: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file', variant: 'destructive' })
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum 20MB', variant: 'destructive' })
      return
    }
    setCompressing(true)
    try {
      const compressed = await compressImageToBase64(file, {
        maxWidth: 1600, maxHeight: 1600, quality: 0.8, mimeType: 'image/jpeg',
      })
      const size = Math.round((compressed.length - 'data:image/jpeg;base64,'.length) * 0.75)
      setPaymentScreenshot({ data: compressed, name: file.name, size })
      toast({ title: 'Screenshot uploaded', description: `${formatFileSize(size)} · ready to submit` })
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' })
    } finally {
      setCompressing(false)
    }
  }

  const submit = async () => {
    if (!user) {
      toast({ title: 'Please log in first', variant: 'destructive' })
      setView('home')
      return
    }
    if (amountNum <= 0) {
      toast({ title: 'Enter valid amount', variant: 'destructive' })
      return
    }
    if (amountNum < minCrypto) {
      toast({ title: `Minimum is ${formatQty(minCrypto)} ${listing.asset}`, variant: 'destructive' })
      return
    }
    if (amountNum > maxCrypto) {
      toast({ title: `Maximum is ${formatQty(maxCrypto)} ${listing.asset}`, variant: 'destructive' })
      return
    }
    // Require payment screenshot for buy orders
    if (isBuying && !paymentScreenshot) {
      toast({ title: 'Payment screenshot required', description: 'Upload proof of payment before placing the order', variant: 'destructive' })
      return
    }
    // Require seller payment details for sell orders (so the buyer knows where to send fiat)
    if (!isBuying) {
      if (!sellerAccountNumber.trim()) {
        toast({ title: 'Account number required', description: 'Enter the account number / phone where you want to receive payment', variant: 'destructive' })
        return
      }
      if (!sellerAccountName.trim()) {
        toast({ title: 'Account holder name required', description: 'Enter the name on the receiving account', variant: 'destructive' })
        return
      }
    }
    setLoading(true)
    try {
      const res = await fetch('/api/p2p/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          amount: amountNum,
          paymentMethod,
          paymentScreenshot: paymentScreenshot?.data,
          // Include seller payment details when the user is selling (providing their own receiving account info)
          ...( !isBuying ? {
              sellerPaymentMethod,
              sellerAccountNumber: sellerAccountNumber.trim(),
              sellerAccountName: sellerAccountName.trim(),
            } : {}
          ),
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast({
        title: '⏳ Order submitted — Under Review',
        description: isBuying
          ? `Your payment proof has been submitted for review. Please wait patiently — you'll be notified once your ${listing.asset} is credited.`
          : `Your sell order has been submitted for review. Please wait patiently — you'll be notified once the order is finished.`,
        duration: 8000,
      })
      onSuccess()
    } catch (e: any) {
      toast({ title: 'Order failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {listing.side === 'SELL' ? `Buy ${listing.asset} from ${merchantName}` : `Sell ${listing.asset} for ${merchantName}`}
          </DialogTitle>
          <DialogDescription>
            {listing.side === 'SELL' ? 'You are buying' : 'You are selling'} {listing.asset} for {listing.fiatCurrency}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Prominent warning — transaction not complete until admin confirms */}
          {!isBuying && (
            <div className="bg-orange-500/10 border-2 border-orange-500/40 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-orange-600 dark:text-orange-400 mb-1">
                    ⚠ Transaction Not Complete Until Verified
                  </p>
                  <p className="text-muted-foreground">
                    After the buyer pays, click "Payment Received". We will then review and approve. Your {listing.asset} will <strong className="text-orange-600 dark:text-orange-400">only</strong> be debited after verification.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Price info */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="font-medium tabular-nums">{formatPrice(listing.price)} {listing.fiatCurrency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available</span>
              <span className="tabular-nums">{formatQty(listing.available)} {listing.asset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trade Limit</span>
              <span className="tabular-nums">{formatPrice(listing.minOrder)} - {formatPrice(listing.maxOrder)} {listing.fiatCurrency}</span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Amount ({listing.asset})</label>
              <div className="text-xs text-muted-foreground">
                Min: {formatQty(minCrypto)}, Max: {formatQty(maxCrypto)}
              </div>
            </div>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="tabular-nums"
            />
          </div>

          {/* Total */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Total ({listing.fiatCurrency})</label>
            <Input
              type="text"
              value={formatPrice(fiatTotal)}
              readOnly
              className="tabular-nums bg-muted/30"
            />
          </div>

          {/* Payment method + payment details — ONLY for buy interface (user buying USDT) */}
          {isBuying && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {listing.paymentMethods.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment instructions — show the seller's payment details for the selected method */}
              {listing.paymentDetails && listing.paymentDetails[paymentMethod] && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Smartphone className="h-3 w-3" />
                    Send Payment To:
                  </p>
                  <div className="space-y-1.5">
                    {(() => {
                      const details = listing.paymentDetails[paymentMethod]
                      const isCryptoMethod = ['TRC20', 'BEP20', 'ERC20', 'SOL', 'MATIC', 'ARB', 'OP', 'AVAX', 'BNB'].includes(paymentMethod)
                      const isTelebirr = paymentMethod === 'Telebirr'
                      // Get the single value to display (prefer the correct field, fall back to the other)
                      const fieldValue = isCryptoMethod
                        ? (details.address || '')
                        : (isTelebirr ? (details.phone || details.account || '') : (details.account || details.phone || ''))
                      const fieldLabel = isCryptoMethod ? 'Address' : (isTelebirr ? 'Phone Number' : 'Account Number')
                      return (
                        <>
                          {details.network && copyField('Network', details.network)}
                          {isCryptoMethod && fieldValue && copyField(fieldLabel, fieldValue)}
                          {!isCryptoMethod && fieldValue && copyField(fieldLabel, fieldValue)}
                          {details.email && copyField('Email', details.email)}
                          {details.iban && copyField('IBAN', details.iban)}
                          {details.cashtag && copyField('Cashtag', details.cashtag)}
                          {copyField(`Total (${listing.fiatCurrency})`, formatPrice(fiatTotal))}
                          {/* Account holder name — visible but NOT copyable */}
                          {details.name && (
                            <div className="flex items-center justify-between p-2 bg-card rounded-lg border border-blue-500/10">
                              <div className="flex-1 min-w-0">
                                <span className="text-xs text-muted-foreground block">Account Holder Name</span>
                                <span className="font-bold text-foreground text-sm">{details.name}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground pt-1 border-t border-blue-500/20">
                    Send exactly the amount shown above via {paymentMethod}.
                  </div>
                </div>
              )}
            </>
          )}

          {/* Seller payment details form — when user is selling USDT (providing their receiving account) */}
          {!isBuying && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                <Wallet className="h-3 w-3" /> Your Payment Details
              </p>
              <p className="text-xs text-muted-foreground">
                Provide the account where you want to receive <strong className="text-green-600 dark:text-green-400">{formatPrice(fiatTotal)} {listing.fiatCurrency}</strong>.
              </p>
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
                  <Select value={sellerPaymentMethod} onValueChange={setSellerPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sellerPaymentOptions.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Account Number / Phone Number</label>
                  <Input
                    type="text"
                    value={sellerAccountNumber}
                    onChange={e => setSellerAccountNumber(e.target.value)}
                    placeholder="e.g. 09xxxxxxxx"
                    className="tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Account Holder Name</label>
                  <Input
                    type="text"
                    value={sellerAccountName}
                    onChange={e => setSellerAccountName(e.target.value)}
                    placeholder="Full name on the account"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment screenshot upload — required for buy orders */}
          {isBuying && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Upload className="h-3 w-3" /> Payment Screenshot (required)
                <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Upload a screenshot of your payment confirmation. This will be sent for verification before the order is placed.
              </p>
              <input
                ref={fileScreenshotRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleScreenshotUpload(e.target.files[0]) }}
              />
              {paymentScreenshot ? (
                <div className="relative border-2 border-green-500/50 rounded-lg overflow-hidden">
                  <img src={paymentScreenshot.data} alt="Payment proof" className="w-full h-32 object-cover" />
                  <button
                    onClick={() => setPaymentScreenshot(null)}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] px-2 py-0.5">
                    {paymentScreenshot.name} · {formatFileSize(paymentScreenshot.size)}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileScreenshotRef.current?.click()}
                  disabled={compressing}
                  className="w-full h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center hover:border-primary/50 transition disabled:opacity-50"
                >
                  {compressing ? (
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                      <span className="text-xs font-medium">Upload Payment Screenshot</span>
                      <span className="text-xs text-muted-foreground">JPG/PNG · auto-compressed</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className={listing.side === 'SELL' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}
              onClick={submit}
              disabled={loading || !amount || (isBuying ? !paymentScreenshot : !sellerAccountNumber || !sellerAccountName)}
            >
              {loading ? 'Submitting...' : isBuying ? (paymentScreenshot ? 'Submit' : 'Upload Payment Proof') : `Sell ${listing.asset}`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function OrderCard({ order, onClick }: { order: P2POrder; onClick: () => void }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const statusMap: Record<string, { color: string; icon: any; label: string }> = {
    PENDING_REVIEW: { color: 'text-blue-500 bg-blue-500/10', icon: Clock, label: 'Pending Seller Confirmation' },
    PAYMENT_RECEIVED: { color: 'text-green-500 bg-green-500/10', icon: Check, label: 'Payment Confirmed — Under Review' },
    PENDING_PAYMENT: { color: 'text-yellow-500 bg-yellow-500/10', icon: Clock, label: 'Pending Payment' },
    PAID: { color: 'text-blue-500 bg-blue-500/10', icon: Check, label: 'Under Review' },
    COMPLETED: { color: 'text-green-500 bg-green-500/10', icon: Check, label: 'Completed' },
    CANCELED: { color: 'text-red-500 bg-red-500/10', icon: X, label: 'Canceled' },
    DISPUTED: { color: 'text-orange-500 bg-orange-500/10', icon: AlertCircle, label: 'Disputed' },
  }
  const cfg = statusMap[order.status] || statusMap.PENDING_PAYMENT
  const Icon = cfg.icon

  // Show "Payment Received" button when seller needs to confirm payment
  const showPaymentButton = order.status === 'PENDING_REVIEW' && order.myRole === 'SELLER'

  const quickConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation() // Don't open the dialog
    setLoading(true)
    try {
      const res = await fetch('/api/p2p/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, action: 'payment_received' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast({
        title: '✅ Payment Confirmed',
        description: `We have been notified. Your ${order.asset} will be released after verification.`,
        duration: 8000,
      })
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="bg-card border border-border rounded-lg p-3 hover:bg-muted/30 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${order.myRole === 'BUYER' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {order.myRole === 'BUYER' ? <ArrowDownToLine className="h-5 w-5" /> : <ArrowUpFromLine className="h-5 w-5" />}
          </div>
          <div>
            <div className="font-medium text-sm">
              {order.myRole === 'BUYER' ? 'Buying' : 'Selling'} {formatQty(order.amount)} {order.asset}
            </div>
            <div className="text-xs text-muted-foreground">
              with {order.myRole === 'BUYER' ? order.sellerName : order.buyerName} · {order.paymentMethod}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold tabular-nums">{formatPrice(order.total)} {order.fiatCurrency}</div>
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${cfg.color}`}>
            <Icon className="h-3 w-3" />
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Quick action button for sellers — visible directly in the order card */}
      {showPaymentButton && (
        <div className="mt-2 pt-2 border-t border-border/40">
          <Button
            className="w-full bg-green-500 hover:bg-green-600 text-white"
            onClick={quickConfirm}
            disabled={loading}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            {loading ? 'Confirming...' : 'Payment Received — Confirm'}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            Tap to confirm you received the payment · or tap the order for details
          </p>
        </div>
      )}
    </div>
  )
}

function OrderDialog({ order, onClose, onSuccess }: {
  order: P2POrder
  onClose: () => void
  onSuccess: () => void
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const action = async (a: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/p2p/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, action: a }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast({
        title: 'Action completed',
        description: `Order status: ${data.status}`,
      })
      onSuccess()
    } catch (e: any) {
      toast({ title: 'Action failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const statusMap: Record<string, { color: string; label: string }> = {
    PENDING_REVIEW: { color: 'text-blue-500 bg-blue-500/10', label: 'Pending Seller Confirmation' },
    PAYMENT_RECEIVED: { color: 'text-green-500 bg-green-500/10', label: 'Payment Confirmed — Under Review' },
    PENDING_PAYMENT: { color: 'text-yellow-500 bg-yellow-500/10', label: 'Pending Payment' },
    PAID: { color: 'text-blue-500 bg-blue-500/10', label: 'Under Review' },
    COMPLETED: { color: 'text-green-500 bg-green-500/10', label: 'Completed' },
    CANCELED: { color: 'text-red-500 bg-red-500/10', label: 'Canceled' },
    DISPUTED: { color: 'text-orange-500 bg-orange-500/10', label: 'Disputed' },
  }
  const cfg = statusMap[order.status] || statusMap.PENDING_PAYMENT

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>P2P Order #{order.id.slice(-8).toUpperCase()}</DialogTitle>
          <DialogDescription>
            {order.myRole === 'BUYER' ? 'You are buying' : 'You are selling'} {order.asset} for {order.fiatCurrency}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Status */}
          <div className={`text-center py-3 rounded-lg ${cfg.color}`}>
            <p className="font-medium">{cfg.label}</p>
          </div>

          {/* Order details */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Counterparty</span>
              <span className="font-medium">{order.myRole === 'BUYER' ? order.sellerName : order.buyerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Asset</span>
              <span className="tabular-nums">{formatQty(order.amount)} {order.asset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="tabular-nums">{formatPrice(order.price)} {order.fiatCurrency}</span>
            </div>
            <div className="flex justify-between font-medium pt-1 border-t border-border">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(order.total)} {order.fiatCurrency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Method</span>
              <span>{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="text-xs">{formatDateTime(order.createdAt)}</span>
            </div>
          </div>

          {/* Action buttons based on role + status */}
          {order.status === 'PENDING_REVIEW' && order.myRole === 'SELLER' && (
            <div className="space-y-3">
              {/* Prominent warning */}
              <div className="bg-orange-500/10 border-2 border-orange-500/40 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-orange-600 dark:text-orange-400 mb-1">
                      ⚠ Transaction Not Complete
                    </p>
                    <p className="text-muted-foreground">
                      The buyer claims to have sent the payment. Verify that you received the funds in your account before clicking "Payment Received".
                    </p>
                    <p className="mt-1.5 font-medium text-orange-600 dark:text-orange-400">
                      Your {order.asset} will NOT be released until verified.
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Received button */}
              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={() => action('payment_received')}
                disabled={loading}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Payment Received — Confirm
              </Button>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  After you click "Payment Received", we will review and approve the transaction. Only then will {order.amount} {order.asset} be debited from your wallet.
                </p>
              </div>

              <Button variant="outline" className="w-full" onClick={() => action('cancel')} disabled={loading}>
                Cancel Order
              </Button>
            </div>
          )}

          {order.status === 'PENDING_REVIEW' && order.myRole === 'BUYER' && (
            <div className="space-y-3">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="h-8 w-8 text-blue-500 animate-pulse" />
                </div>
                <p className="text-sm font-medium">Waiting for Seller Confirmation</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your payment screenshot has been sent. The seller needs to confirm they received your payment. Once confirmed, we will review and release {order.amount} {order.asset} to your wallet.
                </p>
                <div className="mt-2 pt-2 border-t border-blue-500/20 text-[10px] text-muted-foreground space-y-1">
                  <div className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <Clock className="h-3 w-3" />
                    Please wait patiently — this may take a few minutes
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => action('cancel')} disabled={loading}>
                Cancel Order
              </Button>
            </div>
          )}

          {order.status === 'PAYMENT_RECEIVED' && (
            <div className="space-y-3">
              <div className="bg-green-500/10 border-2 border-green-500/40 rounded-lg p-3 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Payment Confirmed — Under Review Approval
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {order.myRole === 'SELLER'
                    ? `You confirmed receiving the payment. We are now reviewing this transaction. Once approved, ${order.amount} ${order.asset} will be debited from your wallet and sent to the buyer.`
                    : `The seller confirmed receiving your payment. We are now reviewing this transaction. Once approved, ${order.amount} ${order.asset} will be credited to your wallet.`
                  }
                </p>
                <div className="mt-2 pt-2 border-t border-green-500/20 text-[10px] text-muted-foreground">
                  <div className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <Clock className="h-3 w-3" />
                    Please wait patiently for verification
                  </div>
                </div>
              </div>
            </div>
          )}

          {order.status === 'PENDING_PAYMENT' && order.myRole === 'BUYER' && (
            <div className="space-y-3">
              {/* Payment instructions */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Payment Instructions
                </p>
                <p className="text-xs text-muted-foreground">
                  Send <strong className="text-blue-600 dark:text-blue-400">{formatPrice(order.total)} {order.fiatCurrency}</strong> to the seller via {order.paymentMethod}.
                </p>
                <div className="bg-card rounded p-2 space-y-1 text-sm border border-blue-500/20">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="font-medium">{order.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount to Send:</span>
                    <span className="font-bold tabular-nums text-blue-600 dark:text-blue-400">{formatPrice(order.total)} {order.fiatCurrency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Send To (Seller):</span>
                    <span className="font-medium">{order.sellerName}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  After sending the payment, click "I've Paid" below. The order will then be sent for verification.
                </p>
              </div>
              <Button className="w-full bg-green-500 hover:bg-green-600 text-white" onClick={() => action('mark_paid')} disabled={loading}>
                <Check className="h-4 w-4 mr-1.5" /> I've Paid
              </Button>
              <Button variant="outline" className="w-full" onClick={() => action('cancel')} disabled={loading}>
                Cancel Order
              </Button>
            </div>
          )}

          {order.status === 'PAID' && order.myRole === 'SELLER' && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
              <Clock className="h-8 w-8 mx-auto text-blue-500 mb-2 animate-pulse" />
              <p className="text-sm font-medium">Under review</p>
              <p className="text-xs text-muted-foreground mt-1">
                The buyer's payment is being verified. Once approved, the {order.asset} will be transferred automatically.
              </p>
            </div>
          )}

          {order.status === 'PENDING_PAYMENT' && order.myRole === 'SELLER' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Waiting for the buyer to send payment. Once they mark as paid, you can release the {order.asset}.
              </p>
              <Button variant="outline" className="w-full" onClick={() => action('cancel')} disabled={loading}>
                Cancel Order
              </Button>
            </div>
          )}

          {order.status === 'PAID' && order.myRole === 'BUYER' && (
            <p className="text-xs text-muted-foreground text-center py-3">
              <Clock className="h-5 w-5 inline mr-1" />
              Waiting for seller to release {order.asset}...
            </p>
          )}

          {(order.status === 'COMPLETED') && (
            <div className="space-y-3">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-sm font-medium">Trade Completed</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This trade has been completed successfully.
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
            </div>
          )}

          {order.status === 'CANCELED' && (
            <div className="space-y-3">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                <XCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                <p className="text-sm font-medium">{order.myRole === 'BUYER' ? 'Payment Rejected' : 'Order Canceled'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {order.myRole === 'BUYER'
                    ? `Your payment was rejected. You can place a new order.`
                    : `This order has been canceled.`}
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
            </div>
          )}

          <Button variant="ghost" className="w-full" disabled>
            <MessageCircle className="h-4 w-4 mr-1.5" /> Chat with counterparty
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CreateListingDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast()
  const [side, setSide] = useState<'BUY' | 'SELL'>('SELL')
  const [asset, setAsset] = useState('USDT')
  const [fiat, setFiat] = useState('ETB')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [minOrder, setMinOrder] = useState('100')
  const [maxOrder, setMaxOrder] = useState('10000')
  const [methods, setMethods] = useState<string[]>(['Telebirr'])
  const [terms, setTerms] = useState('')
  const [loading, setLoading] = useState(false)

  // Payment methods available for the selected fiat currency
  const availableMethods = FIAT_PAYMENT_METHODS[fiat] || ['Bank Transfer']

  // When fiat changes, reset selected methods to ones available for that currency
  useEffect(() => {
    setMethods(prev => {
      const filtered = prev.filter(m => availableMethods.includes(m))
      return filtered.length > 0 ? filtered : [availableMethods[0]]
    })
  }, [fiat])

  const toggleMethod = (m: string) => {
    setMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  const submit = async () => {
    if (!price || !amount) {
      toast({ title: 'Price and amount required', variant: 'destructive' })
      return
    }
    if (methods.length === 0) {
      toast({ title: 'Select at least one payment method', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/p2p/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset, fiatCurrency: fiat, side,
          price: parseFloat(price),
          amount: parseFloat(amount),
          minOrder: parseFloat(minOrder),
          maxOrder: parseFloat(maxOrder),
          paymentMethods: methods,
          terms,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast({ title: 'Listing posted!', description: `Your ${side} ad for ${amount} ${asset} is now live.` })
      onSuccess()
    } catch (e: any) {
      toast({ title: 'Failed to post listing', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post P2P Advertisement</DialogTitle>
          <DialogDescription>Create a buy/sell ad for other users to trade with</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Buy/Sell toggle */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={side === 'BUY' ? 'default' : 'outline'}
              className={side === 'BUY' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
              onClick={() => setSide('BUY')}
            >
              I want to Buy
            </Button>
            <Button
              variant={side === 'SELL' ? 'default' : 'outline'}
              className={side === 'SELL' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
              onClick={() => setSide('SELL')}
            >
              I want to Sell
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Asset</label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CRYPTO_ASSETS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Fiat Currency</label>
              <Select value={fiat} onValueChange={setFiat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIAT_CURRENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Price per {asset} ({fiat})</label>
              <Input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0.00"
                className="tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Total Amount ({asset})</label>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Min Order ({fiat})</label>
              <Input type="number" value={minOrder} onChange={e => setMinOrder(e.target.value)} className="tabular-nums" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Max Order ({fiat})</label>
              <Input type="number" value={maxOrder} onChange={e => setMaxOrder(e.target.value)} className="tabular-nums" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Payment Methods <span className="text-muted-foreground/60">(available for {fiat})</span>
            </label>
            <div className="flex flex-wrap gap-1 mt-1">
              {availableMethods.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMethod(m)}
                  className={`text-xs px-2 py-1 rounded border transition ${
                    methods.includes(m)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Terms (optional)</label>
            <Textarea
              value={terms}
              onChange={e => setTerms(e.target.value)}
              placeholder="e.g. Release within 15 minutes. SEPA transfers only."
              className="text-sm"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
              onClick={submit}
              disabled={loading}
            >
              {loading ? 'Posting...' : 'Post Advertisement'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
