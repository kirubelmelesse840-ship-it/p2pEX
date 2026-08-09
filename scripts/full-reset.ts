/**
 * COMPLETE RESET - deletes EVERYTHING including the admin account.
 * Then recreates only the admin (kirubelmelesse840@gmail.com) with a new password.
 * Every user must register from scratch.
 */
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

async function fullReset() {
  console.log('=== COMPLETE RESET ===\n')

  // Delete ALL data (no exceptions)
  console.log('Deleting all data...')
  await db.session.deleteMany()
  await db.p2POrder.deleteMany()
  await db.p2PListing.deleteMany()
  await db.transaction.deleteMany()
  await db.trade.deleteMany()
  await db.order.deleteMany()
  await db.wallet.deleteMany()
  await db.tickerHistory.deleteMany()
  await db.tradingPair.deleteMany()
  await db.user.deleteMany()
  console.log('✓ All data deleted (users, wallets, orders, trades, transactions, listings, sessions, pairs)\n')

  // Recreate ONLY the admin account with a fresh password
  const adminEmail = 'kirubelmelesse840@gmail.com'
  const adminPassword = 'kirubel2026'  // new password
  const adminName = 'Kirubel Melesse'

  const admin = await db.user.create({
    data: {
      email: adminEmail,
      name: adminName,
      passwordHash: hashPassword(adminPassword),
      isAdmin: true,
      kycVerified: true,
      kycLevel: 2,
      kycStatus: 'APPROVED',
      fiatCurrency: 'ETB',
      isActive: true,
    },
  })
  console.log(`✓ Admin account created:`)
  console.log(`  Email: ${admin.email}`)
  console.log(`  Password: ${adminPassword}`)
  console.log(`  isAdmin: ${admin.isAdmin}`)

  // Create wallets for admin with balances
  const assets = [
    { symbol: 'BTC',  name: 'Bitcoin',   amount: 0.5 },
    { symbol: 'ETH',  name: 'Ethereum',  amount: 8 },
    { symbol: 'USDT', name: 'Tether',    amount: 25000 },
    { symbol: 'USDC', name: 'USD Coin',  amount: 5000 },
    { symbol: 'BNB',  name: 'BNB',       amount: 15 },
    { symbol: 'SOL',  name: 'Solana',    amount: 80 },
    { symbol: 'XRP',  name: 'XRP',       amount: 3000 },
    { symbol: 'ADA',  name: 'Cardano',   amount: 5000 },
    { symbol: 'DOGE', name: 'Dogecoin',  amount: 30000 },
    { symbol: 'AVAX', name: 'Avalanche', amount: 60 },
    { symbol: 'LINK', name: 'Chainlink', amount: 150 },
    { symbol: 'DOT',  name: 'Polkadot',  amount: 500 },
    { symbol: 'MATIC',name: 'Polygon',   amount: 3000 },
    { symbol: 'LTC',  name: 'Litecoin',  amount: 30 },
  ]
  for (const a of assets) {
    await db.wallet.create({
      data: {
        userId: admin.id,
        asset: a.symbol,
        assetName: a.name,
        balance: a.amount,
        available: a.amount,
        depositAddress: 'T' + Math.random().toString(36).slice(2, 34).toUpperCase(),
      },
    })
  }
  console.log(`✓ Created ${assets.length} wallets with balances`)

  // Seed trading pairs
  const BASE_PRICES: Record<string, number> = {
    BTC: 67500, ETH: 3450, BNB: 585, SOL: 165, XRP: 0.62, ADA: 0.45,
    DOGE: 0.16, AVAX: 38, LINK: 18.5, DOT: 7.2, MATIC: 0.72, LTC: 85,
    USDT: 1, USDC: 1,
  }
  const PAIRS = [
    ['BTC', 'USDT'], ['ETH', 'USDT'], ['BNB', 'USDT'], ['SOL', 'USDT'],
    ['XRP', 'USDT'], ['ADA', 'USDT'], ['DOGE', 'USDT'], ['AVAX', 'USDT'],
    ['LINK', 'USDT'], ['DOT', 'USDT'], ['MATIC', 'USDT'], ['LTC', 'USDT'],
    ['BTC', 'USDC'], ['ETH', 'USDC'], ['BTC', 'ETH'], ['ETH', 'BNB'],
  ] as const
  const ASSET_NAMES: Record<string, string> = {
    BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'BNB', SOL: 'Solana', XRP: 'XRP',
    ADA: 'Cardano', DOGE: 'Dogecoin', AVAX: 'Avalanche', LINK: 'Chainlink',
    DOT: 'Polkadot', MATIC: 'Polygon', LTC: 'Litecoin',
    USDT: 'Tether', USDC: 'USD Coin',
  }
  for (const [base, quote] of PAIRS) {
    const symbol = `${base}${quote}`
    const price = BASE_PRICES[base] / BASE_PRICES[quote]
    await db.tradingPair.create({
      data: {
        symbol,
        baseAsset: base,
        quoteAsset: quote,
        baseAssetName: ASSET_NAMES[base] || base,
        quoteAssetName: ASSET_NAMES[quote] || quote,
        lastPrice: price,
        priceChangePercent: (Math.random() - 0.5) * 8,
        high24h: price * (1 + Math.random() * 0.04),
        low24h: price * (1 - Math.random() * 0.04),
        volume24h: Math.random() * 50000 + 5000,
        quoteVolume24h: 0,
        isActive: true,
      },
    })
  }
  console.log(`✓ Created ${PAIRS.length} trading pairs`)

  // Seed P2P listings
  const listings = [
    { asset: 'USDT', fiat: 'ETB', side: 'SELL', price: 128.50, amount: 30000, methods: ['Telebirr', 'CBE Birr', 'Awash Bank'] },
    { asset: 'USDT', fiat: 'ETB', side: 'SELL', price: 129.00, amount: 15000, methods: ['Telebirr', 'Dashen Bank'] },
    { asset: 'USDT', fiat: 'ETB', side: 'BUY',  price: 127.00, amount: 20000, methods: ['Telebirr', 'CBE Birr', 'Coopbank'] },
    { asset: 'USDT', fiat: 'ETB', side: 'SELL', price: 128.75, amount: 50000, methods: ['Telebirr', 'Awash Bank', 'Hibret Bank'] },
    { asset: 'USDT', fiat: 'ETB', side: 'BUY',  price: 126.50, amount: 10000, methods: ['Telebirr', 'Abay Bank'] },
    { asset: 'BTC',  fiat: 'ETB', side: 'SELL', price: 8650000, amount: 0.2, methods: ['Telebirr', 'CBE Birr'] },
    { asset: 'ETH',  fiat: 'ETB', side: 'SELL', price: 442000, amount: 3, methods: ['Telebirr', 'Awash Bank'] },
    { asset: 'USDT', fiat: 'USD', side: 'SELL', price: 1.002, amount: 50000, methods: ['Bank Transfer', 'Wise', 'PayPal'] },
    { asset: 'USDT', fiat: 'USD', side: 'BUY',  price: 0.998, amount: 30000, methods: ['Bank Transfer', 'Cash App'] },
    { asset: 'USDT', fiat: 'EUR', side: 'SELL', price: 0.985, amount: 20000, methods: ['SEPA', 'Wise', 'PayPal'] },
    { asset: 'BTC',  fiat: 'USD', side: 'SELL', price: 67800, amount: 0.5, methods: ['Bank Transfer', 'Wise'] },
    { asset: 'ETH',  fiat: 'USD', side: 'SELL', price: 3470, amount: 8, methods: ['Bank Transfer', 'PayPal'] },
  ]
  for (const l of listings) {
    await db.p2PListing.create({
      data: {
        userId: admin.id,
        asset: l.asset, fiatCurrency: l.fiat, side: l.side,
        price: l.price, amount: l.amount, available: l.amount,
        minOrder: 10, maxOrder: l.amount * l.price,
        paymentMethods: JSON.stringify(l.methods),
        terms: `Trade ${l.asset} for ${l.fiat} via ${l.methods.join(', ')}.`,
        status: 'ACTIVE',
      },
    })
  }
  console.log(`✓ Created ${listings.length} P2P listings`)

  // Seed sample deposit transactions for admin
  const txs = [
    { asset: 'USDT', network: 'TRC20', amount: 25000 },
    { asset: 'BTC',  network: 'BTC',   amount: 0.5 },
    { asset: 'ETH',  network: 'ERC20', amount: 8 },
  ]
  for (const t of txs) {
    await db.transaction.create({
      data: {
        userId: admin.id,
        asset: t.asset, type: 'DEPOSIT', amount: t.amount, fee: 0,
        network: t.network,
        fromAddress: 'T' + Math.random().toString(36).slice(2, 34).toUpperCase(),
        txHash: '0x' + Math.random().toString(16).slice(2),
        status: 'COMPLETED', confirmations: 12,
        requiredConfirmations: t.asset === 'BTC' ? 3 : 12,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    })
  }
  console.log(`✓ Created ${txs.length} sample transactions`)

  // Seed default settings
  const settings = [
    { key: 'maintenanceMode', value: 'false' },
    { key: 'marketPaused', value: 'false' },
    { key: 'spotFeePercent', value: '0.1' },
    { key: 'p2pFeePercent', value: '0.0' },
    { key: 'withdrawFeeMultiplier', value: '1.0' },
    { key: 'minKycLevel', value: '0' },
    { key: 'maxDailyWithdrawUsd', value: '10000' },
    { key: 'supportEmail', value: 'support@crypex.com' },
    { key: 'announcement', value: 'Welcome to P2PET — trade securely with confidence!' },
  ]
  for (const s of settings) {
    await db.setting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s })
  }
  console.log(`✓ Created ${settings.length} system settings`)

  console.log('\n=== RESET COMPLETE ===')
  console.log(`\nAdmin login:`)
  console.log(`  Email: ${adminEmail}`)
  console.log(`  Password: ${adminPassword}`)
  console.log(`\nAll other users have been deleted.`)
  console.log(`Everyone must sign up fresh with a new password.`)
}

fullReset()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); })
