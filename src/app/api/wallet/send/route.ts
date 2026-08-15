/**
 * POST /api/wallet/send - request a withdrawal to an external address
 * Body: { asset, network, address, amount, memo? }
 *
 * The wallet balance is NOT debited here. Instead, the requested amount
 * (amount + fee) is moved from `available` to `locked`. The actual balance
 * deduction happens only when the admin approves the withdrawal.
 * If the admin rejects, the locked funds are returned to `available`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

const NETWORKS_BY_ASSET: Record<string, string[]> = {
  BTC: ['BTC'],
  ETH: ['ERC20'],
  USDT: ['TRC20', 'ERC20', 'BSC'],
  USDC: ['ERC20'],
  BNB: ['BSC'],
  SOL: ['SOL'],
  XRP: ['XRP'],
  ADA: ['ADA'],
  DOGE: ['DOGE'],
  AVAX: ['AVAX'],
  LINK: ['ERC20'],
  DOT: ['DOT'],
  MATIC: ['ERC20'],
  LTC: ['LTC'],
}

const WITHDRAW_FEES: Record<string, Record<string, number>> = {
  BTC: { BTC: 0.0001 },
  ETH: { ERC20: 0.001 },
  USDT: { TRC20: 1, ERC20: 5, BSC: 0.5 },
  USDC: { ERC20: 5 },
  BNB: { BSC: 0.001 },
  SOL: { SOL: 0.01 },
  XRP: { XRP: 0.1 },
  ADA: { ADA: 0.2 },
  DOGE: { DOGE: 5 },
  AVAX: { AVAX: 0.01 },
  LINK: { ERC20: 0.1 },
  DOT: { DOT: 0.05 },
  MATIC: { ERC20: 0.5 },
  LTC: { LTC: 0.0005 },
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { asset, network, address, amount, memo } = await req.json()
    if (!asset || !network || !address || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
    }

    const supported = NETWORKS_BY_ASSET[asset] || []
    if (!supported.includes(network)) {
      return NextResponse.json({ error: `Network ${network} not supported for ${asset}` }, { status: 400 })
    }

    const wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: user.id, asset } } })
    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })

    const fee = WITHDRAW_FEES[asset]?.[network] || 0
    const total = amount + fee

    if (wallet.available < total) {
      return NextResponse.json({
        error: `Insufficient balance. Need ${total} ${asset} (incl. fee ${fee}), available: ${wallet.available}`,
      }, { status: 400 })
    }

    // Bonus restriction: users can't withdraw the bonus until they
    // complete at least 1 P2P order OR deposit at least 10 USDT
    const [completedP2P, approvedDeposits] = await Promise.all([
      db.p2POrder.count({ where: { sellerId: user.id, status: 'COMPLETED' } }),
      db.transaction.aggregate({
        where: { userId: user.id, type: 'DEPOSIT', status: 'COMPLETED', network: { not: 'WELCOME_BONUS' } },
        _sum: { amount: true },
      }),
    ])
    const totalDeposited = approvedDeposits._sum.amount || 0

    if (completedP2P === 0 && totalDeposited < 10) {
      return NextResponse.json({
        error: `You need to complete at least 1 P2P order or deposit at least 10 USDT before withdrawing your bonus balance.`,
      }, { status: 400 })
    }

    // Lock funds: move amount+fee from `available` to `locked`.
    // Balance (total) is NOT changed yet — the actual deduction happens on admin approval.
    await db.wallet.update({
      where: { id: wallet.id },
      data: {
        available: { decrement: total },
        locked: { increment: total },
      },
    })

    // Create a PENDING withdrawal transaction
    const tx = await db.transaction.create({
      data: {
        userId: user.id,
        asset,
        type: 'WITHDRAW',
        amount,
        fee,
        network,
        toAddress: address,
        note: memo || `Withdrawal to ${address.slice(0, 10)}... via ${network} — awaiting admin approval`,
        status: 'PENDING',
        confirmations: 0,
        requiredConfirmations: 1,
      },
    })

    return NextResponse.json({
      transaction: tx,
      message: 'Withdrawal request submitted. Funds are locked pending admin approval.',
    })
  } catch (e: any) {
    console.error('[wallet/send]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
