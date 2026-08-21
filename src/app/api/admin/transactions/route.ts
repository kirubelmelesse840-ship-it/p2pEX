/**
 * GET /api/admin/transactions - list all transactions platform-wide
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
    const typeFilter = url.searchParams.get('type') || 'all'
    const statusFilter = url.searchParams.get('status') || 'all'
    const assetFilter = url.searchParams.get('asset') || 'all'
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500)

    const where: any = {}
    if (typeFilter !== 'all') where.type = typeFilter.toUpperCase()
    if (statusFilter !== 'all') where.status = statusFilter.toUpperCase()
    if (assetFilter !== 'all') where.asset = assetFilter.toUpperCase()

    const transactions = await db.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({
      transactions: transactions.map(t => ({
        ...t,
        userName: t.user.name,
        userEmail: t.user.email,
      })),
    })

  } catch (e: any) {
    console.error('[admin route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
