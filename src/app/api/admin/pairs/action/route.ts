/**
 * POST /api/admin/pairs/action - update or delete a trading pair
 * Body: { pairId, action, ...payload }
 *   action: 'update' (with isActive, lastPrice fields), 'delete'
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })

  const { pairId, action, ...payload } = await req.json()
  if (!pairId || !action) {
    return NextResponse.json({ error: 'pairId and action required' }, { status: 400 })
  }

  const pair = await db.tradingPair.findUnique({ where: { id: pairId } })
  if (!pair) return NextResponse.json({ error: 'Pair not found' }, { status: 404 })

  if (action === 'delete') {
    // Check if there are open orders or trades
    const openOrders = await db.order.count({ where: { pairId, status: { in: ['OPEN', 'PARTIAL'] } } })
    if (openOrders > 0) {
      return NextResponse.json({ error: `Cannot delete: ${openOrders} open orders exist` }, { status: 400 })
    }
    await db.tradingPair.delete({ where: { id: pairId } })
    return NextResponse.json({ ok: true, message: `Pair ${pair.symbol} deleted` })
  }

  if (action === 'update') {
    const updateData: any = {}
    if (typeof payload.isActive === 'boolean') updateData.isActive = payload.isActive
    if (typeof payload.lastPrice === 'number') updateData.lastPrice = payload.lastPrice
    if (typeof payload.priceChangePercent === 'number') updateData.priceChangePercent = payload.priceChangePercent

    const updated = await db.tradingPair.update({
      where: { id: pairId },
      data: updateData,
    })
    return NextResponse.json({ ok: true, pair: updated, message: `Pair ${pair.symbol} updated` })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
