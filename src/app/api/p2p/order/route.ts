/**
 * POST /api/p2p/order - update P2P order status
 * Body: { orderId, action }
 *   action: 'mark_paid'          -> PAID (buyer marks fiat sent)
 *           'payment_received'   -> PAYMENT_RECEIVED (seller confirms fiat received, notifies admin)
 *           'release'            -> RELEASED then COMPLETED (seller releases crypto)
 *           'cancel'             -> CANCELED
 *           'dispute'            -> DISPUTED
 *
 * Sell flow (user selling USDT):
 *   1. Order created → PENDING_REVIEW (seller's USDT is locked)
 *   2. Seller clicks "Payment Received" → PAYMENT_RECEIVED (admin is notified)
 *   3. Admin approves → COMPLETED (USDT debited from seller, credited to buyer)
 *   4. Admin rejects → CANCELED (USDT returned to seller)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { orderId, action } = body
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

    if (action === 'payment_received') {
      // Seller confirms they received the fiat payment → notifies admin
      if (!isSeller) return NextResponse.json({ error: 'Only seller can confirm payment received' }, { status: 403 })
      if (order.status !== 'PENDING_REVIEW') {
        return NextResponse.json({ error: 'Order must be in PENDING_REVIEW state' }, { status: 400 })
      }
      await db.p2POrder.update({
        where: { id: orderId },
        data: { status: 'PAYMENT_RECEIVED' },
      })

      // Notify admin
      try {
        await db.adminNotification.create({
          data: {
            userId: order.buyerId,
            title: '✅ Payment Received — Seller Confirmed',
            message: `The seller confirmed receiving payment for order #${orderId.slice(-8)}. ${order.amount} ${order.asset} is ready to be released. Please review and approve.`,
            type: 'info',
            isRead: false,
          },
        })
      } catch {}

      // Notify buyer
      try {
        await db.adminNotification.create({
          data: {
            userId: order.buyerId,
            title: '✅ Seller Confirmed Payment',
            message: `The seller confirmed receiving your payment for ${order.amount} ${order.asset}. Our team is now reviewing and will release your crypto shortly.`,
            type: 'success',
            isRead: false,
          },
        })
      } catch {}

      // Send push notification to admin (best-effort)
      try {
        const { sendPushToUser } = await import('@/lib/push')
        const admin = await db.user.findFirst({ where: { isAdmin: true } })
        if (admin) {
          sendPushToUser(admin.id, {
            title: '✅ Payment Received — Seller Confirmed',
            body: `Order #${orderId.slice(-8)}: Seller confirmed receiving payment. Review and approve to release ${order.amount} ${order.asset}.`,
            url: '/',
            tag: `p2p-payment-${orderId}`,
          }).catch(() => {})
        }
      } catch {}

      return NextResponse.json({ ok: true, status: 'PAYMENT_RECEIVED' })
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
