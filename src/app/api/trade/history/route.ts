/**
 * GET /api/trade/history?symbol=BTCUSDT - recent market trades for a symbol
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const symbol = url.searchParams.get('symbol') || 'BTCUSDT'
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
    const trades = await db.trade.findMany({
      where: { symbol },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return NextResponse.json({ trades })
  } catch (e: any) {
    console.error('[trade/history]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
