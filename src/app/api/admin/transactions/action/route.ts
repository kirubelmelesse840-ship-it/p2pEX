import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * POST /api/admin/transactions/action
 * Body: { transactionId, action: 'approve' | 'reject' }
 *
 * All wallet transactions (DEPOSIT, WITHDRAW, INTERNAL_TRANSFER) require
 * admin approval before the user's wallet balance changes.
 *
 *  DEPOSIT:
 *    - On request:   no balance change (only a PENDING tx is created)
 *    - On approve:   balance + available are incremented
 *    - On reject:    no balance change (nothing was ever moved)
 *
 *  WITHDRAW:
 *    - On request:   amount+fee moved from `available` to `locked` (balance unchanged)
 *    - On approve:   locked is decremented AND balance is decremented (funds leave the wallet)
 *    - On reject:    locked is decremented AND available is incremented (funds return to available)
 *
 *  INTERNAL_TRANSFER:
 *    - On request:   amount moved from sender's `available` to `locked` (balance unchanged)
 *    - On approve:   sender's locked+balance decremented; recipient's balance+available incremented
 *    - On reject:    sender's locked decremented, available incremented (funds return to available)
 */
export async function POST(req: NextRequest) {
  const { user: admin, error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })
  const { transactionId, action } = await req.json()
  if (!transactionId || !action) return NextResponse.json({ error: 'transactionId and action required' }, { status: 400 })
  const tx = await db.transaction.findUnique({ where: { id: transactionId }, include: { user: true } })
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tx.status !== 'PENDING') return NextResponse.json({ error: 'Not pending' }, { status: 400 })

  const typeLabel = tx.type === 'DEPOSIT' ? 'Deposit' : tx.type === 'WITHDRAW' ? 'Withdrawal' : 'Transfer'

  if (action === 'approve') {
    if (tx.type === 'DEPOSIT') {
      // Credit the user's wallet — balance + available increase
      let wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: tx.userId, asset: tx.asset } } })
      if (!wallet) wallet = await db.wallet.create({ data: { userId: tx.userId, asset: tx.asset, assetName: tx.asset, balance: 0, available: 0, locked: 0, depositAddress: 'internal' } })
      await db.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: tx.amount }, available: { increment: tx.amount } } })
      await db.transaction.update({ where: { id: transactionId }, data: { status: 'COMPLETED', note: 'Approved by admin', confirmations: tx.requiredConfirmations } })

    } else if (tx.type === 'WITHDRAW') {
      // Deduct the locked funds from the wallet — locked decreases AND balance decreases
      const total = tx.amount + tx.fee
      const wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: tx.userId, asset: tx.asset } } })
      if (wallet) {
        await db.wallet.update({ where: { id: wallet.id }, data: { locked: { decrement: total }, balance: { decrement: total } } })
      }
      await db.transaction.update({ where: { id: transactionId }, data: { status: 'COMPLETED', note: 'Approved by admin', confirmations: 1 } })

    } else if (tx.type === 'INTERNAL_TRANSFER') {
      // toAddress format: "user:000001 (Name)" or legacy "user:000001"
      const idMatch = tx.toAddress?.match(/user:([^\s)]+)/)
      if (idMatch) {
        const recipientId = idMatch[1]
        // Look up by userId (numerical) first, fall back to email for legacy records
        let recipient = await db.user.findFirst({ where: { userId: recipientId } })
        if (!recipient) {
          recipient = await db.user.findUnique({ where: { email: recipientId } })
        }
        if (recipient) {
          let rw = await db.wallet.findUnique({ where: { userId_asset: { userId: recipient.id, asset: tx.asset } } })
          if (!rw) rw = await db.wallet.create({ data: { userId: recipient.id, asset: tx.asset, assetName: tx.asset, balance: 0, available: 0, locked: 0, depositAddress: 'T' + Math.random().toString(36).slice(2, 34).toUpperCase() } })
          // Credit recipient
          await db.wallet.update({ where: { id: rw.id }, data: { balance: { increment: tx.amount }, available: { increment: tx.amount } } })
          await db.transaction.create({ data: { userId: recipient.id, asset: tx.asset, type: 'INTERNAL_TRANSFER', amount: tx.amount, fee: 0, network: 'P2PEX', fromAddress: `user:${tx.user.userId || tx.user.email} (${tx.user.name})`, note: `Transfer from ${tx.user.name} — approved`, status: 'COMPLETED', confirmations: 1, requiredConfirmations: 1 } })
        }
      }
      // Deduct the locked funds from sender — locked decreases AND balance decreases
      const senderWallet = await db.wallet.findUnique({ where: { userId_asset: { userId: tx.userId, asset: tx.asset } } })
      if (senderWallet) {
        await db.wallet.update({ where: { id: senderWallet.id }, data: { locked: { decrement: tx.amount }, balance: { decrement: tx.amount } } })
      }
      await db.transaction.update({ where: { id: transactionId }, data: { status: 'COMPLETED', note: 'Transfer approved', confirmations: 1 } })
    }

    try { await db.adminNotification.create({ data: { userId: tx.userId, title: `${typeLabel} Approved`, message: `Your ${tx.type.toLowerCase()} of ${tx.amount} ${tx.asset} has been approved.`, type: 'success', isRead: false } }) } catch {}
    return NextResponse.json({ ok: true, message: `${tx.type} approved` })
  }

  if (action === 'reject') {
    if (tx.type === 'DEPOSIT') {
      // No balance was ever changed for deposits — just mark as rejected
      await db.transaction.update({ where: { id: transactionId }, data: { status: 'REJECTED', note: 'Rejected by admin' } })

    } else if (tx.type === 'WITHDRAW') {
      // Withdrawals locked amount+fee — return them to available
      const total = tx.amount + tx.fee
      const wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: tx.userId, asset: tx.asset } } })
      if (wallet) await db.wallet.update({ where: { id: wallet.id }, data: { locked: { decrement: total }, available: { increment: total } } })
      await db.transaction.update({ where: { id: transactionId }, data: { status: 'REJECTED', note: 'Rejected by admin' } })

    } else if (tx.type === 'INTERNAL_TRANSFER') {
      // Internal transfer locked amount — return it to available
      const wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: tx.userId, asset: tx.asset } } })
      if (wallet) await db.wallet.update({ where: { id: wallet.id }, data: { locked: { decrement: tx.amount }, available: { increment: tx.amount } } })
      await db.transaction.update({ where: { id: transactionId }, data: { status: 'REJECTED', note: 'Rejected by admin' } })
    }

    try { await db.adminNotification.create({ data: { userId: tx.userId, title: `${typeLabel} Rejected`, message: `Your ${tx.type.toLowerCase()} of ${tx.amount} ${tx.asset} was rejected.`, type: 'warning', isRead: false } }) } catch {}
    return NextResponse.json({ ok: true, message: `${tx.type} rejected` })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
