/**
 * Seed script - populates the database with:
 * - Default trading pairs (synced with the WebSocket market service)
 * - A demo user with multi-asset wallets (BTC, ETH, USDT, BNB, SOL, etc.)
 * - Some open orders for the demo user
 * - Sample P2P listings
 * - Sample transactions
 */

import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

const ASSETS = [
  { symbol: 'BTC',   name: 'Bitcoin',     network: 'BTC',   decimals: 8 },
  { symbol: 'ETH',   name: 'Ethereum',    network: 'ERC20', decimals: 8 },
  { symbol: 'USDT',  name: 'Tether',      network: 'TRC20', decimals: 6 },
  { symbol: 'USDC',  name: 'USD Coin',    network: 'ERC20', decimals: 6 },
  { symbol: 'BNB',   name: 'BNB',         network: 'BSC',   decimals: 8 },
  { symbol: 'SOL',   name: 'Solana',      network: 'SOL',   decimals: 8 },
  { symbol: 'XRP',   name: 'XRP',         network: 'XRP',   decimals: 6 },
  { symbol: 'ADA',   name: 'Cardano',     network: 'ADA',   decimals: 6 },
  { symbol: 'DOGE',  name: 'Dogecoin',    network: 'DOGE',  decimals: 8 },
  { symbol: 'AVAX',  name: 'Avalanche',   network: 'AVAX',  decimals: 8 },
  { symbol: 'LINK',  name: 'Chainlink',   network: 'ERC20', decimals: 8 },
  { symbol: 'DOT',   name: 'Polkadot',    network: 'DOT',   decimals: 8 },
  { symbol: 'MATIC', name: 'Polygon',     network: 'ERC20', decimals: 8 },
  { symbol: 'LTC',   name: 'Litecoin',    network: 'LTC',   decimals: 8 },
]

const PAIRS = [
  ['BTC', 'USDT'],
  ['ETH', 'USDT'],
  ['BNB', 'USDT'],
  ['SOL', 'USDT'],
  ['XRP', 'USDT'],
  ['ADA', 'USDT'],
  ['DOGE', 'USDT'],
  ['AVAX', 'USDT'],
  ['LINK', 'USDT'],
  ['DOT', 'USDT'],
  ['MATIC', 'USDT'],
  ['LTC', 'USDT'],
  ['BTC', 'USDC'],
  ['ETH', 'USDC'],
  ['BTC', 'ETH'],
  ['ETH', 'BNB'],
] as const

const BASE_PRICES: Record<string, number> = {
  BTC: 67500, ETH: 3450, BNB: 585, SOL: 165, XRP: 0.62, ADA: 0.45,
  DOGE: 0.16, AVAX: 38, LINK: 18.5, DOT: 7.2, MATIC: 0.72, LTC: 85,
  USDT: 1, USDC: 1,
}

function genAddress(prefix: string): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let addr = prefix
  for (let i = 0; i < 32; i++) addr += chars[Math.floor(Math.random() * chars.length)]
  return addr
}

