import { db } from '@/lib/db'
const AMOUNT = 10
const ASSET = 'USDT'
export async function creditWelcomeBonus(userId: string): Promise<void> {
  try {
    let wallet = await db.wallet.findUnique({ where: { userId_asset: { userId, asset: ASSET } } })
    if (!wallet) { wallet = await db.wallet.create({ data: { userId, asset: ASSET, assetName: 'Tether', balance: 0, available: 0, locked: 0, depositAddress: 'T' + Math.random().toString(36).slice(2, 34).toUpperCase() } }) }
    await db.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: AMOUNT }, available: { increment: AMOUNT } } })
    await db.transaction.create({ data: { userId, asset: ASSET, type: 'DEPOSIT', amount: AMOUNT, fee: 0, network: 'WELCOME_BONUS', fromAddress: 'P2PEX Welcome Bonus', toAddress: 'internal', txHash: 'welcome-' + userId.slice(-8), status: 'COMPLETED', confirmations: 1, requiredConfirmations: 1, note: `Welcome bonus — ${AMOUNT} USDT` } })
    await db.adminNotification.create({ data: { userId, title: '🎁 Welcome Bonus Received!', message: `You have received the welcome bonus of ${AMOUNT} USDT. It has been credited to your wallet.`, type: 'success', isRead: false } })
    try { const { sendPushToUser } = await import('@/lib/push'); sendPushToUser(userId, { title: '🎁 Welcome Bonus Received!', body: `You have received the welcome bonus of ${AMOUNT} USDT.`, url: '/wallet', tag: 'welcome-bonus' }).catch(() => {}) } catch {}
    console.log(`[welcome-bonus] Credited ${AMOUNT} USDT to user ${userId}`)
  } catch (e: any) { console.error('[welcome-bonus] Failed:', e?.message) }
}
