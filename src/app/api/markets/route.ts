/**
 * GET /api/markets - list all trading pairs with 24h stats
 * Returns the static pair list from DB. Live prices are pushed via socket.io.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
// AUTO-TRY-CATCH
  try {

    try {
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
    } catch (e: any) {
      console.error('[markets GET]', e)
      return NextResponse.json({ error: e.message || 'Internal error', pairs: [] }, { status: 500 })
    }

  } catch (e: any) {
    console.error('[user route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
