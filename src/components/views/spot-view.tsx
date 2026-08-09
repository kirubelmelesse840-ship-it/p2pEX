'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useMarketSocket, MarketTrade } from '@/lib/use-market'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { RealTimeLineChart } from '@/components/realtime-chart'
import { DepthChart } from '@/components/depth-chart'
import { BackButton } from '@/components/back-button'
import { formatPrice, formatQty, formatPercent, formatCompact, formatTime, formatDateTime } from '@/lib/utils'
import { Star, ArrowUp, ArrowDown, ChevronDown, X, Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react'

// Local order book component (live from socket)
function OrderBook({ symbol }: { symbol: string }) {
  const { orderBook, ticker } = useMarketSocket(symbol)
  const [showDepth, setShowDepth] = useState(false)

  const maxBidQty = useMemo(() => Math.max(...orderBook.bids.map(b => b[1]), 0), [orderBook.bids])
  const maxAskQty = useMemo(() => Math.max(...orderBook.asks.map(a => a[1]), 0), [orderBook.asks])
  const maxQty = Math.max(maxBidQty, maxAskQty, 1)

  const isUp = (ticker?.changePercent ?? 0) >= 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium">Order Book</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2"
          onClick={() => setShowDepth(!showDepth)}
        >
          {showDepth ? 'List' : 'Depth'}
        </Button>
      </div>

      {showDepth ? (
        <div className="p-2">
          <DepthChart
            bids={orderBook.bids}
            asks={orderBook.asks}
            lastPrice={ticker?.lastPrice}
            height={280}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col text-xs overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-3 gap-2 px-3 py-1.5 text-muted-foreground border-b border-border">
            <span className="text-left">Price</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Total</span>
          </div>

          {/* Asks (reversed: highest at top, lowest at bottom near spread) */}
          <div className="flex-1 overflow-y-auto min-h-0 max-h-[180px]">
            {[...orderBook.asks].slice(0, 12).reverse().map(([price, qty], i) => (
              <div
                key={`a-${i}`}
                className="grid grid-cols-3 gap-2 px-3 py-0.5 tabular-nums relative hover:bg-muted/30"
              >
                <div
                  className="absolute right-0 top-0 bottom-0 bg-red-500/10"
                  style={{ width: `${(qty / maxQty) * 100}%` }}
                />
                <span className="text-red-500 relative z-10">{formatPrice(price)}</span>
                <span className="text-right relative z-10">{formatQty(qty)}</span>
                <span className="text-right text-muted-foreground relative z-10">{formatQty(price * qty)}</span>
              </div>
            ))}
          </div>

          {/* Spread / Last price */}
          <div className="border-y border-border px-3 py-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className={`text-base font-bold ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                {formatPrice(ticker?.lastPrice ?? 0)}
              </span>
              <span className="text-xs text-muted-foreground">
                {isUp ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />}
                {formatPercent(ticker?.changePercent ?? 0)}
              </span>
            </div>
          </div>

          {/* Bids */}
          <div className="flex-1 overflow-y-auto min-h-0 max-h-[180px]">
            {orderBook.bids.slice(0, 12).map(([price, qty], i) => (
              <div
                key={`b-${i}`}
                className="grid grid-cols-3 gap-2 px-3 py-0.5 tabular-nums relative hover:bg-muted/30"
              >
                <div
                  className="absolute right-0 top-0 bottom-0 bg-green-500/10"
                  style={{ width: `${(qty / maxQty) * 100}%` }}
                />
                <span className="text-green-500 relative z-10">{formatPrice(price)}</span>
                <span className="text-right relative z-10">{formatQty(qty)}</span>
                <span className="text-right text-muted-foreground relative z-10">{formatQty(price * qty)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Recent trades feed
function RecentTrades({ symbol }: { symbol: string }) {
  const { trades } = useMarketSocket(symbol)

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-medium">Recent Trades</span>
      </div>
      <div className="grid grid-cols-3 gap-2 px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
        <span className="text-left">Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Time</span>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[420px]">
        {trades.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">No trades yet</div>
        ) : (
          trades.map((t: MarketTrade, i: number) => (
            <div key={`${t.id}-${i}`} className="grid grid-cols-3 gap-2 px-3 py-0.5 text-xs tabular-nums hover:bg-muted/30">
              <span className={t.isBuyerMaker ? 'text-red-500' : 'text-green-500'}>
                {formatPrice(t.price)}
              </span>
              <span className="text-right">{formatQty(t.qty)}</span>
              <span className="text-right text-muted-foreground">{formatTime(t.time)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Trading panel - place orders
function TradePanel({ symbol }: { symbol: string }) {
  const { ticker } = useMarketSocket(symbol)
  const { user } = useAppStore()
  const { toast } = useToast()
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT')
  const [price, setPrice] = useState('')
  const [qty, setQty] = useState('')
  const [pct, setPct] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  // Wallets for current pair
  const [balances, setBalances] = useState<{ base: number; quote: number } | null>(null)
  const base = symbol.replace(/(USDT|USDC|BTC|ETH|BNB)$/, '')
  const quote = symbol.startsWith(base) ? symbol.slice(base.length) : 'USDT'

  const loadBalances = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch('/api/wallet')
      const data = await res.json()
      if (data.wallets) {
        const baseWallet = data.wallets.find((w: any) => w.asset === base)
        const quoteWallet = data.wallets.find((w: any) => w.asset === quote)
        setBalances({
          base: baseWallet?.available ?? 0,
          quote: quoteWallet?.available ?? 0,
        })
      }
    } catch {}
  }, [user, base, quote])

  useEffect(() => {
    loadBalances()
    const t = setInterval(loadBalances, 5000)
    return () => clearInterval(t)
  }, [loadBalances])

  // Update price when ticker changes (only if user hasn't manually edited)
  const [userEditedPrice, setUserEditedPrice] = useState(false)
  useEffect(() => {
    if (!userEditedPrice && ticker && orderType === 'LIMIT') {
      setPrice(formatPrice(ticker.lastPrice, { maxDigits: 6 }))
    }
  }, [ticker?.lastPrice, orderType, userEditedPrice])

  // Reset price edit flag when switching symbol
  useEffect(() => {
    setUserEditedPrice(false)
    setQty('')
    setPct(0)
  }, [symbol])

  const lastPrice = ticker?.lastPrice ?? 0
  const currentPrice = parseFloat(price) || lastPrice
  const currentQty = parseFloat(qty) || 0
  const total = currentPrice * currentQty

  // Apply percentage
  const applyPct = (p: number) => {
    setPct(p)
    if (!balances) return
    if (side === 'BUY') {
      const spendable = balances.quote
      const spend = (spendable * p) / 100
      const newQty = currentPrice > 0 ? spend / currentPrice : 0
      setQty(newQty > 0 ? newQty.toFixed(6) : '')
    } else {
      const newQty = (balances.base * p) / 100
      setQty(newQty > 0 ? newQty.toFixed(6) : '')
    }
  }

  const submit = async () => {
    if (!user) {
      toast({ title: 'Please log in to trade', variant: 'destructive' })
      return
    }
    if (orderType === 'LIMIT' && (!price || parseFloat(price) <= 0)) {
      toast({ title: 'Enter a valid price', variant: 'destructive' })
      return
    }
    if (!qty || parseFloat(qty) <= 0) {
      toast({ title: 'Enter a valid quantity', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/trade/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          side,
          type: orderType,
          price: orderType === 'LIMIT' ? parseFloat(price) : currentPrice,
          quantity: parseFloat(qty),
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      toast({
        title: 'Order placed',
        description: `${side} ${formatQty(parseFloat(qty))} ${base} @ ${orderType === 'MARKET' ? 'market' : formatPrice(parseFloat(price))}`,
      })
      setQty('')
      setPct(0)
      loadBalances()
    } catch (e: any) {
      toast({ title: 'Order failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">Log in to start trading</p>
        <Button variant="default" disabled>Place Order</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Buy/Sell tabs */}
      <div className="grid grid-cols-2 gap-1 p-2">
        <Button
          variant={side === 'BUY' ? 'default' : 'outline'}
          className={side === 'BUY' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
          onClick={() => setSide('BUY')}
        >
          Buy {base}
        </Button>
        <Button
          variant={side === 'SELL' ? 'default' : 'outline'}
          className={side === 'SELL' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
          onClick={() => setSide('SELL')}
        >
          Sell {base}
        </Button>
      </div>

      <div className="px-3 pb-2 flex gap-1">
        <Button
          variant={orderType === 'LIMIT' ? 'secondary' : 'ghost'}
          size="sm"
          className="text-xs flex-1"
          onClick={() => setOrderType('LIMIT')}
        >
          Limit
        </Button>
        <Button
          variant={orderType === 'MARKET' ? 'secondary' : 'ghost'}
          size="sm"
          className="text-xs flex-1"
          onClick={() => setOrderType('MARKET')}
        >
          Market
        </Button>
      </div>

      <div className="px-3 pb-3 space-y-2">
        {/* Available balance */}
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Available</span>
          <span className="tabular-nums">
            {side === 'BUY'
              ? `${formatQty(balances?.quote ?? 0)} ${quote}`
              : `${formatQty(balances?.base ?? 0)} ${base}`}
          </span>
        </div>

        {/* Price input (only for LIMIT) */}
        {orderType === 'LIMIT' && (
          <div>
            <label className="text-xs text-muted-foreground">Price ({quote})</label>
            <div className="relative">
              <Input
                type="number"
                value={price}
                onChange={e => { setPrice(e.target.value); setUserEditedPrice(true) }}
                placeholder="0.00"
                className="pr-12 tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{quote}</span>
            </div>
          </div>
        )}

        {/* Quantity */}
        <div>
          <label className="text-xs text-muted-foreground">Amount ({base})</label>
          <div className="relative">
            <Input
              type="number"
              value={qty}
              onChange={e => { setQty(e.target.value); setPct(0) }}
              placeholder="0.00"
              className="pr-12 tabular-nums"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{base}</span>
          </div>
        </div>

        {/* Percentage slider */}
        <div className="grid grid-cols-4 gap-1">
          {[25, 50, 75, 100].map(p => (
            <Button
              key={p}
              variant={pct === p ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => applyPct(p)}
            >
              {p}%
            </Button>
          ))}
        </div>

        {/* Total */}
        <div>
          <label className="text-xs text-muted-foreground">Total ({quote})</label>
          <Input
            type="text"
            value={formatQty(total)}
            readOnly
            className="tabular-nums bg-muted/30"
          />
        </div>

        {/* Submit */}
        <Button
          className={`w-full mt-2 ${
            side === 'BUY'
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          onClick={submit}
          disabled={loading}
        >
          {loading ? 'Placing...' : `${side} ${base}`}
        </Button>
      </div>
    </div>
  )
}

// User's open orders
function OpenOrders({ user }: { user: any }) {
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setOrders([]); setLoading(false); return }
    try {
      const res = await fetch('/api/trade/order?status=OPEN')
      const data = await res.json()
      setOrders(data.orders || [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [load])

  const cancel = async (orderId: string) => {
    try {
      await fetch('/api/trade/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      toast({ title: 'Order canceled' })
      load()
    } catch (e: any) {
      toast({ title: 'Cancel failed', description: e.message, variant: 'destructive' })
    }
  }

  if (!user) return null

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-medium">Open Orders ({orders.length})</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Pair</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 text-right font-medium">Filled</th>
              <th className="px-3 py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No open orders</td></tr>
            ) : (
              orders.map(o => (
                <tr key={o.id} className="border-t border-border/40">
                  <td className="px-3 py-2">
                    <span className={o.side === 'BUY' ? 'text-green-500' : 'text-red-500'}>
                      {o.side === 'BUY' ? 'Buy' : 'Sell'}
                    </span>{' '}
                    {o.symbol}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{o.type}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPrice(o.price)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatQty(o.quantity)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{((o.filledQty / o.quantity) * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-red-500"
                      onClick={() => cancel(o.id)}
                    >
                      <X className="h-3 w-3" /> Cancel
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Trade history
function TradeHistory({ user }: { user: any }) {
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setTrades([]); setLoading(false); return }
    try {
      const res = await fetch('/api/trade/trades?limit=20')
      const data = await res.json()
      setTrades(data.trades || [])
    } catch {
      setTrades([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  if (!user) return null

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-medium">Recent Trades</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Pair</th>
              <th className="px-3 py-2 text-left font-medium">Side</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="px-3 py-2 text-right font-medium hidden sm:table-cell">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Loading...</td></tr>
            ) : trades.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No trades yet</td></tr>
            ) : (
              trades.map(t => (
                <tr key={t.id} className="border-t border-border/40">
                  <td className="px-3 py-2">{t.symbol}</td>
                  <td className="px-3 py-2">
                    <span className={t.side === 'BUY' ? 'text-green-500' : 'text-red-500'}>
                      {t.side}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPrice(t.price)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatQty(t.quantity)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatQty(t.total)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground hidden sm:table-cell">
                    {formatDateTime(t.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Symbol selector dropdown
function SymbolSelector({ symbol }: { symbol: string }) {
  const { tickers } = useMarketSocket(symbol)
  const { setSymbol, favorites, toggleFavorite } = useAppStore()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const base = symbol.replace(/(USDT|USDC|BTC|ETH|BNB)$/, '')
  const quote = symbol.startsWith(base) ? symbol.slice(base.length) : 'USDT'

  const filtered = tickers.filter(t =>
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.baseName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(!open)}
      >
        <span className="font-bold">{base}/{quote}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 w-80 bg-card border border-border rounded-lg shadow-xl">
            <div className="p-2 border-b border-border">
              <Input
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filtered.map(t => {
                const isFav = favorites.includes(t.symbol)
                return (
                  <div
                    key={t.symbol}
                    className="flex items-center justify-between px-3 py-2 hover:bg-muted/40 cursor-pointer text-sm"
                    onClick={() => { setSymbol(t.symbol); setOpen(false) }}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(t.symbol) }}
                        className="text-muted-foreground hover:text-yellow-500"
                      >
                        <Star className={`h-3 w-3 ${isFav ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                      </button>
                      <div>
                        <div className="font-medium">{t.base}/{t.quote}</div>
                        <div className="text-xs text-muted-foreground">{t.baseName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="tabular-nums">{formatPrice(t.lastPrice)}</div>
                      <div className={`text-xs ${t.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatPercent(t.changePercent)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function SpotView() {
  const { symbol, user, favorites, toggleFavorite } = useAppStore()
  const { ticker, klines } = useMarketSocket(symbol)
  const [bottomTab, setBottomTab] = useState<'orders' | 'history'>('orders')

  const base = symbol.replace(/(USDT|USDC|BTC|ETH|BNB)$/, '')
  const quote = symbol.startsWith(base) ? symbol.slice(base.length) : 'USDT'
  const isFav = favorites.includes(symbol)

  const change = ticker?.changePercent ?? 0
  const isUp = change >= 0

  return (
    <div className="container mx-auto px-2 sm:px-3 py-2 max-w-[1600px]">
      {/* Back button */}
      <div className="px-1 py-1">
        <BackButton to="markets" />
      </div>

      {/* Pair header */}
      <div className="flex flex-wrap items-center gap-3 mb-2 p-2 bg-card rounded-lg border border-border">
        <SymbolSelector symbol={symbol} />
        <button onClick={() => toggleFavorite(symbol)} className="text-muted-foreground hover:text-yellow-500">
          <Star className={`h-4 w-4 ${isFav ? 'fill-yellow-500 text-yellow-500' : ''}`} />
        </button>

        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Last Price</span>
          <span className={`text-lg font-bold tabular-nums ${isUp ? 'text-green-500' : 'text-red-500'}`}>
            {formatPrice(ticker?.lastPrice ?? 0)}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">24h Change</span>
          <span className={`text-sm font-medium tabular-nums ${isUp ? 'text-green-500' : 'text-red-500'}`}>
            {formatPercent(change)}
          </span>
        </div>

        <div className="flex flex-col hidden sm:flex">
          <span className="text-xs text-muted-foreground">24h High</span>
          <span className="text-sm tabular-nums">{formatPrice(ticker?.high24h ?? 0)}</span>
        </div>

        <div className="flex flex-col hidden sm:flex">
          <span className="text-xs text-muted-foreground">24h Low</span>
          <span className="text-sm tabular-nums">{formatPrice(ticker?.low24h ?? 0)}</span>
        </div>

        <div className="flex flex-col hidden md:flex">
          <span className="text-xs text-muted-foreground">24h Volume ({base})</span>
          <span className="text-sm tabular-nums">{formatCompact(ticker?.volume24h ?? 0)}</span>
        </div>

        <div className="flex flex-col hidden md:flex">
          <span className="text-xs text-muted-foreground">24h Volume ({quote})</span>
          <span className="text-sm tabular-nums">{formatCompact(ticker?.quoteVolume24h ?? 0)}</span>
        </div>
      </div>

      {/* Main grid: chart + order book + trade panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px_320px] gap-2 mb-2">
        {/* Chart */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Live Price Chart</span>
              <span className="text-xs text-muted-foreground">Real-time · 1m</span>
            </div>
            <div className="flex items-center gap-1">
              {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf, i) => (
                <Button
                  key={tf}
                  variant={i === 0 ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                >
                  {tf}
                </Button>
              ))}
            </div>
          </div>
          <RealTimeLineChart klines={klines} height={400} baseAsset={base} quoteAsset={quote} />
        </div>

        {/* Order book */}
        <div className="bg-card rounded-lg border border-border overflow-hidden hidden lg:block">
          <OrderBook symbol={symbol} />
        </div>

        {/* Trade panel */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <TradePanel symbol={symbol} />
        </div>
      </div>

      {/* Mobile order book */}
      <div className="lg:hidden bg-card rounded-lg border border-border overflow-hidden mb-2">
        <OrderBook symbol={symbol} />
      </div>

      {/* Recent trades + bottom panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-2">
        <div>
          <Tabs value={bottomTab} onValueChange={(v) => setBottomTab(v as any)}>
            <TabsList className="mb-2">
              <TabsTrigger value="orders">Open Orders</TabsTrigger>
              <TabsTrigger value="history">Trade History</TabsTrigger>
            </TabsList>
            <TabsContent value="orders">
              <OpenOrders user={user} />
            </TabsContent>
            <TabsContent value="history">
              <TradeHistory user={user} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <RecentTrades symbol={symbol} />
        </div>
      </div>

      {/* Profit/Loss Panel — right side */}
      <ProfitLossPanel symbol={symbol} user={user} />
    </div>
  )
}

// =================== PROFIT/LOSS PANEL ===================
function ProfitLossPanel({ symbol, user }: { symbol: string; user: any }) {
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setTrades([]); setLoading(false); return }
    try {
      const res = await fetch(`/api/trade/trades?symbol=${symbol}&limit=50`)
      const data = await res.json()
      setTrades(data.trades || [])
    } catch {
      setTrades([])
    } finally {
      setLoading(false)
    }
  }, [user, symbol])

  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [load])

  const base = symbol.replace(/(USDT|USDC|BTC|ETH|BNB)$/, '')
  const quote = symbol.startsWith(base) ? symbol.slice(base.length) : 'USDT'

  // Calculate PnL from trade history
  // For BUY trades: profit = (currentPrice - buyPrice) * quantity
  // For SELL trades: profit = (sellPrice - avgBuyPrice) * quantity
  const prices: Record<string, number> = {
    BTC: 67500, ETH: 3450, BNB: 585, SOL: 165, XRP: 0.62, ADA: 0.45,
    DOGE: 0.16, AVAX: 38, LINK: 18.5, DOT: 7.2, MATIC: 0.72, LTC: 85,
    USDT: 1, USDC: 1,
  }
  const currentPrice = prices[base] || 0

  // Calculate total PnL
  let totalBuyCost = 0
  let totalBuyQty = 0
  let totalSellRevenue = 0
  let totalSellQty = 0
  let realizedPnL = 0

  // First pass: calculate average buy price
  const buyTrades = trades.filter(t => t.side === 'BUY')
  const sellTrades = trades.filter(t => t.side === 'SELL')

  for (const t of buyTrades) {
    totalBuyCost += t.price * t.quantity
    totalBuyQty += t.quantity
  }
  const avgBuyPrice = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0

  for (const t of sellTrades) {
    totalSellRevenue += t.price * t.quantity
    totalSellQty += t.quantity
    // Realized PnL = (sell price - avg buy price) * sell qty
    realizedPnL += (t.price - avgBuyPrice) * t.quantity
  }

  // Unrealized PnL = (current price - avg buy price) * remaining qty
  const remainingQty = totalBuyQty - totalSellQty
  const unrealizedPnL = remainingQty > 0 ? (currentPrice - avgBuyPrice) * remainingQty : 0

  // Total PnL = realized + unrealized
  const totalPnL = realizedPnL + unrealizedPnL
  const pnlPercent = totalBuyCost > 0 ? (totalPnL / totalBuyCost) * 100 : 0

  const isProfit = totalPnL >= 0

  if (!user) return null

  return (
    <div className="mt-2 bg-card rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Profit & Loss
        </h3>
        <span className="text-xs text-muted-foreground">{base}/{quote}</span>
      </div>

      {loading ? (
        <div className="p-6 text-center text-xs text-muted-foreground">Loading PnL...</div>
      ) : trades.length === 0 ? (
        <div className="p-6 text-center">
          <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-30" />
          <p className="text-xs text-muted-foreground">No trades yet for {base}/{quote}</p>
          <p className="text-xs text-muted-foreground mt-1">Your profit/loss will appear here after you trade.</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Total PnL — big number */}
          <div className={`rounded-lg p-4 text-center ${isProfit ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <p className="text-xs text-muted-foreground mb-1">Total PnL</p>
            <p className={`text-3xl font-bold tabular-nums ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
              {isProfit ? '+' : ''}{formatPrice(totalPnL)} {quote}
            </p>
            <p className={`text-sm font-medium mt-1 ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
              {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
            </p>
          </div>

          {/* Breakdown */}
          <div className="space-y-2">
            {/* Realized PnL */}
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                {realizedPnL >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <div>
                  <span className="text-xs font-medium">Realized PnL</span>
                  <p className="text-[10px] text-muted-foreground">From closed trades</p>
                </div>
              </div>
              <span className={`text-sm font-bold tabular-nums ${realizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {realizedPnL >= 0 ? '+' : ''}{formatPrice(realizedPnL)} {quote}
              </span>
            </div>

            {/* Unrealized PnL */}
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                {unrealizedPnL >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <div>
                  <span className="text-xs font-medium">Unrealized PnL</span>
                  <p className="text-[10px] text-muted-foreground">Open position ({formatQty(remainingQty)} {base})</p>
                </div>
              </div>
              <span className={`text-sm font-bold tabular-nums ${unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {unrealizedPnL >= 0 ? '+' : ''}{formatPrice(unrealizedPnL)} {quote}
              </span>
            </div>
          </div>

          {/* Trade stats */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
            <div className="text-center p-2 bg-muted/20 rounded-lg">
              <p className="text-[10px] text-muted-foreground">Total Bought</p>
              <p className="text-sm font-medium tabular-nums">{formatQty(totalBuyQty)} {base}</p>
              <p className="text-[10px] text-muted-foreground">{formatPrice(avgBuyPrice)} {quote} avg</p>
            </div>
            <div className="text-center p-2 bg-muted/20 rounded-lg">
              <p className="text-[10px] text-muted-foreground">Total Sold</p>
              <p className="text-sm font-medium tabular-nums">{formatQty(totalSellQty)} {base}</p>
              <p className="text-[10px] text-muted-foreground">{trades.length} trades</p>
            </div>
          </div>

          {/* Current position */}
          {remainingQty > 0 && (
            <div className="flex items-center justify-between p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <span className="text-xs text-muted-foreground">Current Position:</span>
              <div className="text-right">
                <span className="text-sm font-bold tabular-nums">{formatQty(remainingQty)} {base}</span>
                <p className="text-[10px] text-muted-foreground">≈ {formatPrice(remainingQty * currentPrice)} {quote}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
