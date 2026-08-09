/**
 * POST /api/wallet/deposit - simulate deposit (mock - instantly credits)
 * Body: { asset, network, amount }
 * In a real exchange, deposits come from on-chain monitoring.
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

    const wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: user.id, asset } } })
    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })

    // Create pending transaction
    const tx = await db.transaction.create({
      data: {
        userId: user.id,
        asset,
        type: 'DEPOSIT',
        amount,
        fee: 0,
        network,
        fromAddress: 'T' + Math.random().toString(36).slice(2, 34).toUpperCase(),
        txHash: '0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
        status: 'PENDING',
        confirmations: 0,
        requiredConfirmations: asset === 'BTC' ? 3 : asset === 'ETH' ? 12 : 1,
      },
    })

    // Simulate confirmation - credit immediately for demo
    setTimeout(async () => {
      try {
        await db.$transaction([
          db.wallet.update({
            where: { id: wallet.id },
            data: {
              balance: { increment: amount },
              available: { increment: amount },
            },
          }),
          db.transaction.update({
            where: { id: tx.id },
            data: {
              status: 'COMPLETED',
              confirmations: tx.requiredConfirmations,
            },
          }),
        ])
        console.log(`[deposit] credited ${amount} ${asset} to user ${user.id}`)
      } catch (e) {
        console.error('[wallet/deposit] credit error', e)
      }
    }, 3000)

    return NextResponse.json({
      transaction: tx,
      message: 'Deposit received. Awaiting confirmations.',
    })
  } catch (e: any) {
    console.error('[wallet/deposit]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
