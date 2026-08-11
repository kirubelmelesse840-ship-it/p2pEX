/**
 * POST /api/p2p/order - update P2P order status
 * Body: { orderId, action }
 *   action: 'mark_paid'      -> PAID (buyer marks fiat sent)
 *           'release'        -> RELEASED then COMPLETED (seller releases crypto)
 *           'cancel'         -> CANCELED
 *           'dispute'        -> DISPUTED
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { orderId, action } = await req.json()
    if (!orderId || !action) return NextResponse.json({ error: 'orderId and action required' }, { status: 400 })

    const order = await db.p2POrder.findUnique({
      where: { id: orderId },
      include: { listing: true },
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const isBuyer = order.buyerId === user.id
    const isSeller = order.sellerId === user.id
    if (!isBuyer && !isSeller) {
      return NextResponse.json({ error: 'Not your order' }, { status: 403 })
    }

    if (action === 'mark_paid') {
      if (!isBuyer) return NextResponse.json({ error: 'Only buyer can mark as paid' }, { status: 403 })
      if (order.status !== 'PENDING_PAYMENT') {
        return NextResponse.json({ error: 'Order not in PENDING_PAYMENT state' }, { status: 400 })
      }
      await db.p2POrder.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      })
      return NextResponse.json({ ok: true, status: 'PAID' })
    }

    if (action === 'release') {
      if (!isSeller) return NextResponse.json({ error: 'Only seller can release' }, { status: 403 })
      if (order.status !== 'PAID') {
        return NextResponse.json({ error: 'Order must be PAID before release' }, { status: 400 })
      }

      // Transfer asset: from seller's locked balance to buyer's wallet
      const sellerWallet = await db.wallet.findUnique({
        where: { userId_asset: { userId: order.sellerId, asset: order.asset } },
      })
      if (!sellerWallet) return NextResponse.json({ error: 'Seller wallet missing' }, { status: 500 })

      const buyerWallet = await db.wallet.findUnique({
        where: { userId_asset: { userId: order.buyerId, asset: order.asset } },
      })
      if (!buyerWallet) return NextResponse.json({ error: 'Buyer wallet missing' }, { status: 500 })

      await db.$transaction([
        db.wallet.update({
          where: { id: sellerWallet.id },
          data: {
            locked: { decrement: order.amount },
            balance: { decrement: order.amount },
          },
        }),
        db.wallet.update({
          where: { id: buyerWallet.id },
          data: {
            balance: { increment: order.amount },
            available: { increment: order.amount },
          },
        }),
        db.p2POrder.update({
          where: { id: orderId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        }),
      ])

      // Create transaction records for both parties
      await db.transaction.create({
        data: {
          userId: order.buyerId,
          asset: order.asset,
          type: 'DEPOSIT',
          amount: order.amount,
          fee: 0,
          network: 'P2P',
          fromAddress: `P2P:${order.sellerId}`,
          txHash: `p2p-${order.id}`,
          status: 'COMPLETED',
          confirmations: 1,
          requiredConfirmations: 1,
          note: `P2P trade #${order.id} - bought ${order.amount} ${order.asset} for ${order.total} ${order.fiatCurrency} via ${order.paymentMethod}`,
        },
      })
      await db.transaction.create({
        data: {
          userId: order.sellerId,
          asset: order.asset,
          type: 'WITHDRAW',
          amount: order.amount,
          fee: 0,
          network: 'P2P',
          toAddress: `P2P:${order.buyerId}`,
          txHash: `p2p-${order.id}`,
          status: 'COMPLETED',
          confirmations: 1,
          requiredConfirmations: 1,
          note: `P2P trade #${order.id} - sold ${order.amount} ${order.asset} for ${order.total} ${order.fiatCurrency} via ${order.paymentMethod}`,
        },
      })

      return NextResponse.json({ ok: true, status: 'COMPLETED' })
    }

    if (action === 'cancel') {
      if (order.status === 'COMPLETED' || order.status === 'RELEASED') {
        return NextResponse.json({ error: 'Cannot cancel completed order' }, { status: 400 })
      }
      // Refund seller's locked asset
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
      return NextResponse.json({ ok: true, status: 'CANCELED' })
    }

    if (action === 'dispute') {
      await db.p2POrder.update({
        where: { id: orderId },
        data: { status: 'DISPUTED' },
      })
      return NextResponse.json({ ok: true, status: 'DISPUTED' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    console.error('[p2p/order POST]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
