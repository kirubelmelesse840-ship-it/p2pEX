/**
 * Remove admin privileges from ALL users EXCEPT kirubelmelesse840@gmail.com
 * Only Kirubel's account will be able to access the Admin Panel.
 */
import { db } from '../src/lib/db'

async function fixAdmins() {
  const keepAdminEmail = 'kirubelmelesse840@gmail.com'

  // Find all current admins
  const admins = await db.user.findMany({ where: { isAdmin: true } })
  console.log(`Found ${admins.length} admin(s):`)
  for (const a of admins) {
    console.log(`  - ${a.email} (${a.name})`)
  }

  // Remove admin from everyone except kirubelmelesse840@gmail.com
  const removed = await db.user.updateMany({
    where: {
      isAdmin: true,
      email: { not: keepAdminEmail },
    },
    data: { isAdmin: false },
  })
  console.log(`\nRemoved admin privileges from ${removed.count} user(s)`)

  // Verify
  const remaining = await db.user.findMany({ where: { isAdmin: true } })
  console.log(`\nRemaining admin(s): ${remaining.length}`)
  for (const a of remaining) {
    console.log(`  - ${a.email} (${a.name})`)
  }

  if (remaining.length === 1 && remaining[0].email === keepAdminEmail) {
    console.log('\n✓ Success: Only kirubelmelesse840@gmail.com has admin access')
  } else {
    console.log('\n✗ Warning: Unexpected admin list')
  }
}

fixAdmins()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); })
