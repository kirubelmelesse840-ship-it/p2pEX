/**
 * GET /api/markets/tickers - same as /api/markets but only ticker fields
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const pairs = await db.tradingPair.findMany({
    where: { isActive: true },
    orderBy: { quoteVolume24h: 'desc' },
  })
  return NextResponse.json({
    tickers: pairs.map(p => ({
      symbol: p.symbol,
      baseAsset: p.baseAsset,
      quoteAsset: p.quoteAsset,
      lastPrice: p.lastPrice,
      priceChangePercent: p.priceChangePercent,
      high24h: p.high24h,
      low24h: p.low24h,
      volume24h: p.volume24h,
      quoteVolume24h: p.quoteVolume24h,
    })),
  })
}
