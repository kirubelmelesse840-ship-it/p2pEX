/**
 * Seed Supabase database with:
 * - Trading pairs (BTC/USDT, ETH/USDT, etc.)
 * - 7 P2P listings (4 buy ads + 3 sell ads)
 * - Sets the first user with admin email as admin
 *
 * Run this after deploying to Vercel + Supabase:
 *   npx tsx scripts/seed-supabase.ts
 *
 * Make sure DATABASE_URL and DIRECT_URL are set in .env
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kirubelmelesse840@gmail.com'

async function main() {
  console.log('🌱 Seeding Supabase database...')

  // 1. Create trading pairs
  const PAIRS: Array<[string, string]> = [
    ['BTC', 'USDT'], ['ETH', 'USDT'], ['BNB', 'USDT'], ['SOL', 'USDT'],
    ['XRP', 'USDT'], ['ADA', 'USDT'], ['DOGE', 'USDT'], ['AVAX', 'USDT'],
    ['LINK', 'USDT'], ['DOT', 'USDT'], ['MATIC', 'USDT'], ['LTC', 'USDT'],
    ['BTC', 'USDC'], ['ETH', 'USDC'],
  ]
  const BASE_PRICES: Record<string, number> = {
    BTC: 67500, ETH: 3450, BNB: 585, SOL: 165, XRP: 0.62, ADA: 0.45,
    DOGE: 0.16, AVAX: 38, LINK: 18.5, DOT: 7.2, MATIC: 0.72, LTC: 85,
    USDT: 1, USDC: 1,
  }
  const ASSET_NAMES: Record<string, string> = {
    BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'BNB', SOL: 'Solana', XRP: 'XRP',
    ADA: 'Cardano', DOGE: 'Dogecoin', AVAX: 'Avalanche', LINK: 'Chainlink',
    DOT: 'Polkadot', MATIC: 'Polygon', LTC: 'Litecoin',
    USDT: 'Tether', USDC: 'USD Coin',
  }

  for (const [base, quote] of PAIRS) {
    const symbol = `${base}${quote}`
    const price = BASE_PRICES[base] / BASE_PRICES[quote]
    await db.tradingPair.upsert({
      where: { symbol },
      create: {
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
      update: {},
    })
  }
  console.log(`✓ Upserted ${PAIRS.length} trading pairs`)

  // 2. Mark admin user
  const admin = await db.user.findUnique({ where: { email: ADMIN_EMAIL } })
  if (admin) {
    await db.user.update({
      where: { id: admin.id },
      data: { isAdmin: true },
    })
    console.log(`✓ Set ${ADMIN_EMAIL} as admin`)
  } else {
    console.log(`⚠ Admin user not found. Sign up with ${ADMIN_EMAIL} first, then re-run this script.`)
  }

  // 3. Create P2P listings (only if none exist)
  const existingListings = await db.p2PListing.count()
  if (existingListings === 0 && admin) {
    // Credit admin wallet with USDT for listings
    let adminWallet = await db.wallet.findUnique({
      where: { userId_asset: { userId: admin.id, asset: 'USDT' } },
    })
    if (!adminWallet) {
      adminWallet = await db.wallet.create({
        data: {
          userId: admin.id,
          asset: 'USDT',
          assetName: 'Tether',
          balance: 0, available: 0, locked: 0,
          depositAddress: 'internal-admin',
        },
      })
    }
    // Credit 40000 USDT
    await db.wallet.update({
      where: { id: adminWallet.id },
      data: { available: { increment: 40000 }, balance: { increment: 40000 } },
    })
    // Lock 40000 for listings
    await db.wallet.update({
      where: { id: adminWallet.id },
      data: { available: { decrement: 40000 }, locked: { increment: 40000 } },
    })

    const newListings = [
      { asset: 'USDT', fiat: 'ETB', side: 'SELL', price: 184.70, amount: 10000, methods: ['Telebirr'],
        paymentDetails: { Telebirr: { phone: '0962404391', name: 'Kirubel' } },
        terms: 'Send payment via Telebirr to 0962404391 (Kirubel), then upload the payment screenshot.' },
      { asset: 'USDT', fiat: 'ETB', side: 'SELL', price: 186.50, amount: 10000, methods: ['CBE'],
        paymentDetails: { 'CBE': { account: '1000031904904', name: 'Melesech' } },
        terms: 'Send payment via CBE to 1000031904904 (Melesech), then upload the payment screenshot.' },
      { asset: 'USDT', fiat: 'ETB', side: 'SELL', price: 186.78, amount: 10000, methods: ['Telebirr'],
        paymentDetails: { Telebirr: { phone: '0906045336', name: 'Amare' } },
        terms: 'Send payment via Telebirr to 0906045336 (Amare), then upload the payment screenshot.' },
      { asset: 'USDT', fiat: 'ETB', side: 'SELL', price: 185.64, amount: 10000, methods: ['CBE'],
        paymentDetails: { 'CBE': { account: '1000044413217', name: 'Tigist Mekonen' } },
        terms: 'Send payment via CBE to 1000044413217 (Tigist Mekonen), then upload the payment screenshot.' },
      { asset: 'USDT', fiat: 'ETB', side: 'BUY', price: 186.80, amount: 10000, methods: ['TRC20'],
        paymentDetails: { TRC20: { network: 'TRC20', address: 'TCKoT3qjmFBA7MxtXdNoVxixUhjVAPo48E', name: 'Abdu' } },
        terms: 'Send USDT via TRC20 to TCKoT3qjmFBA7MxtXdNoVxixUhjVAPo48E (Abdu).' },
      { asset: 'USDT', fiat: 'ETB', side: 'BUY', price: 187.10, amount: 10000, methods: ['BEP20'],
        paymentDetails: { BEP20: { network: 'BEP20', address: '0x1c4f79b327a1e98003b2333dcd1ba482be5c300a', name: 'Bezawit' } },
        terms: 'Send USDT via BEP20 to 0x1c4f79b327a1e98003b2333dcd1ba482be5c300a (Bezawit).' },
      { asset: 'USDT', fiat: 'ETB', side: 'BUY', price: 186.90, amount: 10000, methods: ['ERC20'],
        paymentDetails: { ERC20: { network: 'ERC20', address: '0x1c4f79b327a1e98003b2333dcd1ba482be5c300a', name: 'Abel' } },
        terms: 'Send USDT via ERC20 to 0x1c4f79b327a1e98003b2333dcd1ba482be5c300a (Abel).' },
    ]

    for (const l of newListings) {
      await db.p2PListing.create({
        data: {
          userId: admin.id,
          asset: l.asset, fiatCurrency: l.fiat, side: l.side,
          price: l.price, amount: l.amount, available: l.amount,
          minOrder: 3, maxOrder: l.amount * l.price,
          paymentMethods: JSON.stringify(l.methods),
          paymentDetails: JSON.stringify(l.paymentDetails),
          terms: l.terms,
          status: 'ACTIVE',
        },
      })
    }
    console.log(`✓ Created ${newListings.length} P2P listings`)
  } else {
    console.log(`✓ P2P listings already exist (${existingListings}), skipping`)
  }

  console.log('\n✅ Seed complete!')
  console.log('   Your P2PEX exchange is ready on Supabase.')
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
