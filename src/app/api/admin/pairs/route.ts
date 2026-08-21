/**
 * GET /api/admin/pairs - list all trading pairs (including inactive)
 * POST /api/admin/pairs - create a new trading pair
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    const { error, status } = await requireAdmin(req as unknown as Request)
    if (error) return NextResponse.json({ error }, { status })

    const pairs = await db.tradingPair.findMany({
      orderBy: { symbol: 'asc' },
    })
    return NextResponse.json({ pairs })

  } catch (e: any) {
    console.error('[admin route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    const { error, status } = await requireAdmin(req as unknown as Request)
    if (error) return NextResponse.json({ error }, { status })

    const body = await req.json()
    const { symbol, baseAsset, quoteAsset, baseAssetName, quoteAssetName, lastPrice, isActive } = body
    if (!symbol || !baseAsset || !quoteAsset) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existing = await db.tradingPair.findUnique({ where: { symbol } })
    if (existing) {
      return NextResponse.json({ error: 'Pair already exists' }, { status: 409 })
    }

    const pair = await db.tradingPair.create({
      data: {
        symbol,
        baseAsset,
        quoteAsset,
        baseAssetName: baseAssetName || baseAsset,
        quoteAssetName: quoteAssetName || quoteAsset,
        lastPrice: lastPrice || 1,
        isActive: isActive !== false,
      },
    })
    return NextResponse.json({ pair, message: `Pair ${symbol} created` })

  } catch (e: any) {
    console.error('[admin route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
