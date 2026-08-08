/**
 * GET /api/admin/listings - list all P2P listings (including inactive)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })

  const url = new URL(req.url)
  const statusFilter = url.searchParams.get('status') || 'all'

  const where: any = {}
  if (statusFilter !== 'all') {
    where.status = statusFilter.toUpperCase()
  }

  const listings = await db.p2PListing.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { id: true, name: true, email: true, kycVerified: true, isBanned: true } },
      _count: { select: { orders: true } },
    },
  })

  return NextResponse.json({
    listings: listings.map(l => ({
      id: l.id,
      asset: l.asset,
      fiatCurrency: l.fiatCurrency,
      side: l.side,
      price: l.price,
      amount: l.amount,
      available: l.available,
      status: l.status,
      paymentMethods: JSON.parse(l.paymentMethods),
      terms: l.terms,
      createdAt: l.createdAt,
      user: l.user,
      ordersCount: l._count.orders,
    })),
  })
}