export async function seedDatabase() {
  console.log('[seed] starting...')

  // 1. Create demo user
  let user = await db.user.findUnique({ where: { email: 'demo@crypex.com' } })
  if (!user) {
    user = await db.user.create({
      data: {
        email: 'demo@crypex.com',
        name: 'Demo Trader',
        passwordHash: hashPassword('demo12345'),
        kycVerified: true,
        kycLevel: 2,
        fiatCurrency: 'USD',
      },
    })
    console.log(`[seed] created demo user: ${user.id}`)
  } else {
    console.log(`[seed] demo user exists: ${user.id}`)
  }

  // 2. Create wallets for the demo user with starting balances
  for (const asset of ASSETS) {
    const existing = await db.wallet.findUnique({
      where: { userId_asset: { userId: user.id, asset: asset.symbol } },
    })
    if (!existing) {
      const startingBalance =
        asset.symbol === 'USDT' ? 50000 :
        asset.symbol === 'USDC' ? 10000 :
        asset.symbol === 'BTC' ? 0.85 :
        asset.symbol === 'ETH' ? 12.5 :
        asset.symbol === 'BNB' ? 25 :
        asset.symbol === 'SOL' ? 150 :
        asset.symbol === 'XRP' ? 5000 :
        asset.symbol === 'ADA' ? 8000 :
        asset.symbol === 'DOGE' ? 50000 :
        asset.symbol === 'AVAX' ? 100 :
        asset.symbol === 'LINK' ? 250 :
        asset.symbol === 'DOT' ? 800 :
        asset.symbol === 'MATIC' ? 5000 :
        asset.symbol === 'LTC' ? 50 :
        10
      await db.wallet.create({
        data: {
          userId: user.id,
          asset: asset.symbol,
          assetName: asset.name,
          balance: startingBalance,
          available: startingBalance,
          locked: 0,
          depositAddress: genAddress(asset.symbol === 'BTC' ? 'bc1' : asset.symbol === 'ETH' ? '0x' : 'T'),
        },
      })
      console.log(`[seed] wallet ${asset.symbol}: ${startingBalance}`)
    }
  }

  // 3. Create trading pairs
  for (const [base, quote] of PAIRS) {
    const symbol = `${base}${quote}`
    const baseAsset = ASSETS.find(a => a.symbol === base)!
    const quoteAsset = ASSETS.find(a => a.symbol === quote)!
    const existing = await db.tradingPair.findUnique({ where: { symbol } })
    if (!existing) {
      const price = BASE_PRICES[base] / BASE_PRICES[quote]
      await db.tradingPair.create({
        data: {
          symbol,
          baseAsset: base,
          quoteAsset: quote,
          baseAssetName: baseAsset.name,
          quoteAssetName: quoteAsset.name,
          lastPrice: price,
          priceChangePercent: (Math.random() - 0.5) * 8,
          high24h: price * (1 + Math.random() * 0.04),
          low24h: price * (1 - Math.random() * 0.04),
          volume24h: Math.random() * 50000 + 5000,
          quoteVolume24h: 0,
          isActive: true,
        },
      })
      console.log(`[seed] pair ${symbol} created @ ${price}`)
    }
  }

  // 4. Create some P2P listings
  const listings = [
    { asset: 'USDT', fiat: 'USD', side: 'SELL', price: 1.002, amount: 50000, methods: ['Bank Transfer', 'Wise', 'PayPal'] },
    { asset: 'USDT', fiat: 'USD', side: 'BUY',  price: 0.998,  amount: 30000, methods: ['Bank Transfer', 'Cash App'] },
    { asset: 'USDT', fiat: 'EUR', side: 'SELL', price: 0.985,  amount: 20000, methods: ['SEPA', 'Wise', 'PayPal'] },
    { asset: 'USDT', fiat: 'CNY', side: 'SELL', price: 7.18,   amount: 100000, methods: ['Alipay', 'WeChat Pay'] },
    { asset: 'USDT', fiat: 'GBP', side: 'BUY',  price: 0.785,  amount: 15000, methods: ['Bank Transfer', 'Wise'] },
    { asset: 'BTC',  fiat: 'USD', side: 'SELL', price: 67800,  amount: 0.5,    methods: ['Bank Transfer', 'Wise'] },
    { asset: 'ETH',  fiat: 'USD', side: 'SELL', price: 3470,   amount: 8,      methods: ['Bank Transfer', 'PayPal'] },
    { asset: 'USDT', fiat: 'JPY', side: 'SELL', price: 152.3,  amount: 30000,  methods: ['Bank Transfer'] },
    { asset: 'USDT', fiat: 'INR', side: 'BUY',  price: 83.2,   amount: 50000,  methods: ['UPI', 'IMPS'] },
    { asset: 'USDT', fiat: 'USD', side: 'SELL', price: 1.001,  amount: 25000,  methods: ['Bank Transfer', 'Wise', 'PayPal', 'Cash App'] },
    { asset: 'BTC',  fiat: 'EUR', side: 'BUY',  price: 62450,  amount: 0.3,    methods: ['SEPA', 'Wise'] },
    { asset: 'ETH',  fiat: 'EUR', side: 'BUY',  price: 3195,   amount: 5,      methods: ['SEPA'] },
    { asset: 'USDT', fiat: 'KRW', side: 'SELL', price: 1368,   amount: 40000,  methods: ['Bank Transfer'] },
    { asset: 'USDT', fiat: 'SGD', side: 'BUY',  price: 1.345,  amount: 12000,  methods: ['PayNow', 'Bank Transfer'] },
  ]

  for (const l of listings) {
    const exists = await db.p2PListing.findFirst({
      where: { userId: user.id, asset: l.asset, fiatCurrency: l.fiat, side: l.side, price: l.price },
    })
    if (!exists) {
      await db.p2PListing.create({
        data: {
          userId: user.id,
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
  }
  console.log(`[seed] P2P listings seeded (${listings.length})`)

  // 5. Create sample transactions for the demo user
  const txAssets = [
    { asset: 'USDT', network: 'TRC20', amount: 50000, type: 'DEPOSIT', status: 'COMPLETED' },
    { asset: 'USDT', network: 'ERC20', amount: 10000, type: 'DEPOSIT', status: 'COMPLETED' },
    { asset: 'BTC',  network: 'BTC',   amount: 0.5,   type: 'DEPOSIT', status: 'COMPLETED' },
    { asset: 'ETH',  network: 'ERC20', amount: 5,     type: 'DEPOSIT', status: 'COMPLETED' },
    { asset: 'USDT', network: 'TRC20', amount: 2000,  type: 'WITHDRAW', status: 'COMPLETED' },
  ]
  for (const t of txAssets) {
    const existing = await db.transaction.findFirst({
      where: { userId: user.id, asset: t.asset, type: t.type, amount: t.amount },
    })
    if (!existing) {
      await db.transaction.create({
        data: {
          userId: user.id,
          asset: t.asset,
          type: t.type,
          amount: t.amount,
          fee: t.type === 'WITHDRAW' ? (t.asset === 'BTC' ? 0.0001 : t.asset === 'ETH' ? 0.001 : 1) : 0,
          network: t.network,
          fromAddress: t.type === 'DEPOSIT' ? genAddress(t.asset === 'BTC' ? 'bc1' : t.asset === 'ETH' ? '0x' : 'T') : undefined,
          toAddress: t.type === 'WITHDRAW' ? genAddress(t.asset === 'BTC' ? 'bc1' : t.asset === 'ETH' ? '0x' : 'T') : undefined,
          txHash: '0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
          status: t.status,
          confirmations: 12,
          requiredConfirmations: t.asset === 'BTC' ? 3 : t.asset === 'ETH' ? 12 : 1,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        },
      })
    }
  }
  console.log('[seed] transactions seeded')

  console.log('[seed] done')
}

// Run if invoked directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1) })
}
