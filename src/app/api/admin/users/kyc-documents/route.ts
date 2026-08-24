/**
 * GET /api/admin/users/kyc-documents?userId=XXX
 *
 * Lightweight route that ONLY returns KYC document images + basic KYC info.
 * Much faster than the full /api/admin/users/details route (which also fetches
 * wallets, transactions, P2P orders, etc. — way too much data just to show
 * 2 document images).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { error, status } = await requireAdmin(req as unknown as Request)
    if (error) return NextResponse.json({ error }, { status })

    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    // Only fetch KYC-related fields — NOT wallets/transactions/orders
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        kycStatus: true,
        kycLevel: true,
        kycVerified: true,
        kycFullName: true,
        kycIdType: true,
        kycIdNumber: true,
        kycDateOfBirth: true,
        kycNationality: true,
        kycAddress: true,
        kycDocumentFront: true,
        kycDocumentBack: true,
        kycSubmittedAt: true,
        kycReviewedAt: true,
        kycRejectionReason: true,
      },
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({ user })
  } catch (e: any) {
    console.error('[admin/users/kyc-documents]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
