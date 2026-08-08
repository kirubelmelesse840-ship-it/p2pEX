/**
 * POST /api/p2p/orders - create a P2P order (start a trade)
 * Body: { listingId, amount, paymentMethod }
 *
 * GET /api/p2p/orders - list user's P2P orders
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { listingId, amount, paymentMethod } = await req.json()
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

    const methods = JSON.parse(listing.paymentMethods)
    if (!methods.includes(paymentMethod)) {
      return NextResponse.json({ error: 'Payment method not supported' }, { status: 400 })
    }

    // Determine buyer / seller
    // If listing.side === 'SELL', the listing owner is the seller, the responder is the buyer.
    // If listing.side === 'BUY',  the listing owner is the buyer,  the responder is the seller.
    const buyerId = listing.side === 'SELL' ? user.id : listing.userId
    const sellerId = listing.side === 'SELL' ? listing.userId : user.id

    // For SELL listings, the asset was already locked when the listing was created.
    // For BUY listings, the responder (seller) needs to have the asset, and we lock it now.
    if (listing.side === 'BUY') {
      const sellerWallet = await db.wallet.findUnique({
        where: { userId_asset: { userId: user.id, asset: listing.asset } },
      })
      if (!sellerWallet || sellerWallet.available < amount) {
        return NextResponse.json({ error: `Insufficient ${listing.asset} balance` }, { status: 400 })
      }
      await db.wallet.update({
        where: { id: sellerWallet.id },
        data: {
          available: { decrement: amount },
          locked: { increment: amount },
        },
      })
    }

    // Decrement listing available
    await db.p2PListing.update({
      where: { id: listing.id },
      data: {
        available: { decrement: amount },
        ...(listing.available - amount <= 0 ? { status: 'COMPLETED' } : {}),
      },
    })

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
        status: 'PENDING_PAYMENT',
      },
      include: {
        buyer: { select: { name: true } },
        seller: { select: { name: true } },
      },
    })

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
    const role = url.searchParams.get('role') || 'all' // all | buyer | seller

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
        buyer: { select: { name: true } },
        seller: { select: { name: true } },
      },
    })

    return NextResponse.json({
      orders: orders.map(o => ({
        ...o,
        buyerName: o.buyer.name,
        sellerName: o.seller.name,
        // current user's role
        myRole: o.buyerId === user.id ? 'BUYER' : 'SELLER',
      })),
    })
  } catch (e: any) {
    console.error('[p2p/orders GET]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
