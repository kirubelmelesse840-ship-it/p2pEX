/**
 * Reset ALL accounts - deletes all users except kirubelmelesse840@gmail.com (the admin).
 * Also clears all sessions, orders, trades, transactions, P2P listings, and wallets.
 * Everyone will need to sign up again from scratch.
 */
import { db } from '../src/lib/db'

async function resetAllAccounts() {
  console.log('=== Resetting all accounts ===\n')

  // Count before
  const beforeUsers = await db.user.count()
  const beforeSessions = await db.session.count()
  const beforeOrders = await db.order.count()
  const beforeTrades = await db.trade.count()
  const beforeTx = await db.transaction.count()
  const beforeListings = await db.p2PListing.count()
  const beforeP2POrders = await db.p2POrder.count()
  const beforeWallets = await db.wallet.count()

  console.log(`Before reset:`)
  console.log(`  Users: ${beforeUsers}`)
  console.log(`  Sessions: ${beforeSessions}`)
  console.log(`  Orders: ${beforeOrders}`)
  console.log(`  Trades: ${beforeTrades}`)
  console.log(`  Transactions: ${beforeTx}`)
  console.log(`  P2P Listings: ${beforeListings}`)
  console.log(`  P2P Orders: ${beforeP2POrders}`)
  console.log(`  Wallets: ${beforeWallets}`)

  const adminEmail = 'kirubelmelesse840@gmail.com'
  const admin = await db.user.findUnique({ where: { email: adminEmail } })

  if (!admin) {
    console.error(`Admin ${adminEmail} not found! Aborting.`)
    process.exit(1)
  }

  console.log(`\nKeeping admin: ${admin.email} (${admin.id})`)

  // Delete everything in the right order (respecting foreign keys)
  // 1. Delete all sessions (except admin's)
  const delSessions = await db.session.deleteMany({ where: { userId: { not: admin.id } } })
  console.log(`\nDeleted ${delSessions.count} sessions`)

  // 2. Delete all P2P orders (except admin's)
  const delP2POrders = await db.p2POrder.deleteMany({
    where: { OR: [{ buyerId: { not: admin.id } }, { sellerId: { not: admin.id } }] }
  })
  console.log(`Deleted ${delP2POrders.count} P2P orders`)

  // 3. Delete all P2P listings (except admin's)
  const delListings = await db.p2PListing.deleteMany({ where: { userId: { not: admin.id } } })
  console.log(`Deleted ${delListings.count} P2P listings`)

  // 4. Delete all transactions (except admin's)
  const delTx = await db.transaction.deleteMany({ where: { userId: { not: admin.id } } })
  console.log(`Deleted ${delTx.count} transactions`)

  // 5. Delete all trades (except admin's - as buyer or seller)
  const delTrades = await db.trade.deleteMany({
    where: { OR: [{ buyerId: { not: admin.id } }, { sellerId: { not: admin.id } }] }
  })
  console.log(`Deleted ${delTrades.count} trades`)

  // 6. Delete all orders (except admin's)
  const delOrders = await db.order.deleteMany({ where: { userId: { not: admin.id } } })
  console.log(`Deleted ${delOrders.count} orders`)

  // 7. Delete all wallets (except admin's)
  const delWallets = await db.wallet.deleteMany({ where: { userId: { not: admin.id } } })
  console.log(`Deleted ${delWallets.count} wallets`)

  // 8. Finally, delete all users except admin
  const delUsers = await db.user.deleteMany({ where: { id: { not: admin.id } } })
  console.log(`Deleted ${delUsers.count} users`)

  // Count after
  const afterUsers = await db.user.count()
  const afterWallets = await db.wallet.count()

  console.log(`\nAfter reset:`)
  console.log(`  Users: ${afterUsers} (should be 1)`)
  console.log(`  Wallets: ${afterWallets}`)

  // Verify admin still exists
  const adminCheck = await db.user.findUnique({ where: { email: adminEmail } })
  console.log(`\n✓ Admin preserved: ${adminCheck?.email} (isAdmin=${adminCheck?.isAdmin})`)

  // Re-seed P2P listings for the admin so the marketplace isn't empty
  console.log('\n=== Re-seeding P2P listings for admin ===')
  const listings = [
    // ETB listings
    { asset: 'USDT', fiat: 'ETB', side: 'SELL', price: 128.50, amount: 30000, methods: ['Telebirr', 'CBE Birr', 'Awash Bank'] },
    { asset: 'USDT', fiat: 'ETB', side: 'SELL', price: 129.00, amount: 15000, methods: ['Telebirr', 'Dashen Bank'] },
    { asset: 'USDT', fiat: 'ETB', side: 'BUY',  price: 127.00, amount: 20000, methods: ['Telebirr', 'CBE Birr', 'Coopbank'] },
    { asset: 'USDT', fiat: 'ETB', side: 'SELL', price: 128.75, amount: 50000, methods: ['Telebirr', 'Awash Bank', 'Hibret Bank', 'Wegagen Bank'] },
    { asset: 'USDT', fiat: 'ETB', side: 'BUY',  price: 126.50, amount: 10000, methods: ['Telebirr', 'Abay Bank'] },
    { asset: 'BTC',  fiat: 'ETB', side: 'SELL', price: 8650000, amount: 0.2,  methods: ['Telebirr', 'CBE Birr'] },
    { asset: 'ETH',  fiat: 'ETB', side: 'SELL', price: 442000,  amount: 3,    methods: ['Telebirr', 'Awash Bank'] },
    // Global
    { asset: 'USDT', fiat: 'USD', side: 'SELL', price: 1.002, amount: 50000, methods: ['Bank Transfer', 'Wise', 'PayPal'] },
    { asset: 'USDT', fiat: 'USD', side: 'BUY',  price: 0.998,  amount: 30000, methods: ['Bank Transfer', 'Cash App'] },
    { asset: 'USDT', fiat: 'EUR', side: 'SELL', price: 0.985,  amount: 20000, methods: ['SEPA', 'Wise', 'PayPal'] },
    { asset: 'USDT', fiat: 'GBP', side: 'BUY',  price: 0.785,  amount: 15000, methods: ['Bank Transfer', 'Wise'] },
    { asset: 'BTC',  fiat: 'USD', side: 'SELL', price: 67800,  amount: 0.5,    methods: ['Bank Transfer', 'Wise'] },
    { asset: 'ETH',  fiat: 'USD', side: 'SELL', price: 3470,   amount: 8,      methods: ['Bank Transfer', 'PayPal'] },
  ]

  for (const l of listings) {
    await db.p2PListing.create({
      data: {
        userId: admin.id,
        asset: l.asset,
        fiatCurrency: l.fiat,
        side: l.side,
        price: l.price,
        amount: l.amount,
        available: l.amount,
        minOrder: 10,
        maxOrder: l.amount * l.price,
        paymentMethods: JSON.stringify(l.methods),
        terms: `Trade ${l.asset} for ${l.fiat} via ${l.methods.join(', ')}. Release within 15 minutes of payment confirmation.`,
        status: 'ACTIVE',
      },
    })
  }
  console.log(`Created ${listings.length} P2P listings`)

  // Re-seed some transactions for the admin wallet history
  const adminWallets = await db.wallet.findMany({ where: { userId: admin.id } })
  const txAssets = [
    { asset: 'USDT', network: 'TRC20', amount: 25000, type: 'DEPOSIT' },
    { asset: 'USDT', network: 'ERC20', amount: 5000, type: 'DEPOSIT' },
    { asset: 'BTC',  network: 'BTC',   amount: 0.5,   type: 'DEPOSIT' },
    { asset: 'ETH',  network: 'ERC20', amount: 8,     type: 'DEPOSIT' },
  ]
  for (const t of txAssets) {
    const w = adminWallets.find(x => x.asset === t.asset)
    if (w) {
      await db.transaction.create({
        data: {
          userId: admin.id,
          asset: t.asset,
          type: t.type,
          amount: t.amount,
          fee: 0,
          network: t.network,
          fromAddress: 'T' + Math.random().toString(36).slice(2, 34).toUpperCase(),
          txHash: '0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
          status: 'COMPLETED',
          confirmations: 12,
          requiredConfirmations: t.asset === 'BTC' ? 3 : t.asset === 'ETH' ? 12 : 1,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        },
      })
    }
  }
  console.log(`Created ${txAssets.length} sample transactions for admin`)

  console.log('\n✓ Reset complete!')
  console.log('  Only kirubelmelesse840@gmail.com remains as admin.')
  console.log('  All other accounts have been deleted.')
  console.log('  Users will need to sign up again from scratch.')
}

resetAllAccounts()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); })
