/**
 * Reset KYC status for all non-admin users.
 * This ensures every non-admin user shows as "Unverified" until they submit
 * KYC and get admin approval.
 *
 * Admins (kirubelmelesse840@gmail.com) keep their verified status.
 */
import { db } from '../src/lib/db'

async function resetKyc() {
  const users = await db.user.findMany()
  console.log(`Found ${users.length} users`)

  for (const u of users) {
    if (u.isAdmin) {
      // Admins keep their verified status
      console.log(`✓ Keeping admin verified: ${u.email}`)
      continue
    }
    // Reset all non-admin users to unverified NONE status
    await db.user.update({
      where: { id: u.id },
      data: {
        kycVerified: false,
        kycLevel: 0,
        kycStatus: 'NONE',
      },
    })
    console.log(`✓ Reset KYC to NONE: ${u.email}`)
  }

  // Verify
  const all = await db.user.findMany({ select: { email: true, kycVerified: true, kycStatus: true, isAdmin: true } })
  console.log('\nFinal state:')
  for (const u of all) {
    console.log(`  ${u.email} - verified=${u.kycVerified}, status=${u.kycStatus}, admin=${u.isAdmin}`)
  }
}

resetKyc()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); })
