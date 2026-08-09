/**
 * POST /api/admin/p2p-review/action
 * Body: { orderId, action }
 *   action: 'approve' — marks payment as verified, moves to PAID status (seller can release crypto)
 *           'reject'  — cancels the order, refunds locked assets
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { user: admin, error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })

  const { orderId, action } = await req.json()
  if (!orderId || !action) {
    return NextResponse.json({ error: 'orderId and action required' }, { status: 400 })
  }

  const order = await db.p2POrder.findUnique({
    where: { id: orderId },
    include: { listing: true },
  })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (action === 'approve') {
    if (order.status !== 'PENDING_REVIEW') {
      return NextResponse.json({ error: 'Order is not pending review' }, { status: 400 })
    }
    // Approve the payment — move to PAID so seller can release crypto
    await db.p2POrder.update({
      where: { id: orderId },
      data: { status: 'PAID' },
    })
    return NextResponse.json({ ok: true, message: 'Payment verified. Seller can now release crypto.' })
  }

  if (action === 'reject') {
    // Reject — cancel the order and refund locked assets to seller
    if (order.listing.side === 'SELL') {
      const sellerWallet = await db.wallet.findUnique({
        where: { userId_asset: { userId: order.sellerId, asset: order.asset } },
      })
      if (sellerWallet) {
        await db.wallet.update({
          where: { id: sellerWallet.id },
          data: {
            locked: { decrement: order.amount },
            available: { increment: order.amount },
          },
        })
      }
    }
    // Restore listing available
    await db.p2PListing.update({
      where: { id: order.listingId },
      data: {
        available: { increment: order.amount },
        ...(order.listing.status === 'COMPLETED' ? { status: 'ACTIVE' } : {}),
      },
    })
    await db.p2POrder.update({
      where: { id: orderId },
      data: { status: 'CANCELED' },
    })
    return NextResponse.json({ ok: true, message: 'Payment rejected. Order canceled and assets refunded.' })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
