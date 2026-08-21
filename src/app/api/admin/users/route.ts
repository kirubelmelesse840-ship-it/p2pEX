/**
 * GET /api/admin/users - list users with filters
 * Query: ?search=&status=&kyc=&page=&limit=
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { user, error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })

  const url = new URL(req.url)
  const search = url.searchParams.get('search') || ''
  const statusFilter = url.searchParams.get('status') || 'all' // all, active, banned, admin
  const kycFilter = url.searchParams.get('kyc') || 'all' // all, verified, unverified, level1, level2
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
  const offset = parseInt(url.searchParams.get('offset') || '0')

  const where: any = {}
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (statusFilter === 'active') {
    where.isBanned = false
    where.isActive = true
  } else if (statusFilter === 'banned') {
    where.isBanned = true
  } else if (statusFilter === 'admin') {
    where.isAdmin = true
  }
  if (kycFilter === 'verified') {
    where.kycVerified = true
  } else if (kycFilter === 'unverified') {
    where.kycVerified = false
  } else if (kycFilter === 'pending') {
    where.kycStatus = 'PENDING'
  } else if (kycFilter === 'level1') {
    where.kycLevel = 1
  } else if (kycFilter === 'level2') {
    where.kycLevel = 2
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        userId: true,
        username: true,
        avatar: true,
        email: true,
        name: true,
        kycVerified: true,
        kycLevel: true,
        kycStatus: true,
        kycFullName: true,
        kycDocumentFront: true,
        kycDocumentBack: true,
        kycSubmittedAt: true,
        kycReviewedAt: true,
        kycRejectionReason: true,
        isAdmin: true,
        isActive: true,
        isBanned: true,
        banReason: true,
        fiatCurrency: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            transactions: true,
            wallets: true,
            p2pListings: true,
          },
        },
      },
    }),
    db.user.count({ where }),
  ])

  // Get wallet totals per user (in one extra query for visible users)
  const userIds = users.map(u => u.id)
  const walletSums = await db.wallet.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds } },
    _sum: { balance: true },
  })
  const walletSumMap = new Map(walletSums.map(w => [w.userId, w._sum.balance || 0]))

  return NextResponse.json({
    users: users.map(u => ({
      ...u,
      totalBalance: walletSumMap.get(u.id) || 0,
    })),
    total,
    offset,
    limit,
  })
}
