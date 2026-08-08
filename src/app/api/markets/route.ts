/**
 * GET /api/markets - list all trading pairs with 24h stats
 * Returns the static pair list from DB. Live prices are pushed via socket.io.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const pairs = await db.tradingPair.findMany({
    where: { isActive: true },
    orderBy: { quoteVolume24h: 'desc' },
  })
  return NextResponse.json({
    pairs: pairs.map(p => ({
      symbol: p.symbol,
      baseAsset: p.baseAsset,
      quoteAsset: p.quoteAsset,
      baseAssetName: p.baseAssetName,
      quoteAssetName: p.quoteAssetName,
      lastPrice: p.lastPrice,
      priceChangePercent: p.priceChangePercent,
      high24h: p.high24h,
      low24h: p.low24h,
      volume24h: p.volume24h,
      quoteVolume24h: p.quoteVolume24h,
    })),
  })
}
