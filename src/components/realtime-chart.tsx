'use client'

import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Line, ComposedChart,
} from 'recharts'
import type { Kline } from '@/lib/use-market'
import { formatPrice, formatCompact, formatTime } from '@/lib/utils'

interface Props {
  klines: Kline[]
  height?: number
  baseAsset?: string
  quoteAsset?: string
  /** Show volume bars at the bottom */
  showVolume?: boolean
}

interface PricePoint {
  time: number
  price: number
  volume: number
}

/**
 * RealTimeLineChart - Live-updating area+line chart showing real price data.
 *
 * Uses the kline close prices from the WebSocket market service, which tick
 * every 1.5 seconds. The chart auto-updates as new data arrives.
 *
 * Features:
 * - Smooth gradient area fill under the line
 * - Green when price is up, red when down (vs first data point)
 * - Current price reference line with dashed style
 * - Live tooltip showing price + time
 * - Optional volume bars at the bottom
 */
export function RealTimeLineChart({ klines, height = 400, baseAsset = 'BTC', quoteAsset = 'USDT', showVolume = true }: Props) {
  const data: PricePoint[] = useMemo(() => {
    return klines.map(k => ({
      time: k.openTime,
      price: k.close,
      volume: k.volume,
    }))
  }, [klines])

  const { min, max, isUp, changePercent } = useMemo(() => {
    if (klines.length === 0) return { min: 0, max: 1, isUp: true, changePercent: 0 }
    let lo = Infinity, hi = -Infinity
    for (const k of klines) {
      if (k.close < lo) lo = k.close
      if (k.close > hi) hi = k.close
    }
    const first = klines[0].close
    const last = klines[klines.length - 1].close
    const padding = (hi - lo) * 0.1 || hi * 0.01
    return {
      min: lo - padding,
      max: hi + padding,
      isUp: last >= first,
      changePercent: first > 0 ? ((last - first) / first) * 100 : 0,
    }
  }, [klines])

  const maxVol = useMemo(() => {
    if (klines.length === 0) return 1
    return Math.max(...klines.map(k => k.volume), 1)
  }, [klines])

  const currentPrice = data.length > 0 ? data[data.length - 1].price : 0
  const lineColor = isUp ? '#16c784' : '#ea3943'
  const gradientId = `priceGradient-${baseAsset}${quoteAsset}`

  if (data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        <div className="text-center">
          <div className="animate-pulse mb-2">Loading live price data...</div>
          <div className="text-xs">Connecting to market data feed</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full relative" style={{ height }}>
      {/* Price label overlay - top left */}
      <div className="absolute top-2 left-3 z-10 pointer-events-none">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold tabular-nums">{formatPrice(currentPrice)}</span>
          <span className="text-xs text-muted-foreground">{quoteAsset}</span>
        </div>
        <div className={`text-xs font-medium ${isUp ? 'text-green-500' : 'text-red-500'}`}>
          {isUp ? '▲' : '▼'} {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
        </div>
      </div>

      {/* Live indicator - top right */}
      <div className="absolute top-2 right-3 z-10 pointer-events-none flex items-center gap-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-xs text-muted-foreground font-medium">LIVE</span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 30, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="60%" stopColor={lineColor} stopOpacity={0.1} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            scale="time"
            tickFormatter={(t) => {
              const d = new Date(t)
              return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
            }}
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            minTickGap={60}
          />
          <YAxis
            orientation="right"
            domain={[min, max]}
            tickFormatter={(v) => formatPrice(v, { maxDigits: 2 })}
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          {showVolume && (
            <YAxis
              yAxisId="volume"
              orientation="left"
              domain={[0, maxVol * 5]}
              hide
            />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={(t) => {
              const d = new Date(t as number)
              return d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
            }}
            formatter={(value: any, name: string) => {
              if (name === 'Volume') return [formatCompact(value), name]
              if (name === 'price') return [formatPrice(value), `${baseAsset}/${quoteAsset}`]
              return [formatPrice(value), name]
            }}
          />
          {showVolume && (
            <Area
              yAxisId="volume"
              type="bar"
              dataKey="volume"
              fill={lineColor}
              fillOpacity={0.08}
              stroke="none"
              isAnimationActive={false}
            />
          )}
          {/* Main price area + line */}
          <Area
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 4, fill: lineColor, stroke: 'var(--card)', strokeWidth: 2 }}
          />
          {/* Current price reference line */}
          <ReferenceLine
            y={currentPrice}
            stroke={lineColor}
            strokeDasharray="4 4"
            strokeWidth={1}
            opacity={0.5}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Simple sparkline line chart (for compact views like Home page cards).
 */
export function PriceLineChart({ klines, height = 60, color }: { klines: Kline[]; height?: number; color?: string }) {
  const data = useMemo(() => klines.map(k => ({ time: k.openTime, close: k.close })), [klines])
  const isUp = klines.length > 0 ? klines[klines.length - 1].close >= klines[0].open : true
  const lineColor = color || (isUp ? '#16c784' : '#ea3943')
  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="close"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
