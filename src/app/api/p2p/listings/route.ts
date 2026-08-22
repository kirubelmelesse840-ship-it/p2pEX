/**
 * GET /api/p2p/listings - browse P2P listings
 * Query: ?asset=USDT&fiat=USD&side=BUY
 *
 * POST /api/p2p/listings - create new P2P listing (authenticated)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    try {
      const url = new URL(req.url)
      const asset = url.searchParams.get('asset')
      const fiat = url.searchParams.get('fiat')
      const side = url.searchParams.get('side')

      const listings = await db.p2PListing.findMany({
        where: {
          status: 'ACTIVE',
          available: { gt: 0 },
          ...(asset ? { asset } : {}),
          ...(fiat ? { fiatCurrency: fiat } : {}),
          ...(side ? { side } : {}),
        },
        include: {
          user: {
            select: { id: true, name: true, kycLevel: true, kycVerified: true },
          },
        },
        orderBy: { price: 'asc' },
        take: 100,
      })

      return NextResponse.json({
        listings: listings.map(l => ({
          id: l.id,
          asset: l.asset,
          fiatCurrency: l.fiatCurrency,
          side: l.side,
          price: l.price,
          amount: l.amount,
          available: l.available,
          minOrder: l.minOrder,
          maxOrder: l.maxOrder,
          paymentMethods: JSON.parse(l.paymentMethods),
          paymentDetails: l.paymentDetails ? JSON.parse(l.paymentDetails) : null,
          terms: l.terms,
          tradesCount: l.tradesCount,
          rating: l.rating,
          status: l.status,
          createdAt: l.createdAt,
          user: {
            name: l.user.name,
            kycVerified: l.user.kycVerified,
            kycLevel: l.user.kycLevel,
          },
        })),
      })
    } catch (e: any) {
      console.error('[p2p/listings GET]', e)
      return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
    }

  } catch (e: any) {
    console.error('[user route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    try {
      const user = await getCurrentUser(req as unknown as Request)
      if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

      const body = await req.json().catch(() => ({}))
      const { asset, fiatCurrency, side, price, amount, minOrder, maxOrder, paymentMethods, terms } = body

      if (!asset || !fiatCurrency || !side || !price || !amount) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }
      if (side !== 'BUY' && side !== 'SELL') {
        return NextResponse.json({ error: 'Invalid side' }, { status: 400 })
      }
      if (typeof price !== 'number' || typeof amount !== 'number' || price <= 0 || amount <= 0) {
        return NextResponse.json({ error: 'Price and amount must be positive numbers' }, { status: 400 })
      }
      if (!Array.isArray(paymentMethods) || paymentMethods.length === 0) {
        return NextResponse.json({ error: 'At least one payment method required' }, { status: 400 })
      }

      // For SELL listings, check the user has the asset balance
      if (side === 'SELL') {
        const wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: user.id, asset } } })
        if (!wallet || wallet.available < amount) {
          return NextResponse.json({
            error: `Insufficient ${asset} balance to create sell listing`,
          }, { status: 400 })
        }
        // Lock the asset
        await db.wallet.update({
          where: { id: wallet.id },
          data: {
            available: { decrement: amount },
            locked: { increment: amount },
          },
        })
      }

      const listing = await db.p2PListing.create({
        data: {
          userId: user.id,
          asset,
          fiatCurrency,
          side,
          price,
          amount,
          available: amount,
          minOrder: minOrder || 10,
          maxOrder: maxOrder || amount * price,
          paymentMethods: JSON.stringify(paymentMethods),
          terms: terms || '',
          status: 'ACTIVE',
        },
      })

      return NextResponse.json({ listing })
    } catch (e: any) {
      console.error('[p2p/listings POST]', e)
      return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
    }

  } catch (e: any) {
    console.error('[user route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
