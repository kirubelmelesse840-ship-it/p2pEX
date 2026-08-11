/**
 * POST /api/p2p/orders - create a P2P order (start a trade)
 * Body: { listingId, amount, paymentMethod, paymentScreenshot?, sellerPaymentMethod?, sellerAccountNumber?, sellerAccountName? }
 *
 * GET /api/p2p/orders - list user's P2P orders
 *
 * Flow:
 *  - BUY order (user buying USDT from a SELL listing):
 *    -> Lock the seller's USDT (move from available to locked)
 *    -> Create order with status PENDING_REVIEW (admin must approve payment)
 *    -> Admin approves -> transfer USDT from seller to buyer, mark COMPLETED
 *    -> Admin rejects -> refund seller's locked USDT, mark CANCELED
 *
 *  - SELL order (user selling USDT to a BUY listing):
 *    -> Lock the seller's (responder's) USDT
 *    -> Create order with status PENDING_REVIEW (sent to admin automatically)
 *    -> Admin finishes -> transfer USDT from seller to buyer, mark COMPLETED
 *    -> Admin rejects -> refund seller's locked USDT, mark CANCELED
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json()
    const { listingId, amount, paymentMethod, paymentScreenshot,
            sellerPaymentMethod, sellerAccountNumber, sellerAccountName } = body
    console.log('[p2p/orders POST] Received:', { listingId, amount, paymentMethod, hasScreenshot: !!paymentScreenshot, sellerPaymentMethod, hasSellerAccount: !!sellerAccountNumber })

    if (!listingId || !amount || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const listing = await db.p2PListing.findUnique({
      where: { id: listingId },
      include: { user: true },
    })
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    if (listing.status !== 'ACTIVE') return NextResponse.json({ error: 'Listing not active' }, { status: 400 })
    if (listing.userId === user.id) return NextResponse.json({ error: 'Cannot trade with yourself' }, { status: 400 })

    // For SELL listings (buyer is buying), payment screenshot is required
    if (listing.side === 'SELL' && !paymentScreenshot) {
      return NextResponse.json({ error: 'Payment screenshot is required before placing the order' }, { status: 400 })
    }

    // For BUY listings (user is selling), require seller payment details
    if (listing.side === 'BUY') {
      if (!sellerAccountNumber || !sellerAccountName) {
        return NextResponse.json({ error: 'Seller payment details are required' }, { status: 400 })
      }
    }

    const fiatTotal = amount * listing.price
    if (fiatTotal < listing.minOrder) {
      return NextResponse.json({ error: `Minimum order is ${listing.minOrder} ${listing.fiatCurrency}` }, { status: 400 })
    }
    if (fiatTotal > listing.maxOrder) {
      return NextResponse.json({ error: `Maximum order is ${listing.maxOrder} ${listing.fiatCurrency}` }, { status: 400 })
    }
    if (amount > listing.available) {
      return NextResponse.json({ error: `Only ${listing.available} ${listing.asset} available` }, { status: 400 })
    }

    // Parse payment methods and validate
    let methods: string[] = []
    try {
      methods = typeof listing.paymentMethods === 'string'
        ? JSON.parse(listing.paymentMethods)
        : listing.paymentMethods
    } catch {
      methods = []
    }
    if (!methods.includes(paymentMethod)) {
      return NextResponse.json({ error: `Payment method "${paymentMethod}" not supported. Available: ${methods.join(', ')}` }, { status: 400 })
    }

    // Determine buyer / seller
    const buyerId = listing.side === 'SELL' ? user.id : listing.userId
    const sellerId = listing.side === 'SELL' ? listing.userId : user.id

    // Lock the seller's USDT for BOTH buy and sell orders
    // (ensures the USDT is reserved and can't be spent elsewhere while the trade is pending)
    const sellerWallet = await db.wallet.findUnique({
      where: { userId_asset: { userId: sellerId, asset: listing.asset } },
    })
    if (!sellerWallet) {
      console.error('[p2p/orders POST] Seller wallet not found:', { sellerId, asset: listing.asset })
      return NextResponse.json({ error: `Seller doesn't have a ${listing.asset} wallet yet. Please contact support.` }, { status: 400 })
    }
    if (sellerWallet.available < amount) {
      console.error('[p2p/orders POST] Insufficient balance:', { available: sellerWallet.available, requested: amount })
      return NextResponse.json({ error: `Seller has insufficient ${listing.asset} balance (available: ${sellerWallet.available}, needed: ${amount})` }, { status: 400 })
    }
    await db.wallet.update({
      where: { id: sellerWallet.id },
      data: {
        available: { decrement: amount },
        locked: { increment: amount },
      },
    })

    // Decrement listing available
    await db.p2PListing.update({
      where: { id: listing.id },
      data: {
        available: { decrement: amount },
        ...(listing.available - amount <= 0 ? { status: 'COMPLETED' } : {}),
      },
    })

    // Build seller payment details for SELL orders (user selling USDT)
    let sellerPaymentDetails: any = null
    if (listing.side === 'BUY' && sellerPaymentMethod && sellerAccountNumber && sellerAccountName) {
      sellerPaymentDetails = JSON.stringify({
        method: sellerPaymentMethod,
        accountNumber: sellerAccountNumber,
        accountName: sellerAccountName,
      })
    }

    const order = await db.p2POrder.create({
      data: {
        listingId: listing.id,
        buyerId,
        sellerId,
        asset: listing.asset,
        fiatCurrency: listing.fiatCurrency,
        amount,
        price: listing.price,
        total: fiatTotal,
        paymentMethod,
        paymentScreenshot: paymentScreenshot || null,
        // Store seller payment details for SELL orders
        sellerPaymentMethod: sellerPaymentMethod || null,
        sellerAccountNumber: sellerAccountNumber || null,
        sellerAccountName: sellerAccountName || null,
        // ALL orders go to admin review — no transaction completes without admin approval
        status: 'PENDING_REVIEW',
      },
      include: {
        buyer: { select: { name: true } },
        seller: { select: { name: true } },
      },
    })

    // Send notifications to both buyer and seller — tell them to wait patiently
    const buyerMsg = listing.side === 'SELL'
      ? `Your buy order for ${amount} ${listing.asset} has been submitted. The admin is checking both sides. Please wait patiently — your ${listing.asset} will be credited automatically once approved.`
      : `A seller has accepted your buy ad for ${amount} ${listing.asset}. The admin is checking both sides. Please wait patiently for approval.`
    const sellerMsg = listing.side === 'SELL'
      ? `${user.name} has placed a buy order for ${amount} ${listing.asset}. The admin is checking both sides. Please wait patiently — your ${listing.asset} will be transferred once approved.`
      : `Your sell order for ${amount} ${listing.asset} has been submitted. The admin is checking both sides. Please wait patiently — your ${listing.asset} will be transferred to the buyer once approved.`

    try {
      await db.adminNotification.create({
        data: {
          userId: buyerId,
          title: '⏳ Order Under Admin Review',
          message: buyerMsg,
          type: 'info',
          isRead: false,
        },
      })
    } catch {}
    try {
      await db.adminNotification.create({
        data: {
          userId: sellerId,
          title: '⏳ Order Under Admin Review',
          message: sellerMsg,
          type: 'info',
          isRead: false,
        },
      })
    } catch {}

    // Send push notifications
    try {
      const { sendPushToUser } = await import('@/lib/push')
      await Promise.allSettled([
        sendPushToUser(buyerId, {
          title: '⏳ Order Under Admin Review',
          body: `The admin is checking both sides. Please wait patiently — your ${listing.asset} will be transferred once approved.`,
          url: '/',
          tag: `p2p-order-${order.id}`,
        }),
        sendPushToUser(sellerId, {
          title: '⏳ Order Under Admin Review',
          body: `The admin is checking both sides. Please wait patiently — your ${listing.asset} will be transferred once approved.`,
          url: '/',
          tag: `p2p-order-${order.id}`,
        }),
      ])
    } catch {}

    return NextResponse.json({
      order: {
        ...order,
        buyerName: order.buyer.name,
        sellerName: order.seller.name,
      },
    })
  } catch (e: any) {
    console.error('[p2p/orders POST]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const url = new URL(req.url)
    const role = url.searchParams.get('role') || 'all'

    const where = role === 'buyer'
      ? { buyerId: user.id }
      : role === 'seller'
      ? { sellerId: user.id }
      : { OR: [{ buyerId: user.id }, { sellerId: user.id }] }

    const orders = await db.p2POrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        buyer: { select: { name: true, userId: true, username: true } },
        seller: { select: { name: true, userId: true, username: true } },
        listing: {
          select: {
            side: true,
            paymentMethods: true,
            paymentDetails: true,
            user: { select: { name: true } },
          },
        },
      },
    })

    return NextResponse.json({
      orders: orders.map(o => {
        // Determine the ad poster's display name from the listing's paymentDetails
        let adPosterName: string | null = null
        try {
          const pd = typeof o.listing.paymentDetails === 'string'
            ? JSON.parse(o.listing.paymentDetails)
            : o.listing.paymentDetails
          const methods = typeof o.listing.paymentMethods === 'string'
            ? JSON.parse(o.listing.paymentMethods)
            : o.listing.paymentMethods
          if (pd && methods && methods.length > 0) {
            const firstMethod = methods[0]
            if (pd[firstMethod]?.name) adPosterName = pd[firstMethod].name
          }
        } catch {}
        if (!adPosterName) adPosterName = o.listing.user?.name || null

        const buyerName = o.buyer.userId || o.buyer.username || o.buyer.name
        const sellerName = adPosterName || o.seller.name

        return {
          ...o,
          buyerName,
          sellerName,
          adPosterName,
          myRole: o.buyerId === user.id ? 'BUYER' : 'SELLER',
        }
      }),
    })
  } catch (e: any) {
    console.error('[p2p/orders GET]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
