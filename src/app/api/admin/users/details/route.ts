import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
export async function GET(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    const { error, status } = await requireAdmin(req as unknown as Request)
    if (error) return NextResponse.json({ error }, { status })
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, userId: true, username: true, avatar: true, email: true, name: true, kycVerified: true, kycLevel: true, kycStatus: true, kycFullName: true, kycDateOfBirth: true, kycNationality: true, kycIdType: true, kycIdNumber: true, kycAddress: true, kycDocumentFront: true, kycDocumentBack: true, kycSubmittedAt: true, kycReviewedAt: true, kycRejectionReason: true, isAdmin: true, isActive: true, isBanned: true, banReason: true, fiatCurrency: true, createdAt: true } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const [wallets, transactions, p2pOrders, orders] = await Promise.all([
      db.wallet.findMany({ where: { userId }, orderBy: { asset: 'asc' } }),
      db.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      db.p2POrder.findMany({ where: { OR: [{ buyerId: userId }, { sellerId: userId }] }, orderBy: { createdAt: 'desc' }, take: 30, include: { listing: { select: { asset: true, fiatCurrency: true, side: true } } } }),
      db.order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    ])
    return NextResponse.json({ user, wallets, transactions, p2pOrders, orders })

  } catch (e: any) {
    console.error('[admin route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
