/**
 * GET /api/admin/notifications - get recent notifications for the admin
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    const { error, status } = await requireAdmin(req as unknown as Request)
    if (error) return NextResponse.json({ error }, { status })

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const newUsers = await db.user.findMany({
      where: { createdAt: { gte: oneDayAgo }, isAdmin: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, email: true, createdAt: true },
    })

    const pendingKyc = await db.user.findMany({
      where: { kycStatus: 'PENDING', isAdmin: false },
      orderBy: { kycSubmittedAt: 'desc' },
      take: 10,
      select: { id: true, name: true, email: true, kycSubmittedAt: true },
    })

    const pendingPayments = await db.p2POrder.findMany({
      where: { status: 'PENDING_REVIEW' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { buyer: { select: { name: true, email: true } } },
    })

    const recentTrades = await db.trade.findMany({
      where: { createdAt: { gte: oneDayAgo } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, symbol: true, price: true, quantity: true, total: true, createdAt: true },
    })

    const notifications: Array<{
      id: string
      type: 'user' | 'kyc' | 'payment' | 'trade'
      title: string
      description: string
      time: string
      priority: 'high' | 'medium' | 'low'
    }> = []

    for (const p of pendingPayments) {
      notifications.push({
        id: `payment-${p.id}`,
        type: 'payment',
        title: 'Payment Review Required',
        description: `${p.buyer.name} submitted payment proof for ${p.amount} ${p.asset} (${p.total} ${p.fiatCurrency})`,
        time: p.createdAt.toISOString(),
        priority: 'high',
      })
    }

    for (const u of pendingKyc) {
      notifications.push({
        id: `kyc-${u.id}`,
        type: 'kyc',
        title: 'KYC Verification Pending',
        description: `${u.name} (${u.email}) submitted KYC documents for review`,
        time: (u.kycSubmittedAt || new Date()).toISOString(),
        priority: 'high',
      })
    }

    for (const u of newUsers) {
      notifications.push({
        id: `user-${u.id}`,
        type: 'user',
        title: 'New User Registered',
        description: `${u.name} (${u.email}) joined P2PEX`,
        time: u.createdAt.toISOString(),
        priority: 'medium',
      })
    }

    for (const t of recentTrades) {
      notifications.push({
        id: `trade-${t.id}`,
        type: 'trade',
        title: 'Trade Executed',
        description: `${t.quantity} ${t.symbol.replace(/USDT|USDC|BTC|ETH|BNB$/, '')} at ${t.price} (${t.total} total)`,
        time: t.createdAt.toISOString(),
        priority: 'low',
      })
    }

    notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    const highPriorityCount = notifications.filter(n => n.priority === 'high').length

    return NextResponse.json({
      notifications: notifications.slice(0, 20),
      count: notifications.length,
      highPriorityCount,
    })

  } catch (e: any) {
    console.error('[admin route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
