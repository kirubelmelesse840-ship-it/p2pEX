/**
 * GET /api/admin/p2p-review - list P2P orders with payment screenshots pending admin review
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    const { error, status } = await requireAdmin(req as unknown as Request)
    if (error) return NextResponse.json({ error }, { status })

    const url = new URL(req.url)
    const statusFilter = url.searchParams.get('status') || 'PENDING_REVIEW'

    const orders = await db.p2POrder.findMany({
      where: { status: statusFilter },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        buyer: { select: { id: true, userId: true, username: true, name: true, email: true, kycVerified: true, kycLevel: true } },
        seller: { select: { id: true, userId: true, username: true, name: true, email: true, kycVerified: true, kycLevel: true } },
        listing: { select: { side: true, asset: true, fiatCurrency: true, paymentMethods: true, paymentDetails: true } },
      },
    })

    return NextResponse.json({
      orders: orders.map(o => {
        // Extract the ad person name from the listing's paymentDetails
        let adPersonName = null
        try {
          const methods = JSON.parse(o.listing.paymentMethods || '[]')
          const details = JSON.parse(o.listing.paymentDetails || '{}')
          const firstMethod = methods[0]
          if (firstMethod && details[firstMethod]) {
            adPersonName = details[firstMethod].name || null
          }
        } catch {}
        // Determine trade direction:
        // - listing.side === 'SELL' → ad poster is SELLING crypto → buyer pays FIAT (this is a BUY order from user's perspective)
        // - listing.side === 'BUY'  → ad poster is BUYING crypto → counterparty sends CRYPTO (this is a SELL order from user's perspective)
        const tradeDirection = o.listing.side === 'SELL' ? 'BUY' : 'SELL'
        return {
          id: o.id,
          asset: o.asset,
          fiatCurrency: o.fiatCurrency,
          amount: o.amount,
          price: o.price,
          total: o.total,
          paymentMethod: o.paymentMethod,
          paymentScreenshot: o.paymentScreenshot,
          sellerPaymentMethod: o.sellerPaymentMethod,
          sellerAccountNumber: o.sellerAccountNumber,
          sellerAccountName: o.sellerAccountName,
          status: o.status,
          createdAt: o.createdAt,
          buyer: o.buyer,
          seller: o.seller,
          adPersonName, // The merchant name from the ad (e.g. "Kirubel", "Melesech")
          tradeDirection, // "BUY" or "SELL" — what the buyer is doing
          listingSide: o.listing.side, // raw listing side for debugging
        }
      }),
    })

  } catch (e: any) {
    console.error('[admin route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
