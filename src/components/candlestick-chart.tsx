'use client'

import { useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, Customized,
} from 'recharts'
import type { Kline } from '@/lib/use-market'
import { formatPrice, formatCompact } from '@/lib/utils'

interface Props {
  klines: Kline[]
  height?: number
  baseAsset?: string
  quoteAsset?: string
}

/**
 * Candlestick chart using Recharts ComposedChart with a Customized component.
 *
 * Approach: Use a Bar (volume) at the bottom + a Customized component that
 * draws all candles using the chart's xScale/yScale.
 */

interface CandleRow {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  isUp: boolean
  bodyLow: number
  bodyHigh: number
}

function Candles(props: any) {
  const { formattedGraphicalItems, xAxis, yAxis } = props
  if (!formattedGraphicalItems || formattedGraphicalItems.length === 0) return null
  const item = formattedGraphicalItems[0]
  const { props: barProps } = item
  const data = barProps.data || []
  if (!data || data.length === 0 || !xAxis || !yAxis) return null

  const xScale = xAxis.scale
  const yScale = yAxis.scale
  const bandWidth = (xAxis.bandSize || xScale.bandwidth?.() || 10)
  const candleWidth = Math.max(bandWidth * 0.7, 2)

  return (
    <g>
      {data.map((d: CandleRow, i: number) => {
        const x = xScale(d.time) - candleWidth / 2
        const bodyTop = yScale(d.bodyHigh)
        const bodyBot = yScale(d.bodyLow)
        const bodyH = Math.max(bodyBot - bodyTop, 1)
        const wickX = x + candleWidth / 2
        const wickTop = yScale(d.high)
        const wickBot = yScale(d.low)
        const color = d.isUp ? '#16c784' : '#ea3943'
        return (
          <g key={`c-${i}`}>
            <line
              x1={wickX} x2={wickX}
              y1={wickTop} y2={wickBot}
              stroke={color} strokeWidth={1}
            />
            <rect
              x={x}
              width={candleWidth}
              y={bodyTop}
              height={bodyH}
              fill={color}
            />
          </g>
        )
      })}
    </g>
  )
}

export function CandlestickChart({ klines, height = 400, baseAsset = 'BTC', quoteAsset = 'USDT' }: Props) {
  const data: CandleRow[] = useMemo(() => {
    return klines.map(k => ({
      time: k.openTime,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
      isUp: k.close >= k.open,
      bodyLow: Math.min(k.open, k.close),
      bodyHigh: Math.max(k.open, k.close),
    }))
  }, [klines])

  const prices = useMemo(() => {
    if (klines.length === 0) return { min: 0, max: 1 }
    let min = Infinity, max = -Infinity
    for (const k of klines) {
      if (k.low < min) min = k.low
      if (k.high > max) max = k.high
    }
    const padding = (max - min) * 0.05
    return { min: min - padding, max: max + padding }
  }, [klines])

  const maxVol = useMemo(() => {
    if (klines.length === 0) return 1
    return Math.max(...klines.map(k => k.volume), 1)
  }, [klines])

  // Custom volume bar shape (declared at module level - stable)
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
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
            minTickGap={50}
          />
          <YAxis
            orientation="right"
            domain={[prices.min, prices.max]}
            tickFormatter={(v) => formatPrice(v, { maxDigits: 2 })}
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <YAxis
            yAxisId="volume"
            orientation="left"
            domain={[0, maxVol * 4]} // scale volume so bars stay in bottom 25%
            hide
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={(t) => new Date(t as number).toLocaleString('en-US')}
            formatter={(value: any, name: string) => {
              if (name === 'Volume') return [formatCompact(value), name]
              return [formatPrice(value), name]
            }}
          />
          {/* Volume bars at the bottom (faint) */}
          <Bar
            yAxisId="volume"
            dataKey="volume"
            fill="transparent"
            isAnimationActive={false}
          />
          {/* Render candles via Customized (gets access to chart scales) */}
          <Customized component={Candles} />
          {data.length > 0 && (
            <ReferenceLine
              y={data[data.length - 1].close}
              stroke="var(--primary)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Simple line chart for price history (used on Home page).
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
