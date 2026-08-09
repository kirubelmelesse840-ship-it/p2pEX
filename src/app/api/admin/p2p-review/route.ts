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
      listing: { select: { asset: true, fiatCurrency: true } },
    },
  })

  return NextResponse.json({
    orders: orders.map(o => ({
      id: o.id,
      asset: o.asset,
      fiatCurrency: o.fiatCurrency,
      amount: o.amount,
      price: o.price,
      total: o.total,
      paymentMethod: o.paymentMethod,
      paymentScreenshot: o.paymentScreenshot,
      status: o.status,
      createdAt: o.createdAt,
      buyer: o.buyer,
      seller: o.seller,
    })),
  })
}
