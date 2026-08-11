/**
 * GET /api/trade/orderbook?symbol=BTCUSDT - get aggregated order book
 * GET /api/trade/orderbook?symbol=BTCUSDT&type=history - recent trades
 */
import { NextRequest, NextResponse } from 'next/server'
import { getOrderBook } from '@/lib/trading-engine'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const symbol = url.searchParams.get('symbol') || 'BTCUSDT'
    const type = url.searchParams.get('type') || 'depth'

    if (type === 'history') {
      const trades = await db.trade.findMany({
        where: { symbol },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return NextResponse.json({ trades })
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const book = await getOrderBook(symbol, limit)
    return NextResponse.json(book)
  } catch (e: any) {
    console.error('[trade/orderbook]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
