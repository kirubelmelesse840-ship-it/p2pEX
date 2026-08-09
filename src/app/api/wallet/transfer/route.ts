/**
 * POST /api/wallet/transfer - internal transfer between P2PEX users
 * Body: { asset, amount, recipientEmail, note? }
 *
 * Transfers crypto from the sender's wallet to another P2PEX user's wallet
 * of the same asset. Instant, on-chain fee-free.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { asset, amount, recipientEmail, note } = await req.json()
    if (!asset || !amount || !recipientEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
    }

    // Find recipient
    const recipient = await db.user.findUnique({ where: { email: recipientEmail.toLowerCase() } })
    if (!recipient) {
      return NextResponse.json({ error: `No user found with email ${recipientEmail}` }, { status: 404 })
    }
    if (recipient.id === user.id) {
      return NextResponse.json({ error: 'Cannot transfer to yourself' }, { status: 400 })
    }

    // Find or create recipient wallet
    let recipientWallet = await db.wallet.findUnique({
      where: { userId_asset: { userId: recipient.id, asset } },
    })
    if (!recipientWallet) {
      // Auto-create empty wallet for recipient
      recipientWallet = await db.wallet.create({
        data: {
          userId: recipient.id,
          asset,
          assetName: asset,
          balance: 0,
          available: 0,
          locked: 0,
          depositAddress: 'T' + Math.random().toString(36).slice(2, 34).toUpperCase(),
        },
      })
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

    // Atomic transfer: debit sender, credit recipient
    await db.$transaction([
      db.wallet.update({
        where: { id: senderWallet.id },
        data: {
          balance: { decrement: amount },
          available: { decrement: amount },
        },
      }),
      db.wallet.update({
        where: { id: recipientWallet.id },
        data: {
          balance: { increment: amount },
          available: { increment: amount },
        },
      }),
    ])

    // Create transaction records for both parties
    const senderTx = await db.transaction.create({
      data: {
        userId: user.id,
        asset,
        type: 'INTERNAL_TRANSFER',
        amount,
        fee: 0,
        network: 'P2PEX',
        toAddress: `user:${recipient.email}`,
        note: note || `Internal transfer to ${recipient.name} (${recipient.email})`,
        status: 'COMPLETED',
        confirmations: 1,
        requiredConfirmations: 1,
      },
    })

    await db.transaction.create({
      data: {
        userId: recipient.id,
        asset,
        type: 'INTERNAL_TRANSFER',
        amount,
        fee: 0,
        network: 'P2PEX',
        fromAddress: `user:${user.email}`,
        note: note || `Internal transfer from ${user.name} (${user.email})`,
        status: 'COMPLETED',
        confirmations: 1,
        requiredConfirmations: 1,
      },
    })

    return NextResponse.json({
      transaction: senderTx,
      message: `Successfully sent ${amount} ${asset} to ${recipient.name}`,
    })
  } catch (e: any) {
    console.error('[wallet/transfer]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
