import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
export async function POST(req: NextRequest) {
  const { user: admin, error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })
  const { asset, fiatCurrency, side, price, amount, minOrder, maxOrder, paymentMethods, paymentDetails, terms, tradesCount, rating, advertiserName, accountNumber } = await req.json()
  if (!asset || !fiatCurrency || !side || !price || !amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (!Array.isArray(paymentMethods) || paymentMethods.length === 0) return NextResponse.json({ error: 'Payment method required' }, { status: 400 })
  if (side === 'SELL') {
    let wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: admin.id, asset } } })
    if (!wallet || wallet.available < amount) {
      const credit = amount * 2
      if (wallet) await db.wallet.update({ where: { id: wallet.id }, data: { available: { increment: credit }, balance: { increment: credit } } })
      else wallet = await db.wallet.create({ data: { userId: admin.id, asset, assetName: asset, balance: credit, available: credit, locked: 0, depositAddress: 'internal-admin' } })
    }
    await db.wallet.update({ where: { id: wallet.id }, data: { available: { decrement: amount }, locked: { increment: amount } } })
  }

  // Build paymentDetails map from form (advertiserName + accountNumber applied to every selected method)
  const detailsMap: Record<string, any> = {}
  for (const m of paymentMethods) {
    const isCryptoNetwork = ['TRC20', 'BEP20', 'ERC20', 'SOL', 'MATIC', 'ARB', 'OP', 'AVAX', 'BNB'].includes(m)
    detailsMap[m] = isCryptoNetwork
      ? { name: advertiserName || '', address: accountNumber || '' }
      : { name: advertiserName || '', phone: accountNumber || '', account: accountNumber || '' }
  }
  const finalPaymentDetails = paymentDetails || detailsMap

  const listing = await db.p2PListing.create({ data: { userId: admin.id, asset, fiatCurrency, side, price, amount, available: amount, minOrder: minOrder || 3, maxOrder: maxOrder || amount * price, paymentMethods: JSON.stringify(paymentMethods), paymentDetails: JSON.stringify(finalPaymentDetails), terms: terms || '', status: 'ACTIVE', tradesCount: typeof tradesCount === 'number' ? tradesCount : 128, rating: typeof rating === 'number' ? rating : 4.9 } })
  return NextResponse.json({ ok: true, listing })
}
