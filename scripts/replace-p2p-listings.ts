/**
 * Replace all P2P listings with the exact 7 ads specified.
 */
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  console.log('🔄 Replacing P2P listings...')
  const admin = await db.user.findFirst({ where: { isAdmin: true } })
  if (!admin) { console.error('❌ No admin user found.'); process.exit(1) }
  console.log(`✓ Found admin: ${admin.email} (${admin.userId})`)

  await db.p2POrder.deleteMany({})
  console.log('✓ Deleted all P2P orders')
  await db.p2PListing.deleteMany({})
  console.log('✓ Deleted all P2P listings')

  let w = await db.wallet.findUnique({ where: { userId_asset: { userId: admin.id, asset: 'USDT' } } })
  if (!w) {
    w = await db.wallet.create({ data: { userId: admin.id, asset: 'USDT', assetName: 'Tether', balance: 0, available: 0, locked: 0, depositAddress: 'internal-admin' } })
  }
  if (w.locked > 0) {
    await db.wallet.update({ where: { id: w.id }, data: { available: { increment: w.locked }, locked: 0 } })
  }
  const needed = Math.max(0, 40000 - (await db.wallet.findUnique({ where: { userId_asset: { userId: admin.id, asset: 'USDT' } } }))!.balance)
  if (needed > 0) {
    await db.wallet.update({ where: { id: w.id }, data: { available: { increment: needed }, balance: { increment: needed } } })
  }
  await db.wallet.update({ where: { id: w.id }, data: { available: { decrement: 40000 }, locked: { increment: 40000 } } })
  console.log('✓ Locked 40000 USDT for 4 SELL listings')

  const newListings = [
    { asset: 'USDT', fiat: 'ETB', side: 'SELL', price: 184.70, amount: 10000, methods: ['Telebirr'],
      paymentDetails: { Telebirr: { phone: '0962404391', name: 'Kirubel' } }, terms: 'Send payment via Telebirr to 0962404391 (Kirubel), then upload the payment screenshot.' },
    { asset: 'USDT', fiat: 'ETB', side: 'SELL', price: 186.50, amount: 10000, methods: ['CBE Birr'],
      paymentDetails: { 'CBE Birr': { account: '1000031904904', name: 'Melesech' } }, terms: 'Send payment via CBE to 1000031904904 (Melesech), then upload the payment screenshot.' },
    { asset: 'USDT', fiat: 'ETB', side: 'SELL', price: 186.78, amount: 10000, methods: ['Telebirr'],
      paymentDetails: { Telebirr: { phone: '0906045336', name: 'Amare' } }, terms: 'Send payment via Telebirr to 0906045336 (Amare), then upload the payment screenshot.' },
    { asset: 'USDT', fiat: 'ETB', side: 'SELL', price: 185.64, amount: 10000, methods: ['CBE Birr'],
      paymentDetails: { 'CBE Birr': { account: '1000044413217', name: 'Tigist Mekonen' } }, terms: 'Send payment via CBE to 1000044413217 (Tigist Mekonen), then upload the payment screenshot.' },
    { asset: 'USDT', fiat: 'ETB', side: 'BUY', price: 186.80, amount: 10000, methods: ['TRC20'],
      paymentDetails: { TRC20: { network: 'TRC20', address: 'TCKoT3qjmFBA7MxtXdNoVxixUhjVAPo48E', name: 'Abdu' } }, terms: 'Send USDT via TRC20 to TCKoT3qjmFBA7MxtXdNoVxixUhjVAPo48E (Abdu).' },
    { asset: 'USDT', fiat: 'ETB', side: 'BUY', price: 187.10, amount: 10000, methods: ['BEP20'],
      paymentDetails: { BEP20: { network: 'BEP20', address: '0x1c4f79b327a1e98003b2333dcd1ba482be5c300a', name: 'Bezawit' } }, terms: 'Send USDT via BEP20 to 0x1c4f79b327a1e98003b2333dcd1ba482be5c300a (Bezawit).' },
    { asset: 'USDT', fiat: 'ETB', side: 'BUY', price: 186.90, amount: 10000, methods: ['ERC20'],
      paymentDetails: { ERC20: { network: 'ERC20', address: '0x1c4f79b327a1e98003b2333dcd1ba482be5c300a', name: 'Abel' } }, terms: 'Send USDT via ERC20 to 0x1c4f79b327a1e98003b2333dcd1ba482be5c300a (Abel).' },
  ]

  for (const l of newListings) {
    await db.p2PListing.create({
      data: {
        userId: admin.id, asset: l.asset, fiatCurrency: l.fiat, side: l.side,
        price: l.price, amount: l.amount, available: l.amount,
        minOrder: 3, maxOrder: l.amount * l.price,
        paymentMethods: JSON.stringify(l.methods),
        paymentDetails: JSON.stringify(l.paymentDetails),
        terms: l.terms, status: 'ACTIVE',
        tradesCount: 128, rating: 4.9,
      },
    })
    const adType = l.side === 'SELL' ? 'BUY ad' : 'SELL ad'
    console.log(`  ✓ Created ${adType}: ${l.methods[0]} @ ${l.price} ETB/USDT — ${l.paymentDetails[l.methods[0]].name}`)
  }

  console.log(`\n✅ Done! Created ${newListings.length} P2P ads.`)
}
main().catch((e) => { console.error('❌ Error:', e); process.exit(1) }).finally(async () => { await db.$disconnect() })
