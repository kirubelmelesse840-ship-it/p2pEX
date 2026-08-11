/**
 * POST /api/wallet/transfer - internal transfer between P2PEX users
 * Body: { asset, amount, recipient, note? }
 *
 * `recipient` may be:
 *   - a numerical user ID  (e.g. "000001")
 *   - a @username          (e.g. "@kirubel")
 *   - a username without @ (e.g. "kirubel")
 *
 * The transfer is NOT instant. Funds are locked on the sender's wallet and
 * the transaction is created with status=PENDING. The recipient's wallet is
 * only credited when an admin approves the transfer (see
 * /api/admin/transactions/action). If the admin rejects, the locked funds are
 * returned to the sender's available balance.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { asset, amount, recipient, note } = await req.json()
    if (!asset || !amount || !recipient) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
    }

    // Normalize the recipient identifier — accept numerical userId or @username
    const raw = String(recipient).trim()
    if (!raw) {
      return NextResponse.json({ error: 'Enter a recipient' }, { status: 400 })
    }

    // Strip leading "@" if present
    const usernameForm = raw.startsWith('@') ? raw.slice(1) : raw
    // A numerical user ID (e.g. "000001") — look up by userId field
    const isNumericalId = /^\d+$/.test(usernameForm)

    let recipientUser: { id: string; userId: string | null; username: string | null; name: string; email: string } | null = null
    if (isNumericalId) {
      recipientUser = await db.user.findFirst({
        where: { userId: usernameForm },
        select: { id: true, userId: true, username: true, name: true, email: true },
      })
    } else {
      // Look up by username (case-insensitive)
      recipientUser = await db.user.findFirst({
        where: { username: { equals: usernameForm, mode: 'insensitive' } },
        select: { id: true, userId: true, username: true, name: true, email: true },
      })
    }

    if (!recipientUser) {
      return NextResponse.json({
        error: `No user found with ${isNumericalId ? 'ID' : 'username'} ${raw}`,
      }, { status: 404 })
    }
    if (recipientUser.id === user.id) {
      return NextResponse.json({ error: 'Cannot transfer to yourself' }, { status: 400 })
    }

    // Find sender wallet
    const senderWallet = await db.wallet.findUnique({
      where: { userId_asset: { userId: user.id, asset } },
    })
    if (!senderWallet) {
      return NextResponse.json({ error: `You don't have a ${asset} wallet` }, { status: 404 })
    }

    if (senderWallet.available < amount) {
      return NextResponse.json({
        error: `Insufficient balance. Available: ${senderWallet.available} ${asset}`,
      }, { status: 400 })
    }

    // Lock funds on sender's wallet — move from `available` to `locked`.
    // Balance (total) is unchanged. The recipient is NOT credited yet.
    await db.wallet.update({
      where: { id: senderWallet.id },
      data: {
        available: { decrement: amount },
        locked: { increment: amount },
      },
    })

    // Build a human-readable recipient label for the admin UI
    const recipientLabel = recipientUser.userId
      ? `user:${recipientUser.userId} (${recipientUser.name})`
      : `user:${recipientUser.email}`

    // Create a PENDING transaction for the sender (admin must approve)
    const senderTx = await db.transaction.create({
      data: {
        userId: user.id,
        asset,
        type: 'INTERNAL_TRANSFER',
        amount,
        fee: 0,
        network: 'P2PEX',
        toAddress: recipientLabel,
        note: note || `Internal transfer to ${recipientUser.name} (ID: ${recipientUser.userId || recipientUser.email})`,
        status: 'PENDING',
        confirmations: 0,
        requiredConfirmations: 1,
      },
    })

    return NextResponse.json({
      transaction: senderTx,
      message: `Transfer request submitted. ${amount} ${asset} is locked pending admin approval. Recipient: ${recipientUser.name} (ID: ${recipientUser.userId || recipientUser.email}).`,
    })
  } catch (e: any) {
    console.error('[wallet/transfer]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
