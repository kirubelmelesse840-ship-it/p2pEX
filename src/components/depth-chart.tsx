'use client'

import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { formatPrice, formatCompact } from '@/lib/utils'

interface Props {
  bids: [number, number][]
  asks: [number, number][]
  height?: number
  lastPrice?: number
}

/**
 * Depth chart - visualizes the cumulative order book depth.
 * Bids (green) on the left, asks (red) on the right, current price in the middle.
 */
export function DepthChart({ bids, asks, height = 120, lastPrice }: Props) {
  const { bidData, askData, midPrice, maxTotal } = useMemo(() => {
    // Sort bids descending by price, asks ascending by price
    const sortedBids = [...bids].sort((a, b) => b[0] - a[0]).slice(0, 20)
    const sortedAsks = [...asks].sort((a, b) => a[0] - b[0]).slice(0, 20)

    // Cumulative totals - use reduce with accumulator that tracks running total
    const scan = (arr: [number, number][]) =>
      arr.reduce<Array<{ price: number; total: number }>>(
        (acc, [price, qty]) => {
          const prev = acc.length > 0 ? acc[acc.length - 1].total : 0
          acc.push({ price, total: prev + qty })
          return acc
        },
        []
      )

    const bidData = scan(sortedBids).reverse() // lowest price left, highest (closest to mid) right
    const askData = scan(sortedAsks)

    const bidCum = bidData.length > 0 ? bidData[0].total : 0  // after reverse, first item has the max cum
    const askCum = askData.length > 0 ? askData[askData.length - 1].total : 0

    const midPrice = lastPrice || (
      sortedBids.length > 0 && sortedAsks.length > 0
        ? (sortedBids[0][0] + sortedAsks[0][0]) / 2
        : sortedBids.length > 0 ? sortedBids[0][0] : sortedAsks.length > 0 ? sortedAsks[0][0] : 0
    )
    const maxTotal = Math.max(bidCum, askCum, 1)

    return { bidData, askData, midPrice, maxTotal }
  }, [bids, asks, lastPrice])

  if (bids.length === 0 && asks.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-xs text-muted-foreground" style={{ height }}>
        No depth data
      </div>
    )
  }

  // Combine into single chart data with both bid and ask regions
  // We use price as X axis. Bids are below midPrice, asks above.
  const allData = [
    ...bidData.map(d => ({ price: d.price, bidTotal: d.total, askTotal: null })),
    { price: midPrice, bidTotal: bidData.length > 0 ? bidData[bidData.length - 1].total : 0, askTotal: askData.length > 0 ? askData[0].total : 0 },
    ...askData.map(d => ({ price: d.price, bidTotal: null, askTotal: d.total })),
  ]

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={allData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="bidDepth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16c784" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#16c784" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="askDepth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ea3943" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#ea3943" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="price"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => formatPrice(v, { maxDigits: 0 })}
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            minTickGap={50}
          />
          <YAxis
            domain={[0, maxTotal]}
            tickFormatter={(v) => formatCompact(v)}
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            width={40}
            orientation="right"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '11px',
              padding: '6px',
            }}
            labelFormatter={(v) => `Price: ${formatPrice(v as number)}`}
            formatter={(value: any, name: string) => {
              if (value === null || value === undefined) return ['', name]
              return [formatCompact(value), name === 'bidTotal' ? 'Bid Depth' : 'Ask Depth']
            }}
          />
          <Area
            type="step"
            dataKey="bidTotal"
            stroke="#16c784"
            strokeWidth={1}
            fill="url(#bidDepth)"
            isAnimationActive={false}
            connectNulls={false}
          />
          <Area
            type="step"
            dataKey="askTotal"
            stroke="#ea3943"
            strokeWidth={1}
            fill="url(#askDepth)"
            isAnimationActive={false}
            connectNulls={false}
          />
          {midPrice > 0 && (
            <ReferenceLine
              x={midPrice}
              stroke="var(--primary)"
              strokeDasharray="2 2"
              strokeWidth={1}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
