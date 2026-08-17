/**
 * GET /api/admin/p2p-review - list P2P orders with payment screenshots pending admin review
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })

  const url = new URL(req.url)
  const statusFilter = url.searchParams.get('status') || 'PENDING_REVIEW'

  const orders = await db.p2POrder.findMany({
    where: { status: statusFilter },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
      listing: { select: { asset: true, fiatCurrency: true, paymentMethods: true, paymentDetails: true } },
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
      }
    }),
  })
}
