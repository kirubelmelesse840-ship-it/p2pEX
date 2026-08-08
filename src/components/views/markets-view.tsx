'use client'

import { useState, useMemo } from 'react'
import { useTickers, Ticker } from '@/lib/use-market'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Star, ArrowUp, ArrowDown, Search } from 'lucide-react'
import { formatPrice, formatPercent, formatCompact } from '@/lib/utils'

interface RowProps {
  ticker: Ticker
  isFavorite: boolean
  onToggleFav: () => void
  onClick: () => void
}

function TickerRow({ ticker, isFavorite, onToggleFav, onClick }: RowProps) {
  const isUp = ticker.changePercent >= 0
  return (
    <tr
      className="border-b border-border/40 hover:bg-muted/40 transition-colors cursor-pointer"
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
        <div className="font-medium text-sm">{ticker.base}/{ticker.quote}</div>
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

export function MarketsView() {
  const { tickers, connected } = useTickers()
  const { favorites, toggleFavorite, setSymbol, setView } = useAppStore()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'favorites' | 'USDT' | 'USDC' | 'BTC' | 'ETH'>('all')

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
    setSymbol(symbol)
    setView('spot')
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
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
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-muted-foreground">
                    No markets found
                  </td>
                </tr>
              ) : (
                filtered.map(t => (
                  <TickerRow
                    key={t.symbol}
                    ticker={t}
                    isFavorite={favorites.includes(t.symbol)}
                    onToggleFav={() => toggleFavorite(t.symbol)}
                    onClick={() => handleClick(t.symbol)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        Data is simulated in real-time. Prices update every 1.5 seconds.
      </div>
    </div>
  )
}
