/**
 * POST /api/trade/cancel - cancel an open order
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { cancelOrder } from '@/lib/trading-engine'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { orderId } = await req.json()
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

    const result = await cancelOrder(orderId, user.id)
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[trade/cancel]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
