/**
 * POST /api/admin/listings/action - moderate a P2P listing
 * Body: { listingId, action }
 *   action: 'pause' | 'resume' | 'cancel' | 'delete'
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })

  const { listingId, action } = await req.json()
  if (!listingId || !action) {
    return NextResponse.json({ error: 'listingId and action required' }, { status: 400 })
  }

  const listing = await db.p2PListing.findUnique({ where: { id: listingId } })
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  if (action === 'pause') {
    await db.p2PListing.update({ where: { id: listingId }, data: { status: 'PAUSED' } })
    return NextResponse.json({ ok: true, message: `Listing ${listing.id.slice(-6)} paused` })
  }
  if (action === 'resume') {
    if (listing.available > 0) {
      await db.p2PListing.update({ where: { id: listingId }, data: { status: 'ACTIVE' } })
      return NextResponse.json({ ok: true, message: `Listing ${listing.id.slice(-6)} resumed` })
    } else {
      return NextResponse.json({ error: 'Cannot resume listing with no available amount' }, { status: 400 })
    }
  }
  if (action === 'cancel') {
    // If SELL listing with available amount, refund the seller's locked asset
    if (listing.side === 'SELL' && listing.available > 0) {
      const wallet = await db.wallet.findUnique({
        where: { userId_asset: { userId: listing.userId, asset: listing.asset } },
      })
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
      where: { id: listingId },
      data: { status: 'CANCELED', available: 0 },
    })
    return NextResponse.json({ ok: true, message: `Listing ${listing.id.slice(-6)} canceled and refunded` })
  }
  if (action === 'delete') {
    await db.p2PListing.delete({ where: { id: listingId } })
    return NextResponse.json({ ok: true, message: `Listing ${listing.id.slice(-6)} deleted` })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
