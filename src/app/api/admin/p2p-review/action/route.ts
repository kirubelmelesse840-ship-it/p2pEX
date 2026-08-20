/**
 * POST /api/admin/p2p-review/action
 * Body: { orderId, action }
 *   action: 'approve' — admin verifies payment, transfers USDT from seller to buyer, marks COMPLETED
 *           'reject'  — admin rejects, cancels the order, refunds locked USDT to seller
 *
 * ALL P2P orders require admin approval before any balance change.
 * On approve: USDT is transferred from seller's locked balance to buyer's wallet.
 * On reject:  USDT is returned from seller's locked to available.
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
    include: { listing: true, buyer: true, seller: true },
  })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (action === 'approve' || action === 'finish') {
        if (order.status !== 'PENDING_REVIEW' && order.status !== 'PAYMENT_RECEIVED') {
      return NextResponse.json({ error: `This order is already ${order.status}. No action taken.` }, { status: 400 })
    }

    // Transfer USDT from seller's locked balance to buyer's wallet
    const sellerWallet = await db.wallet.findUnique({
      where: { userId_asset: { userId: order.sellerId, asset: order.asset } },
    })
    if (!sellerWallet) {
      return NextResponse.json({ error: 'Seller wallet not found' }, { status: 500 })
    }

    // Find or create buyer wallet
    let buyerWallet = await db.wallet.findUnique({
      where: { userId_asset: { userId: order.buyerId, asset: order.asset } },
    })
    if (!buyerWallet) {
      buyerWallet = await db.wallet.create({
        data: {
          userId: order.buyerId,
          asset: order.asset,
          assetName: order.asset,
          balance: 0,
          available: 0,
          locked: 0,
          depositAddress: 'T' + Math.random().toString(36).slice(2, 34).toUpperCase(),
        },
      })
    }

    // Atomic transfer: deduct from seller's locked+balance, add to buyer's available+balance
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
        note: `P2P trade #${order.id.slice(-8)} — bought ${order.amount} ${order.asset} for ${order.total} ${order.fiatCurrency} via ${order.paymentMethod} (approved by our team)`,
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
        note: `P2P trade #${order.id.slice(-8)} — sold ${order.amount} ${order.asset} for ${order.total} ${order.fiatCurrency} via ${order.paymentMethod} (approved by our team)`,
      },
    })

    // Notify both parties
    try {
      await db.adminNotification.create({
        data: {
          userId: order.buyerId,
          title: '✅ P2P Order Completed',
          message: `Your buy order for ${order.amount} ${order.asset} has been approved. The crypto has been credited to your wallet.`,
          type: 'success',
          isRead: false,
        },
      })
    } catch {}
    try {
      await db.adminNotification.create({
        data: {
          userId: order.sellerId,
          title: '✅ P2P Order Completed',
          message: `Your sell order for ${order.amount} ${order.asset} has been approved. The crypto has been sent to the buyer.`,
          type: 'success',
          isRead: false,
        },
      })
    } catch {}

    return NextResponse.json({ ok: true, message: 'Order completed. USDT transferred from seller to buyer.' })
  }

  if (action === 'reject') {
    // Prevent rejecting an already-completed or already-canceled order
    if (order.status === 'COMPLETED' || order.status === 'CANCELED') {
      return NextResponse.json({ error: `This order is already ${order.status}. No action taken.` }, { status: 400 })
    }
    // Refund seller's locked USDT
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

    // Notify both parties
    try {
      await db.adminNotification.create({
        data: {
          userId: order.buyerId,
          title: '❌ P2P Order Rejected',
          message: `Your buy order for ${order.amount} ${order.asset} was rejected by our team.`,
          type: 'warning',
          isRead: false,
        },
      })
    } catch {}
    try {
      await db.adminNotification.create({
        data: {
          userId: order.sellerId,
          title: '❌ P2P Order Rejected',
          message: `Your sell order for ${order.amount} ${order.asset} was rejected by our team. Your crypto has been returned to your wallet.`,
          type: 'warning',
          isRead: false,
        },
      })
    } catch {}

    return NextResponse.json({ ok: true, message: 'Order rejected. Seller USDT refunded.' })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
