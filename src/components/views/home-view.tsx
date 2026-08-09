'use client'

import { useMemo } from 'react'
import { useTickers } from '@/lib/use-market'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  Bitcoin, TrendingUp, Users, Wallet, Shield, Zap, Globe, ArrowRight,
  ArrowUp, ArrowDown, Star, BarChart3,
} from 'lucide-react'
import { formatPrice, formatPercent, formatCompact } from '@/lib/utils'

export function HomeView() {
  const { tickers, connected } = useTickers()
  const { setView, setSymbol, user } = useAppStore()

  const topMovers = useMemo(() => {
    const sorted = [...tickers].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    return {
      gainers: sorted.filter(t => t.changePercent > 0).slice(0, 4),
      losers: sorted.filter(t => t.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 4),
    }
  }, [tickers])

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 max-w-7xl">
      {/* Hero section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 border border-border p-6 sm:p-10 mb-6">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-yellow-500 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-orange-500 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live · {tickers.length} pairs trading
            </span>
            <span className="text-xs text-muted-foreground">
              {connected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-3 leading-tight">
            Trade Crypto with <span className="bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">Confidence</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-6 max-w-2xl">
            Spot trading, P2P marketplace, and a secure multi-asset wallet — all in one platform.
            Buy Bitcoin, Ethereum, USDT and 100+ cryptocurrencies in seconds.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
              onClick={() => setView('spot')}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Start Trading
            </Button>
            <Button size="lg" variant="outline" onClick={() => setView('markets')}>
              View Markets
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <FeatureCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Spot Trading"
          desc="Limit & market orders with real-time matching engine"
          onClick={() => setView('spot')}
        />
        <FeatureCard
          icon={<Users className="h-5 w-5" />}
          title="P2P Marketplace"
          desc="Trade crypto with local payment methods worldwide"
          onClick={() => setView('p2p')}
        />
        <FeatureCard
          icon={<Wallet className="h-5 w-5" />}
          title="Multi-Asset Wallet"
          desc="Send & receive BTC, ETH, USDT and 100+ assets"
          onClick={() => setView('wallet')}
        />
        <FeatureCard
          icon={<BarChart3 className="h-5 w-5" />}
          title="Advanced Charts"
          desc="Candlestick charts, depth, real-time data"
          onClick={() => setView('spot')}
        />
      </section>

      {/* Top movers */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-green-500" /> Top Gainers
          </h3>
          <div className="space-y-2">
            {topMovers.gainers.length === 0 ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : topMovers.gainers.map(t => (
              <MoverRow key={t.symbol} ticker={t} onClick={() => { setSymbol(t.symbol); setView('spot') }} />
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-red-500" /> Top Losers
          </h3>
          <div className="space-y-2">
            {topMovers.losers.length === 0 ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : topMovers.losers.map(t => (
              <MoverRow key={t.symbol} ticker={t} onClick={() => { setSymbol(t.symbol); setView('spot') }} />
            ))}
          </div>
        </div>
      </section>

      {/* Three Feature Cards: Bank-Grade Security, High-Performance Engine, Global Coverage */}
      <section className="mb-6">
        <h2 className="text-lg font-bold mb-3">Why P2PEX?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FeatureCard
            icon={<Shield className="h-5 w-5" />}
            title="Bank-Grade Security"
            desc="Cold storage, 2FA, withdrawal whitelist, and 24/7 monitoring protect your assets around the clock."
            onClick={() => setView('wallet')}
          />
          <FeatureCard
            icon={<Zap className="h-5 w-5" />}
            title="High-Performance Engine"
            desc="Orders matched in microseconds. Real-time market data via WebSocket keeps you ahead of the market."
            onClick={() => setView('spot')}
          />
          <FeatureCard
            icon={<Globe className="h-5 w-5" />}
            title="Global Coverage"
            desc="Trade in 100+ countries with multiple fiat currencies including USD, EUR, ETB and local payment methods."
            onClick={() => setView('p2p')}
          />
        </div>
      </section>

    </div>
  )
}

function FeatureCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-card border border-border rounded-lg p-4 hover:border-primary/50 hover:bg-muted/30 transition group"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3 group-hover:scale-110 transition">
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </button>
  )
}

function MoverRow({ ticker, onClick }: { ticker: any; onClick: () => void }) {
  const isUp = ticker.changePercent >= 0
  return (
    <div
      className="flex items-center justify-between p-2 rounded hover:bg-muted/40 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <AssetIcon asset={ticker.base} small />
        <div>
          <div className="text-sm font-medium">{ticker.base}/{ticker.quote}</div>
          <div className="text-xs text-muted-foreground">{formatPrice(ticker.lastPrice)}</div>
        </div>
      </div>
      <span className={`text-sm font-medium tabular-nums ${isUp ? 'text-green-500' : 'text-red-500'}`}>
        {formatPercent(ticker.changePercent)}
      </span>
    </div>
  )
}

function AssetIcon({ asset, small }: { asset: string; small?: boolean }) {
  const colors: Record<string, string> = {
    BTC: 'bg-orange-500',
    ETH: 'bg-blue-500',
    USDT: 'bg-green-500',
    USDC: 'bg-blue-400',
    BNB: 'bg-yellow-500',
    SOL: 'bg-purple-500',
    XRP: 'bg-gray-500',
    ADA: 'bg-blue-600',
    DOGE: 'bg-yellow-400',
    AVAX: 'bg-red-500',
    LINK: 'bg-blue-500',
    DOT: 'bg-pink-500',
    MATIC: 'bg-purple-600',
    LTC: 'bg-gray-400',
  }
  const size = small ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs'
  return (
    <div className={`flex ${size} items-center justify-center rounded-full text-white font-bold ${colors[asset] || 'bg-gray-500'}`}>
      {asset.slice(0, 3)}
    </div>
  )
}
