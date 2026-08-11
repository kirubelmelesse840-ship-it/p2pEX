/**
 * POST /api/wallet/deposit - create a pending deposit request
 * Body: { asset, network, amount }
 *
 * The wallet balance is NOT changed here. A PENDING transaction is created
 * and the admin must approve it before the user's balance is credited.
 * If the admin rejects, nothing changes (no funds were ever moved).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { asset, network, amount } = await req.json()
    if (!asset || !network || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
    }

    // Find or create the user's wallet for this asset
    let wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: user.id, asset } } })
    if (!wallet) {
      wallet = await db.wallet.create({
        data: {
          userId: user.id,
          asset,
          assetName: asset,
          balance: 0,
          available: 0,
          locked: 0,
          depositAddress: 'T' + Math.random().toString(36).slice(2, 34).toUpperCase(),
        },
      })
    }

    // Create a PENDING deposit transaction — do NOT credit the wallet.
    // The admin will review and approve/reject via /api/admin/transactions/action
    const tx = await db.transaction.create({
      data: {
        userId: user.id,
        asset,
        type: 'DEPOSIT',
        amount,
        fee: 0,
        network,
        fromAddress: 'external_deposit',
        txHash: '0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
        status: 'PENDING',
        confirmations: 0,
        requiredConfirmations: 1,
        note: `Deposit request via ${network} — awaiting admin approval`,
      },
    })

    return NextResponse.json({
      transaction: tx,
      message: 'Deposit request submitted. Your balance will be credited after admin approval.',
    })
  } catch (e: any) {
    console.error('[wallet/deposit]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
