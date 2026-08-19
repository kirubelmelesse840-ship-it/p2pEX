/**
 * POST /api/kyc/submit - submit KYC verification request
 * Body: { fullName, nationality, idType, documentFront, documentBack }
 *
 * Sets kycStatus to PENDING. Admin must approve via /api/admin/users/action.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json()
    const { fullName, nationality, idType, documentFront, documentBack } = body

    // Validate required fields (Date of Birth removed)
    if (!fullName || !nationality || !idType) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (!documentFront) {
      return NextResponse.json({ error: 'Front of ID document photo is required' }, { status: 400 })
    }
    if (!documentBack) {
      return NextResponse.json({ error: 'Back of ID document photo is required' }, { status: 400 })
    }

    // Check if already verified or pending
    const existing = await db.user.findUnique({ where: { id: user.id } })
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (existing.kycStatus === 'PENDING') {
      return NextResponse.json({ error: 'Your KYC is already under review. Please wait for admin approval.' }, { status: 400 })
    }
    if (existing.kycStatus === 'APPROVED' && existing.kycVerified) {
      return NextResponse.json({ error: 'Your account is already verified.' }, { status: 400 })
    }

    // Submit KYC (images are already compressed client-side)
    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        kycStatus: 'PENDING',
        kycFullName: fullName,
        kycNationality: nationality,
        kycIdType: idType,
        kycDocumentFront: documentFront,
        kycDocumentBack: documentBack || null,
        kycSubmittedAt: new Date(),
        kycRejectionReason: null,
        // Reset verified status until admin approves
        kycVerified: false,
        kycLevel: 0,
      },
    })

    return NextResponse.json({
      ok: true,
      message: 'KYC submitted successfully. Your application will be reviewed shortly.',
      kycStatus: 'PENDING',
    })
  } catch (e: any) {
    console.error('[kyc/submit]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}

/**
 * GET /api/kyc/submit - get current user's KYC submission details
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const full = await db.user.findUnique({ where: { id: user.id } })
    if (!full) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({
      kycStatus: full.kycStatus,
      kycVerified: full.kycVerified,
      kycLevel: full.kycLevel,
      kycFullName: full.kycFullName,
      kycDateOfBirth: full.kycDateOfBirth,
      kycNationality: full.kycNationality,
      kycIdType: full.kycIdType,
      kycIdNumber: full.kycIdNumber,
      kycAddress: full.kycAddress,
      kycSubmittedAt: full.kycSubmittedAt,
      kycReviewedAt: full.kycReviewedAt,
      kycRejectionReason: full.kycRejectionReason,
    })
  } catch (e: any) {
    console.error('[kyc/submit GET]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
