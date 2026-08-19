/**
 * One-time DB cleanup script.
 *
 * Rewrites any stored AdminNotification rows whose title/message still contain
 * the old "Admin Review" / "admin is checking" wording to the new neutral
 * "Order Under Review" / "Our team is verifying" wording introduced in
 * src/app/api/p2p/orders/route.ts.
 *
 * Run with:  npx tsx scripts/fix-old-notification-text.ts
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('[fix-old-notification-text] starting…')

  // 1. Update titles that still contain "Admin Review"
  const titleUpdate = await db.adminNotification.updateMany({
    where: { title: { contains: 'Admin Review', mode: 'insensitive' } },
    data: { title: '⏳ Order Under Review' },
  })
  console.log(`[fix-old-notification-text] updated ${titleUpdate.count} titles`)

  // 2. Update messages that mention "admin is checking both sides"
  const msgUpdate1 = await db.adminNotification.updateMany({
    where: { message: { contains: 'admin is checking both sides', mode: 'insensitive' } },
    data: {
      message:
        'Our team is verifying both sides. Please wait patiently — your crypto will be transferred once approved.',
    },
  })
  console.log(`[fix-old-notification-text] updated ${msgUpdate1.count} messages (admin is checking)`)

  // 3. Update messages that mention "The admin is now reviewing"
  const msgUpdate2 = await db.adminNotification.updateMany({
    where: { message: { contains: 'The admin is now reviewing', mode: 'insensitive' } },
    data: {
      message:
        'The seller confirmed receiving your payment. Our team is now reviewing and will release your crypto shortly.',
    },
  })
  console.log(`[fix-old-notification-text] updated ${msgUpdate2.count} messages (admin now reviewing)`)

  // 4. Update messages that mention "awaiting admin approval"
  const msgUpdate3 = await db.adminNotification.updateMany({
    where: { message: { contains: 'awaiting admin approval', mode: 'insensitive' } },
    data: { message: 'Awaiting review' },
  })
  console.log(`[fix-old-notification-text] updated ${msgUpdate3.count} messages (awaiting admin approval)`)

  // 5. Update messages that mention "An admin will review"
  const msgUpdate4 = await db.adminNotification.updateMany({
    where: { message: { contains: 'admin will review', mode: 'insensitive' } },
    data: { message: 'Your application will be reviewed shortly.' },
  })
  console.log(`[fix-old-notification-text] updated ${msgUpdate4.count} messages (admin will review)`)

  console.log('[fix-old-notification-text] done.')
}

main()
  .catch((e) => {
    console.error('[fix-old-notification-text] error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
