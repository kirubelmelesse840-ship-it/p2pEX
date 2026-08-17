/**
 * POST /api/admin/listings/action - moderate a P2P listing
 * Body: { listingId, action, ...fields }
 *   action: 'pause' | 'resume' | 'cancel' | 'delete' | 'edit'
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })

  const body = await req.json()
  const { listingId, action } = body
  if (!listingId || !action) {
    return NextResponse.json({ error: 'listingId and action required' }, { status: 400 })
  }

  const listing = await db.p2PListing.findUnique({ where: { id: listingId } })
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  if (action === 'edit') {
    const {
      price,
      minOrder,
      maxOrder,
      tradesCount,
      rating,
      advertiserName,
      accountNumber,
      terms,
    } = body

    const updateData: any = {}
    if (typeof price === 'number' && !isNaN(price)) updateData.price = price
    if (typeof minOrder === 'number' && !isNaN(minOrder)) updateData.minOrder = minOrder
    if (typeof maxOrder === 'number' && !isNaN(maxOrder)) updateData.maxOrder = maxOrder
    if (typeof tradesCount === 'number' && !isNaN(tradesCount)) updateData.tradesCount = tradesCount
    if (typeof rating === 'number' && !isNaN(rating)) updateData.rating = rating
    if (typeof terms === 'string') updateData.terms = terms

    // Update paymentDetails — set name & account/phone/address for each method
    const methods: string[] = JSON.parse(listing.paymentMethods)
    const existingDetails: Record<string, any> = listing.paymentDetails ? JSON.parse(listing.paymentDetails) : {}
    const newDetails: Record<string, any> = {}
    for (const m of methods) {
      const prev = existingDetails[m] || {}
      newDetails[m] = {
        ...prev,
        name: advertiserName || prev.name || '',
      }
      if (accountNumber) {
        // Heuristic: crypto networks use 'address', phone-based methods use 'phone', bank methods use 'account'
        if (['TRC20', 'BEP20', 'ERC20', 'SOL', 'MATIC', 'ARB', 'OP', 'AVAX', 'BNB'].includes(m)) {
          newDetails[m].address = accountNumber
        } else if (['Telebirr', 'CBE Birr', 'CBE'].includes(m)) {
          // Telebirr/CBE uses phone number
          newDetails[m].phone = accountNumber
        } else {
          // Banks use account number
          newDetails[m].account = accountNumber
        }
      }
    }
    updateData.paymentDetails = JSON.stringify(newDetails)

    await db.p2PListing.update({ where: { id: listingId }, data: updateData })
    return NextResponse.json({ ok: true, message: `Listing ${listing.id.slice(-6)} updated` })
  }


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
