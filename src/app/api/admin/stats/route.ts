/**
 * GET /api/admin/stats - dashboard statistics (optimized)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { user, error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Run ALL queries in parallel — single round trip
  const [
    totalUsers, activeUsers, bannedUsers, adminUsers, kycPending, kycUnverified, kycPendingReview,
    totalPairs, activePairs,
    totalOrders, openOrders, filledOrders, canceledOrders,
    totalTrades, trades24hData,
    totalP2PListings, activeP2PListings,
    totalP2POrders, pendingP2POrders,
    totalTransactions, pendingTransactions,
    totalWallets,
    wallets,
    recentTrades,
    recentUsersList,
    recentUsers7d,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isActive: true, isBanned: false } }),
    db.user.count({ where: { isBanned: true } }),
    db.user.count({ where: { isAdmin: true } }),
    db.user.count({ where: { kycStatus: 'PENDING' } }),
    db.user.count({ where: { kycVerified: false } }),
    db.user.count({ where: { kycStatus: 'PENDING' } }),
    db.tradingPair.count(),
    db.tradingPair.count({ where: { isActive: true } }),
    db.order.count(),
    db.order.count({ where: { status: { in: ['OPEN', 'PARTIAL'] } } }),
    db.order.count({ where: { status: 'FILLED' } }),
    db.order.count({ where: { status: 'CANCELED' } }),
    db.trade.count(),
    db.trade.aggregate({ where: { createdAt: { gte: oneDayAgo } }, _sum: { total: true }, _count: true }),
    db.p2PListing.count(),
    db.p2PListing.count({ where: { status: 'ACTIVE' } }),
    db.p2POrder.count(),
    db.p2POrder.count({ where: { status: { in: ['PENDING_REVIEW', 'PAYMENT_RECEIVED', 'PENDING_PAYMENT', 'PAID'] } } }),
    db.transaction.count(),
    db.transaction.count({ where: { status: 'PENDING' } }),
    db.wallet.count(),
    db.wallet.findMany({ select: { asset: true, balance: true, locked: true } }),
    db.trade.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { buyer: { select: { name: true } }, seller: { select: { name: true } } } }),
    db.user.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, createdAt: true, kycVerified: true, kycLevel: true, isBanned: true } }),
    db.user.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true }, orderBy: { createdAt: 'asc' } }),
  ])

  // Compute totals from wallets (in-memory, no DB)
  const prices: Record<string, number> = {
    BTC: 67500, ETH: 3450, BNB: 585, SOL: 165, XRP: 0.62, ADA: 0.45,
    DOGE: 0.16, AVAX: 38, LINK: 18.5, DOT: 7.2, MATIC: 0.72, LTC: 85,
    USDT: 1, USDC: 1,
  }
  const totalUsdValue = wallets.reduce((sum, w) => sum + (w.balance || 0) * (prices[w.asset] || 0), 0)
  const totalLockedValue = wallets.reduce((sum, w) => sum + (w.locked || 0) * (prices[w.asset] || 0), 0)

  // Group recent users by day
  const userGrowth: Array<{ day: string; count: number }> = []
  for (let i = 6; i >= 0; i--) {
    const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const dayStr = day.toISOString().slice(0, 10)
    const count = recentUsers7d.filter(u => u.createdAt.toISOString().slice(0, 10) === dayStr).length
    userGrowth.push({ day: dayStr, count })
  }

  return NextResponse.json({
    stats: {
      users: { total: totalUsers, active: activeUsers, banned: bannedUsers, admins: adminUsers, kycPending, kycUnverified, kycPendingReview },
      pairs: { total: totalPairs, active: activePairs },
      orders: { total: totalOrders, open: openOrders, filled: filledOrders, canceled: canceledOrders },
      trades: { total: totalTrades, last24h: trades24hData._count, volume24hUsd: trades24hData._sum.total || 0 },
      p2p: { listings: totalP2PListings, active: activeP2PListings, orders: totalP2POrders, pending: pendingP2POrders },
      transactions: { total: totalTransactions, pending: pendingTransactions },
      wallets: { total: totalWallets, totalUsdValue, totalLockedValue },
    },
    userGrowth,
    recentTrades: recentTrades.map(t => ({
      id: t.id, symbol: t.symbol, price: t.price, quantity: t.quantity, total: t.total,
      buyer: t.buyer.name, seller: t.seller.name, createdAt: t.createdAt,
    })),
    recentUsers: recentUsersList,
  })
}
