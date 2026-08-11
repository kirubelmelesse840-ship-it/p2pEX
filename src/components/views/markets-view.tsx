'use client'

import { useState, useMemo, Fragment } from 'react'
import { useTickers, useMarketSocket, Ticker } from '@/lib/use-market'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Star, ArrowUp, ArrowDown, Search, BarChart3, ChevronRight, TrendingUp } from 'lucide-react'
import { RealTimeLineChart } from '@/components/realtime-chart'
import { BackButton } from '@/components/back-button'
import { SignupPrompt } from '@/components/signup-prompt'
import { formatPrice, formatPercent, formatCompact } from '@/lib/utils'

interface RowProps {
  ticker: Ticker
  isFavorite: boolean
  onToggleFav: () => void
  onClick: () => void
  isSelected: boolean
}

function TickerRow({ ticker, isFavorite, onToggleFav, onClick, isSelected }: RowProps) {
  const isUp = ticker.changePercent >= 0
  return (
    <tr
      className={`border-b border-border/40 hover:bg-muted/40 transition-colors cursor-pointer ${
        isSelected ? 'bg-primary/5' : ''
      }`}
      onClick={onClick}
    >
      <td className="px-3 py-3 w-8">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFav() }}
          className="text-muted-foreground hover:text-yellow-500 transition"
          aria-label="Toggle favorite"
        >
          <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="font-medium text-sm flex items-center gap-1.5">
          {ticker.base}/{ticker.quote}
          {isSelected && <ChevronRight className="h-3 w-3 text-primary" />}
        </div>
        <div className="text-xs text-muted-foreground">{ticker.baseName}</div>
      </td>
      <td className="px-3 py-3 text-right text-sm tabular-nums">
        {formatPrice(ticker.lastPrice)}
      </td>
      <td className="px-3 py-3 text-right">
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${
            isUp ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'
          }`}
        >
          {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {formatPercent(Math.abs(ticker.changePercent))}
        </span>
      </td>
      <td className="px-3 py-3 text-right text-sm tabular-nums text-muted-foreground hidden md:table-cell">
        {formatCompact(ticker.volume24h)} {ticker.base}
      </td>
      <td className="px-3 py-3 text-right text-sm tabular-nums text-muted-foreground hidden lg:table-cell">
        {formatCompact(ticker.quoteVolume24h)} {ticker.quote}
      </td>
      <td className="px-3 py-3 text-right hidden sm:table-cell">
        <svg width="80" height="24" className="inline-block">
          <polyline
            points={Array.from({ length: 20 }).map((_, i) => {
              const x = (i / 19) * 80
              const seed = ticker.symbol.charCodeAt(i % ticker.symbol.length) + i
              const variance = Math.sin(seed) * 8
              const y = 12 + variance - (isUp ? i * 0.3 : -i * 0.3)
              return `${x.toFixed(1)},${y.toFixed(1)}`
            }).join(' ')}
            fill="none"
            stroke={isUp ? '#16c784' : '#ea3943'}
            strokeWidth="1.5"
          />
        </svg>
      </td>
    </tr>
  )
}

/**
 * Featured chart panel - shows candlestick chart for a selected pair.
 * Updates in real-time via the WebSocket market socket.
 */
function FeaturedChart({ symbol }: { symbol: string }) {
  const { ticker, klines } = useMarketSocket(symbol)
  const { setSymbol, setView, favorites, toggleFavorite } = useAppStore()
  const isUp = (ticker?.changePercent ?? 0) >= 0
  const isFav = favorites.includes(symbol)

  const base = symbol.replace(/(USDT|USDC|BTC|ETH|BNB)$/, '')
  const quote = symbol.startsWith(base) ? symbol.slice(base.length) : 'USDT'

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{base}/{quote}</h2>
              <span className="text-xs text-muted-foreground">{ticker?.baseName}</span>
              <button
                onClick={() => toggleFavorite(symbol)}
                className="text-muted-foreground hover:text-yellow-500 transition"
              >
                <Star className={`h-3.5 w-3.5 ${isFav ? 'fill-yellow-500 text-yellow-500' : ''}`} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 ml-2">
            <div>
              <div className="text-xs text-muted-foreground">Last Price</div>
              <div className={`text-base font-bold tabular-nums ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                {formatPrice(ticker?.lastPrice ?? 0)}
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="text-xs text-muted-foreground">24h Change</div>
              <div className={`text-sm font-medium tabular-nums ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercent(ticker?.changePercent ?? 0)}
              </div>
            </div>
            <div className="hidden md:block">
              <div className="text-xs text-muted-foreground">24h High</div>
              <div className="text-sm tabular-nums">{formatPrice(ticker?.high24h ?? 0)}</div>
            </div>
            <div className="hidden md:block">
              <div className="text-xs text-muted-foreground">24h Low</div>
              <div className="text-sm tabular-nums">{formatPrice(ticker?.low24h ?? 0)}</div>
            </div>
            <div className="hidden lg:block">
              <div className="text-xs text-muted-foreground">24h Volume</div>
              <div className="text-sm tabular-nums">{formatCompact(ticker?.volume24h ?? 0)} {base}</div>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => { setSymbol(symbol); setView('spot') }}
          className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
        >
          Trade {base}
        </Button>
      </div>

      <div className="p-2">
        <RealTimeLineChart klines={klines} height={300} baseAsset={base} quoteAsset={quote} />
      </div>

      <div className="px-4 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <BarChart3 className="h-3 w-3" />
          Real-time price chart · updates every 1.5s · {klines.length} data points
        </span>
        <span className="hidden sm:inline">Click any pair below to load it here</span>
      </div>
    </div>
  )
}

export function MarketsView() {
  const { tickers, connected } = useTickers()
  const { favorites, toggleFavorite, setSymbol, setView, user } = useAppStore()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'favorites' | 'USDT' | 'USDC' | 'BTC' | 'ETH'>('all')
  const [chartSymbol, setChartSymbol] = useState('BTCUSDT')

  const filtered = useMemo(() => {
    let list = [...tickers]
    if (tab === 'favorites') {
      list = list.filter(t => favorites.includes(t.symbol))
    } else if (tab === 'USDT') {
      list = list.filter(t => t.quote === 'USDT')
    } else if (tab === 'USDC') {
      list = list.filter(t => t.quote === 'USDC')
    } else if (tab === 'BTC') {
      list = list.filter(t => t.quote === 'BTC' || t.base === 'BTC')
    } else if (tab === 'ETH') {
      list = list.filter(t => t.quote === 'ETH' || t.base === 'ETH')
    }
    if (search.trim()) {
      const q = search.toUpperCase()
      list = list.filter(t =>
        t.symbol.includes(q) ||
        t.base.includes(q) ||
        t.baseName.toUpperCase().includes(q)
      )
    }
    return list.sort((a, b) => b.quoteVolume24h - a.quoteVolume24h)
  }, [tickers, tab, search, favorites])

  const handleClick = (symbol: string) => {
    // Clicking a row loads it in the featured chart (don't auto-navigate to spot)
    setChartSymbol(symbol)
  }

  const handleTrade = (symbol: string) => {
    setSymbol(symbol)
    setView('spot')
  }

  if (!user) {
    return (
      <SignupPrompt
        icon={<BarChart3 className="h-10 w-10" />}
        title="Sign in to View Markets"
        description="Log in or create an account to view real-time prices, track favorites, and start trading. New users get a <strong class='text-primary'>10 USDT welcome bonus</strong>!"
        features={[
          { icon: <TrendingUp className="h-4 w-4" />, label: 'Live Prices' },
          { icon: <Star className="h-4 w-4" />, label: 'Favorites' },
          { icon: <BarChart3 className="h-4 w-4" />, label: 'Charts' },
        ]}
      />
    )
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 max-w-7xl w-full">
      <BackButton to="home" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 mt-1">
        <div>
          <h1 className="text-2xl font-bold">Markets</h1>
          <p className="text-sm text-muted-foreground">
            Real-time prices for {tickers.length} trading pairs
            <span className={`ml-2 inline-block w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search markets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Featured candlestick chart */}
      <FeaturedChart symbol={chartSymbol} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-3">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="favorites">★ Favorites</TabsTrigger>
          <TabsTrigger value="USDT">USDT</TabsTrigger>
          <TabsTrigger value="USDC">USDC</TabsTrigger>
          <TabsTrigger value="BTC">BTC</TabsTrigger>
          <TabsTrigger value="ETH">ETH</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium w-8"></th>
                <th className="px-3 py-2 text-left font-medium">Pair</th>
                <th className="px-3 py-2 text-right font-medium">Last Price</th>
                <th className="px-3 py-2 text-right font-medium">24h Change</th>
                <th className="px-3 py-2 text-right font-medium hidden md:table-cell">24h Volume</th>
                <th className="px-3 py-2 text-right font-medium hidden lg:table-cell">24h Quote Vol</th>
                <th className="px-3 py-2 text-right font-medium hidden sm:table-cell">Trend</th>
                <th className="px-3 py-2 text-right font-medium">Trade</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                    No markets found
                  </td>
                </tr>
              ) : (
                filtered.map(t => (
                  <Fragment key={t.symbol}>
                    <TickerRow
                      ticker={t}
                      isFavorite={favorites.includes(t.symbol)}
                      onToggleFav={() => toggleFavorite(t.symbol)}
                      onClick={() => handleClick(t.symbol)}
                      isSelected={chartSymbol === t.symbol}
                    />
                    {chartSymbol === t.symbol && (
                      <tr className="md:hidden">
                        <td colSpan={8} className="px-2 pb-3">
                          <Button
                            size="sm"
                            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                            onClick={() => handleTrade(t.symbol)}
                          >
                            Trade {t.base}/{t.quote} <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        Data is simulated in real-time. Prices update every 1.5 seconds. Click any pair to view its chart.
      </div>
    </div>
  )
}
