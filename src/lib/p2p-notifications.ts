import { db } from '@/lib/db'
export async function notifyUserP2PApproved(buyerId: string, asset: string, amount: number) {
  try { await db.adminNotification.create({ data: { userId: buyerId, title: 'Payment Approved', message: `Your P2P order has been approved. ${amount} ${asset} has been credited to your wallet.`, type: 'success', isRead: false } }) } catch (e) { console.error(e) }
}
export async function notifyUserP2PRejected(buyerId: string, asset: string, amount: number) {
  try { await db.adminNotification.create({ data: { userId: buyerId, title: 'Payment Rejected', message: `Your P2P order for ${amount} ${asset} was rejected.`, type: 'warning', isRead: false } }) } catch (e) { console.error(e) }
}
