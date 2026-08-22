/**
 * GET /api/wallet - list user wallets with balances
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    try {
      const user = await getCurrentUser(req as unknown as Request)
      if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

      const wallets = await db.wallet.findMany({
        where: { userId: user.id },
        orderBy: { asset: 'asc' },
      })

      // Compute total USD value
      const prices: Record<string, number> = {
        BTC: 67500, ETH: 3450, BNB: 585, SOL: 165, XRP: 0.62, ADA: 0.45,
        DOGE: 0.16, AVAX: 38, LINK: 18.5, DOT: 7.2, MATIC: 0.72, LTC: 85,
        USDT: 1, USDC: 1,
      }

      let totalUsd = 0
      const walletsWithValue = wallets.map(w => {
        const price = prices[w.asset] || 0
        const usdValue = (w.balance || 0) * price
        totalUsd += usdValue
        return {
          ...w,
          usdPrice: price,
          usdValue,
        }
      })

      return NextResponse.json({
        wallets: walletsWithValue,
        totalUsd,
        fiatCurrency: user.fiatCurrency,
      })
    } catch (e: any) {
      console.error('[wallet]', e)
      return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
    }

  } catch (e: any) {
    console.error('[user route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
