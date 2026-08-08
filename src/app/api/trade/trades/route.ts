/**
 * GET /api/trade/trades - user trade history
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
    const symbol = url.searchParams.get('symbol')

    const trades = await db.trade.findMany({
      where: {
        OR: [{ buyerId: user.id }, { sellerId: user.id }],
        ...(symbol ? { symbol } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return NextResponse.json({
      trades: trades.map(t => ({
        ...t,
        side: t.buyerId === user.id ? 'BUY' : 'SELL',
      })),
    })
  } catch (e: any) {
    console.error('[trade/trades]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
