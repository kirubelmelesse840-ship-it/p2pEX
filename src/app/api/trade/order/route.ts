/**
 * POST /api/trade/order - place a new order (LIMIT or MARKET)
 * GET  /api/trade/order - list user's open orders
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { placeOrder, getOrderBook } from '@/lib/trading-engine'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { symbol, side, type, price, quantity } = body
    if (!symbol || !side || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (side !== 'BUY' && side !== 'SELL') {
      return NextResponse.json({ error: 'Invalid side' }, { status: 400 })
    }
    if (type !== 'LIMIT' && type !== 'MARKET') {
      return NextResponse.json({ error: 'Invalid order type' }, { status: 400 })
    }
    if (typeof price !== 'number' || typeof quantity !== 'number') {
      return NextResponse.json({ error: 'Price and quantity must be numbers' }, { status: 400 })
    }
    if (quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 })
    }
    if (type === 'LIMIT' && price <= 0) {
      return NextResponse.json({ error: 'Price must be greater than 0 for LIMIT orders' }, { status: 400 })
    }

    const result = await placeOrder({ userId: user.id, symbol, side, type, price, quantity })
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[trade/order POST]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const url = new URL(req.url)
    const status = url.searchParams.get('status') || 'OPEN'
    const symbol = url.searchParams.get('symbol')

    const orders = await db.order.findMany({
      where: {
        userId: user.id,
        ...(symbol ? { symbol } : {}),
        ...(status === 'OPEN' ? { status: { in: ['OPEN', 'PARTIAL'] } } : { status }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ orders })
  } catch (e: any) {
    console.error('[trade/order GET]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
