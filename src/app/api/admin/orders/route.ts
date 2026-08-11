/**
 * GET /api/admin/orders - list all orders platform-wide
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })

  const url = new URL(req.url)
  const statusFilter = url.searchParams.get('status') || 'all'
  const symbolFilter = url.searchParams.get('symbol') || 'all'
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500)

  const where: any = {}
  if (statusFilter !== 'all') {
    if (statusFilter === 'OPEN') {
      where.status = { in: ['OPEN', 'PARTIAL'] }
    } else {
      where.status = statusFilter.toUpperCase()
    }
  }
  if (symbolFilter !== 'all') where.symbol = symbolFilter.toUpperCase()

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({
    orders: orders.map(o => ({
      ...o,
      userName: o.user.name,
      userEmail: o.user.email,
    })),
  })
}
