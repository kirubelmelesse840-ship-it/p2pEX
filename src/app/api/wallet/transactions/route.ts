/**
 * GET /api/wallet/transactions - list user's deposit/withdraw history
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
    const asset = url.searchParams.get('asset')

    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        ...(asset ? { asset } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return NextResponse.json({ transactions })
  } catch (e: any) {
    console.error('[wallet/transactions]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
