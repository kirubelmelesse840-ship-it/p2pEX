'use client'

import { useState, useEffect, useCallback } from 'react'
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
  ArrowDownToLine, ArrowUpFromLine, AlertCircle, Banknote, CreditCard,
} from 'lucide-react'
import { formatPrice, formatQty, formatDateTime, formatCompact } from '@/lib/utils'

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
  terms?: string
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
  'Bank Transfer', 'Wise', 'PayPal', 'Cash App', 'SEPA', 'Alipay',
  'WeChat Pay', 'UPI', 'IMPS', 'PayNow', 'Zelle', 'Venmo',
]

const FIAT_CURRENCIES = ['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'KRW', 'INR', 'SGD', 'AUD', 'CAD']
const CRYPTO_ASSETS = ['USDT', 'BTC', 'ETH', 'BNB', 'SOL']

export function P2PView() {
  const { user, setView } = useAppStore()
  const { toast } = useToast()
  const [listings, setListings] = useState<Listing[]>([])
  const [orders, setOrders] = useState<P2POrder[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'buy' | 'sell' | 'orders' | 'create'>('buy')
  const [filters, setFilters] = useState({ asset: 'USDT', fiat: 'USD' })
  const [tradeDialog, setTradeDialog] = useState<Listing | null>(null)
  const [orderDialog, setOrderDialog] = useState<P2POrder | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const [listRes, ordersRes] = await Promise.all([
        fetch(`/api/p2p/listings?asset=${filters.asset}&fiat=${filters.fiat}`),
        user ? fetch('/api/p2p/orders?role=all') : Promise.resolve(null),
      ])
      const listData = await listRes.json()
      setListings(listData.listings || [])
      if (ordersRes) {
        const ordersData = await ordersRes.json()
        setOrders(ordersData.orders || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters, user])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!user) return
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [user, load])

  const buyListings = listings.filter(l => l.side === 'SELL') // user wants to BUY, so look for SELL listings
  const sellListings = listings.filter(l => l.side === 'BUY')

  const displayed = tab === 'buy' ? buyListings : tab === 'sell' ? sellListings : []

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            P2P Marketplace
          </h1>
          <p className="text-sm text-muted-foreground">Trade crypto directly with other users in your local currency</p>
        </div>
        {user && (
          <Button onClick={() => setCreateOpen(true)} className="hidden sm:flex">
            <Plus className="h-4 w-4 mr-1.5" /> Post Ad
          </Button>
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

        <div className="ml-auto flex items-center gap-2">
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
        </div>
      </div>

      {/* Listings grid */}
      {tab === 'buy' || tab === 'sell' ? (
        loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading listings...</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No {tab === 'buy' ? 'sellers' : 'buyers'} available for {filters.asset}/{filters.fiat}</p>
            {user && (
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

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
        {/* Advertiser */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
            {listing.user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-sm">{listing.user.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-0.5">
              {listing.user.kycVerified && <Shield className="h-3 w-3 text-green-500" />}
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              <span>4.9</span>
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

        {/* Payment */}
        <div className="hidden md:block">
          <div className="text-xs text-muted-foreground">Payment</div>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {listing.paymentMethods.slice(0, 2).map(m => (
              <Badge key={m} variant="secondary" className="text-[10px] py-0 px-1.5">{m}</Badge>
            ))}
            {listing.paymentMethods.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{listing.paymentMethods.length - 2}</span>
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

  const amountNum = parseFloat(amount) || 0
  const fiatTotal = amountNum * listing.price
  const minCrypto = listing.minOrder / listing.price
  const maxCrypto = Math.min(listing.available, listing.maxOrder / listing.price)

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
    setLoading(true)
    try {
      const res = await fetch('/api/p2p/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          amount: amountNum,
          paymentMethod,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast({
        title: 'Order created',
        description: `${listing.side === 'SELL' ? 'Buying' : 'Selling'} ${amountNum} ${listing.asset} for ${formatPrice(fiatTotal)} ${listing.fiatCurrency}`,
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
            {listing.side === 'SELL' ? 'Buy' : 'Sell'} {listing.asset} from {listing.user.name}
          </DialogTitle>
          <DialogDescription>
            {listing.side === 'SELL' ? 'You are buying' : 'You are selling'} {listing.asset} for {listing.fiatCurrency}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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

          {/* Payment method */}
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

          {/* Terms */}
          {listing.terms && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-xs">
              <p className="font-medium text-yellow-700 dark:text-yellow-500 mb-0.5">Seller's Terms:</p>
              <p className="text-muted-foreground">{listing.terms}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className={listing.side === 'SELL' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}
              onClick={submit}
              disabled={loading || !amount}
            >
              {loading ? 'Creating...' : `${listing.side === 'SELL' ? 'Buy' : 'Sell'} ${listing.asset}`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function OrderCard({ order, onClick }: { order: P2POrder; onClick: () => void }) {
  const statusMap: Record<string, { color: string; icon: any; label: string }> = {
    PENDING_PAYMENT: { color: 'text-yellow-500 bg-yellow-500/10', icon: Clock, label: 'Pending Payment' },
    PAID: { color: 'text-blue-500 bg-blue-500/10', icon: Check, label: 'Paid - Awaiting Release' },
    COMPLETED: { color: 'text-green-500 bg-green-500/10', icon: Check, label: 'Completed' },
    CANCELED: { color: 'text-red-500 bg-red-500/10', icon: X, label: 'Canceled' },
    DISPUTED: { color: 'text-orange-500 bg-orange-500/10', icon: AlertCircle, label: 'Disputed' },
  }
  const cfg = statusMap[order.status] || statusMap.PENDING_PAYMENT
  const Icon = cfg.icon

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
    PENDING_PAYMENT: { color: 'text-yellow-500 bg-yellow-500/10', label: 'Pending Payment' },
    PAID: { color: 'text-blue-500 bg-blue-500/10', label: 'Paid - Awaiting Release' },
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
          {order.status === 'PENDING_PAYMENT' && order.myRole === 'BUYER' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Send <strong>{formatPrice(order.total)} {order.fiatCurrency}</strong> to the seller via {order.paymentMethod}.
                After sending, click "I've Paid" to notify the seller.
              </p>
              <Button className="w-full bg-green-500 hover:bg-green-600 text-white" onClick={() => action('mark_paid')} disabled={loading}>
                <Check className="h-4 w-4 mr-1.5" /> I've Paid
              </Button>
              <Button variant="outline" className="w-full" onClick={() => action('cancel')} disabled={loading}>
                Cancel Order
              </Button>
            </div>
          )}

          {order.status === 'PAID' && order.myRole === 'SELLER' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                The buyer has marked this order as paid. Verify the payment in your account, then release the {order.asset}.
              </p>
              <Button className="w-full bg-green-500 hover:bg-green-600 text-white" onClick={() => action('release')} disabled={loading}>
                <Check className="h-4 w-4 mr-1.5" /> Release {order.asset}
              </Button>
              <Button variant="outline" className="w-full text-orange-500" onClick={() => action('dispute')} disabled={loading}>
                <AlertCircle className="h-4 w-4 mr-1.5" /> Report Issue
              </Button>
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

          {(order.status === 'COMPLETED' || order.status === 'CANCELED') && (
            <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
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
  const [fiat, setFiat] = useState('USD')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [minOrder, setMinOrder] = useState('100')
  const [maxOrder, setMaxOrder] = useState('10000')
  const [methods, setMethods] = useState<string[]>(['Bank Transfer'])
  const [terms, setTerms] = useState('')
  const [loading, setLoading] = useState(false)

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
            <label className="text-xs font-medium text-muted-foreground">Payment Methods</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {PAYMENT_METHODS.map(m => (
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
