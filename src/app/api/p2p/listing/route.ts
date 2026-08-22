/**
 * GET /api/p2p/listing?id=... - get a single listing detail
 * PATCH /api/p2p/listing - update listing status (pause/resume/cancel)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const listing = await db.p2PListing.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, kycLevel: true, kycVerified: true },
        },
      },
    })
    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      listing: {
        ...listing,
        paymentMethods: JSON.parse(listing.paymentMethods),
        user: {
          name: listing.user.name,
          kycVerified: listing.user.kycVerified,
          kycLevel: listing.user.kycLevel,
        },
      },
    })
  } catch (e: any) {
    console.error('[p2p/listing GET]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { id, status } = body
    if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })

    const listing = await db.p2PListing.findUnique({ where: { id } })
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    if (listing.userId !== user.id) return NextResponse.json({ error: 'Not your listing' }, { status: 403 })

    // If canceling/PAUSING a SELL listing, refund locked asset
    if (status === 'CANCELED' || status === 'PAUSED') {
      if (listing.side === 'SELL' && listing.available > 0) {
        const wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: user.id, asset: listing.asset } } })
        if (wallet) {
          await db.wallet.update({
            where: { id: wallet.id },
            data: {
              locked: { decrement: listing.available },
              available: { increment: listing.available },
            },
          })
        }
      }
      await db.p2PListing.update({
        where: { id },
        data: { status, available: status === 'CANCELED' ? 0 : listing.available },
      })
    } else if (status === 'ACTIVE') {
      await db.p2PListing.update({
        where: { id },
        data: { status: 'ACTIVE' },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[p2p/listing PATCH]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
