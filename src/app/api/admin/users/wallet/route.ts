/**
 * POST /api/admin/users/wallet - adjust a user's wallet balance
 * Body: { userId, asset, action, amount }
 *   action: 'credit' (increase balance) | 'debit' (decrease balance)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { user: admin, error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })

  const { userId, asset, action, amount } = await req.json()
  if (!userId || !asset || !action || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (amount <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
  }
  if (action !== 'credit' && action !== 'debit') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const wallet = await db.wallet.findUnique({ where: { userId_asset: { userId, asset } } })
  if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })

  const delta = action === 'credit' ? amount : -amount
  const newBalance = wallet.balance + delta
  const newAvailable = wallet.available + delta

  if (newBalance < 0) {
    return NextResponse.json({ error: 'Insufficient balance for debit' }, { status: 400 })
  }

  await db.wallet.update({
    where: { id: wallet.id },
    data: {
      balance: newBalance,
      available: Math.max(newAvailable, 0),
    },
  })

  // Record as a transaction for audit
  await db.transaction.create({
    data: {
      userId,
      asset,
      type: action === 'credit' ? 'DEPOSIT' : 'WITHDRAW',
      amount,
      fee: 0,
      network: 'ADMIN',
      fromAddress: action === 'credit' ? `admin:${admin.email}` : undefined,
      toAddress: action === 'debit' ? `admin:${admin.email}` : undefined,
      note: `Admin ${action} by ${admin.email}`,
      status: 'COMPLETED',
      confirmations: 1,
      requiredConfirmations: 1,
    },
  })

  return NextResponse.json({
    ok: true,
    message: `${action === 'credit' ? 'Credited' : 'Debited'} ${amount} ${asset} for user`,
    newBalance,
  })
}
