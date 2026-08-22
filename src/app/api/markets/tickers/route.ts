/**
 * GET /api/markets/tickers - same as /api/markets but only ticker fields
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
    } catch (e: any) {
      console.error('[markets/tickers GET]', e)
      return NextResponse.json({ error: e.message || 'Internal error', tickers: [] }, { status: 500 })
    }

  } catch (e: any) {
    console.error('[user route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
