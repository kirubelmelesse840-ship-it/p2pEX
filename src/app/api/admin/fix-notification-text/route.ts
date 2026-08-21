/**
 * POST /api/admin/fix-notification-text
 *
 * One-time cleanup endpoint that rewrites any stored AdminNotification rows
 * whose title/message still contain the old "Admin Review" / "admin is checking"
 * wording to the new neutral wording.
 *
 * Must be called by an authenticated admin user.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: Request) {
// AUTO-TRY-CATCH
  try {

    // Auth check — only admins can run this
    const user = await getCurrentUser(req)
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const results = {
      titlesUpdated: 0,
      messagesAdminChecking: 0,
      messagesAdminNowReviewing: 0,
      messagesAwaitingAdminApproval: 0,
      messagesAdminWillReview: 0,
    }

    try {
      // 1. Update titles that still contain "Admin Review"
      const titleUpdate = await db.adminNotification.updateMany({
        where: { title: { contains: 'Admin Review', mode: 'insensitive' } },
        data: { title: '⏳ Order Under Review' },
      })
      results.titlesUpdated = titleUpdate.count

      // 2. Update messages that mention "admin is checking both sides"
      const msgUpdate1 = await db.adminNotification.updateMany({
        where: { message: { contains: 'admin is checking both sides', mode: 'insensitive' } },
        data: {
          message:
            'Our team is verifying both sides. Please wait patiently — your crypto will be transferred once approved.',
        },
      })
      results.messagesAdminChecking = msgUpdate1.count

      // 3. Update messages that mention "The admin is now reviewing"
      const msgUpdate2 = await db.adminNotification.updateMany({
        where: { message: { contains: 'The admin is now reviewing', mode: 'insensitive' } },
        data: {
          message:
            'The seller confirmed receiving your payment. Our team is now reviewing and will release your crypto shortly.',
        },
      })
      results.messagesAdminNowReviewing = msgUpdate2.count

      // 4. Update messages that mention "awaiting admin approval"
      const msgUpdate3 = await db.adminNotification.updateMany({
        where: { message: { contains: 'awaiting admin approval', mode: 'insensitive' } },
        data: { message: 'Awaiting review' },
      })
      results.messagesAwaitingAdminApproval = msgUpdate3.count

      // 5. Update messages that mention "An admin will review"
      const msgUpdate4 = await db.adminNotification.updateMany({
        where: { message: { contains: 'admin will review', mode: 'insensitive' } },
        data: { message: 'Your application will be reviewed shortly.' },
      })
      results.messagesAdminWillReview = msgUpdate4.count

      return NextResponse.json({
        ok: true,
        message: 'Old notification text cleaned up successfully',
        results,
      })
    } catch (e: any) {
      console.error('[fix-notification-text]', e)
      return NextResponse.json(
        { error: e.message || 'Internal error' },
        { status: 500 }
      )
    }

  } catch (e: any) {
    console.error('[admin route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
