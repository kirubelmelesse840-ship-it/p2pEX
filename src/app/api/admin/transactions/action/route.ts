import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
export async function POST(req: NextRequest) {
  const { user: admin, error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })
  const { transactionId, action } = await req.json()
  if (!transactionId || !action) return NextResponse.json({ error: 'transactionId and action required' }, { status: 400 })
  const tx = await db.transaction.findUnique({ where: { id: transactionId }, include: { user: true } })
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tx.status !== 'PENDING') return NextResponse.json({ error: 'Not pending' }, { status: 400 })
  if (action === 'approve') {
    if (tx.type === 'DEPOSIT') {
      let wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: tx.userId, asset: tx.asset } } })
      if (!wallet) wallet = await db.wallet.create({ data: { userId: tx.userId, asset: tx.asset, assetName: tx.asset, balance: 0, available: 0, locked: 0, depositAddress: 'internal' } })
      await db.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: tx.amount }, available: { increment: tx.amount } } })
      await db.transaction.update({ where: { id: transactionId }, data: { status: 'COMPLETED', note: 'Approved by admin' } })
    } else if (tx.type === 'WITHDRAW') {
      await db.transaction.update({ where: { id: transactionId }, data: { status: 'COMPLETED', note: 'Approved by admin' } })
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
          await db.wallet.update({ where: { id: rw.id }, data: { balance: { increment: tx.amount }, available: { increment: tx.amount } } })
          await db.transaction.create({ data: { userId: recipient.id, asset: tx.asset, type: 'INTERNAL_TRANSFER', amount: tx.amount, fee: 0, network: 'P2PEX', fromAddress: `user:${tx.user.userId || tx.user.email} (${tx.user.name})`, note: `Transfer from ${tx.user.name} — approved`, status: 'COMPLETED', confirmations: 1, requiredConfirmations: 1 } })
        }
      }
      // Deduct the locked funds from sender now that the transfer is approved
      const senderWallet = await db.wallet.findUnique({ where: { userId_asset: { userId: tx.userId, asset: tx.asset } } })
      if (senderWallet) {
        await db.wallet.update({ where: { id: senderWallet.id }, data: { locked: { decrement: tx.amount }, balance: { decrement: tx.amount } } })
      }
      await db.transaction.update({ where: { id: transactionId }, data: { status: 'COMPLETED', note: 'Transfer approved' } })
    }
    try { await db.adminNotification.create({ data: { userId: tx.userId, title: `${tx.type === 'DEPOSIT' ? 'Deposit' : tx.type === 'WITHDRAW' ? 'Withdrawal' : 'Transfer'} Approved`, message: `Your ${tx.type.toLowerCase()} of ${tx.amount} ${tx.asset} has been approved.`, type: 'success', isRead: false } }) } catch {}
    return NextResponse.json({ ok: true, message: `${tx.type} approved` })
  }
  if (action === 'reject') {
    if (tx.type === 'WITHDRAW') {
      // Withdrawals already debited balance + available — refund both
      const refund = tx.amount + tx.fee
      const wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: tx.userId, asset: tx.asset } } })
      if (wallet) await db.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: refund }, available: { increment: refund } } })
    } else if (tx.type === 'INTERNAL_TRANSFER') {
      // Internal transfer only moved amount from `available` to `locked` (balance unchanged).
      // On reject, move it back: decrement locked, increment available.
      const wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: tx.userId, asset: tx.asset } } })
      if (wallet) await db.wallet.update({ where: { id: wallet.id }, data: { locked: { decrement: tx.amount }, available: { increment: tx.amount } } })
    }
    await db.transaction.update({ where: { id: transactionId }, data: { status: 'REJECTED', note: 'Rejected by admin' } })
    try { await db.adminNotification.create({ data: { userId: tx.userId, title: `${tx.type} Rejected`, message: `Your ${tx.type.toLowerCase()} of ${tx.amount} ${tx.asset} was rejected.`, type: 'warning', isRead: false } }) } catch {}
    return NextResponse.json({ ok: true, message: `${tx.type} rejected` })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
