/**
 * Make kirubelmelesse840@gmail.com an admin user.
 * If the user doesn't exist, create them with a default password.
 */
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

async function makeAdmin() {
  const email = 'kirubelmelesse840@gmail.com'
  const name = 'Kirubel Melesse'

  let user = await db.user.findUnique({ where: { email } })

  if (!user) {
    // Create the user with a default password
    user = await db.user.create({
      data: {
        email,
        name,
        passwordHash: hashPassword('kirubel12345'),
        isAdmin: true,
        kycVerified: true,
        kycLevel: 2,
        fiatCurrency: 'ETB',
        isActive: true,
      },
    })
    console.log(`Created user ${email} with admin privileges`)

    // Create default wallets with starting balances (same as demo user)
    const defaultAssets = [
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
    for (const a of defaultAssets) {
      await db.wallet.create({
        data: {
          userId: user.id,
          asset: a.symbol,
          assetName: a.name,
          balance: a.amount,
          available: a.amount,
          depositAddress: 'T' + Math.random().toString(36).slice(2, 34).toUpperCase(),
        },
      })
    }
    console.log(`Created ${defaultAssets.length} wallets for ${email}`)
  } else {
    // User already exists - just make them admin
    await db.user.update({
      where: { id: user.id },
      data: { isAdmin: true, kycVerified: true, kycLevel: 2 },
    })
    console.log(`User ${email} updated to admin`)
  }

  // Verify
  const updated = await db.user.findUnique({ where: { email } })
  console.log(`Verification: ${updated.email} - isAdmin=${updated.isAdmin}, kycLevel=${updated.kycLevel}`)
  console.log('Done. Login password: kirubel12345')
}

makeAdmin()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); })
