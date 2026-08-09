/**
 * Make the demo user an admin and seed default system settings.
 */
import { db } from '../src/lib/db'

async function makeAdmin() {
  const user = await db.user.findUnique({ where: { email: 'demo@crypex.com' } })
  if (!user) {
    console.error('Demo user not found. Run seed first.')
    process.exit(1)
  }
  await db.user.update({
    where: { id: user.id },
    data: { isAdmin: true, kycVerified: true, kycLevel: 2 },
  })
  console.log(`Demo user ${user.email} is now an admin`)

  // Seed default settings
  const defaults = [
    { key: 'maintenanceMode', value: 'false' },
    { key: 'marketPaused', value: 'false' },
    { key: 'spotFeePercent', value: '0.1' },
    { key: 'p2pFeePercent', value: '0.0' },
    { key: 'withdrawFeeMultiplier', value: '1.0' },
    { key: 'minKycLevel', value: '0' },
    { key: 'maxDailyWithdrawUsd', value: '10000' },
    { key: 'supportEmail', value: 'support@crypex.com' },
    { key: 'announcement', value: 'Welcome to P2PEX — trade securely with confidence!' },
  ]
  for (const s of defaults) {
    const existing = await db.setting.findUnique({ where: { key: s.key } })
    if (!existing) {
      await db.setting.create({ data: s })
      console.log(`Setting ${s.key} = ${s.value}`)
    }
  }
  console.log('Done')
}

makeAdmin()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); })
