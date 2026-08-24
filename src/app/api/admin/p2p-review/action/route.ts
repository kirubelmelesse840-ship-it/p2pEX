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
// AUTO-TRY-CATCH
  try {

    const getDepositAddress = (asset: string) => {
      const random = Math.random().toString(36).slice(2, 34).toUpperCase()
      if (asset === 'BTC') return 'bc1' + random.toLowerCase()
      if (asset === 'ETH' || asset === 'USDT' || asset === 'USDC') return '0x' + random.toLowerCase().slice(0, 40)
      if (asset === 'BNB') return '0x' + random.toLowerCase().slice(0, 40)
      if (asset === 'SOL') return random.toLowerCase()
      return 'T' + random // Default TRC20-style
    }

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
            depositAddress: getDepositAddress(order.asset),
          },
        })
      }

      // Precondition check: verify seller has enough locked balance before transferring
      const sellerWalletCheck = await db.wallet.findUnique({
        where: { userId_asset: { userId: order.sellerId, asset: order.asset } },
      })
      if (!sellerWalletCheck || sellerWalletCheck.locked < order.amount) {
        return NextResponse.json({ error: `Seller has insufficient locked ${order.asset} (locked: ${sellerWalletCheck?.locked || 0}, required: ${order.amount})` }, { status: 400 })
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

      // Notify both parties — in-app + push notification to phone
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
        // Push notification to buyer's phone
        try {
          const { sendPushToUser } = await import('@/lib/push')
          await sendPushToUser(order.buyerId, {
            title: '✅ P2P Order Completed',
            body: `Your buy order for ${order.amount} ${order.asset} has been approved. Crypto credited to your wallet.`,
            url: '/',
            tag: `p2p-${order.id}`,
          })
        } catch (e) { console.error('[push] buyer failed:', e) }
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
        // Push notification to seller's phone
        try {
          const { sendPushToUser } = await import('@/lib/push')
          await sendPushToUser(order.sellerId, {
            title: '✅ P2P Order Completed',
            body: `Your sell order for ${order.amount} ${order.asset} has been approved. Crypto sent to buyer.`,
            url: '/',
            tag: `p2p-${order.id}`,
          })
        } catch (e) { console.error('[push] seller failed:', e) }
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

      // Notify both parties — in-app + push notification to phone
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
        try {
          const { sendPushToUser } = await import('@/lib/push')
          await sendPushToUser(order.buyerId, {
            title: '❌ P2P Order Rejected',
            body: `Your buy order for ${order.amount} ${order.asset} was rejected.`,
            url: '/',
            tag: `p2p-${order.id}`,
          })
        } catch (e) { console.error('[push] buyer reject failed:', e) }
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
        try {
          const { sendPushToUser } = await import('@/lib/push')
          await sendPushToUser(order.sellerId, {
            title: '❌ P2P Order Rejected',
            body: `Your sell order for ${order.amount} ${order.asset} was rejected. Crypto returned to your wallet.`,
            url: '/',
            tag: `p2p-${order.id}`,
          })
        } catch (e) { console.error('[push] seller reject failed:', e) }
      } catch {}

      return NextResponse.json({ ok: true, message: 'Order rejected. Seller USDT refunded.' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (e: any) {
    console.error('[admin route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
