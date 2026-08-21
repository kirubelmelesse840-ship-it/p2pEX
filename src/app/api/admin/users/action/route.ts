/**
 * POST /api/admin/users/action - perform action on a user
 * Body: { userId, action, ...payload }
 *   action: 'ban' (with reason), 'unban', 'activate', 'deactivate',
 *           'makeAdmin', 'removeAdmin', 'verifyKyc' (with level), 'resetKyc',
 *           'deleteUser'
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    const { user: admin, error, status } = await requireAdmin(req as unknown as Request)
    if (error) return NextResponse.json({ error }, { status })

    const { userId, action, ...payload } = await req.json()
    if (!userId || !action) {
      return NextResponse.json({ error: 'userId and action required' }, { status: 400 })
    }

    // Don't allow admin to ban/delete themselves
    if (userId === admin.id && (action === 'ban' || action === 'deactivate' || action === 'deleteUser' || action === 'removeAdmin')) {
      return NextResponse.json({ error: 'Cannot perform this action on yourself' }, { status: 400 })
    }

    const target = await db.user.findUnique({ where: { id: userId } })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let updateData: any = {}
    let message = ''

    switch (action) {
      case 'ban':
        updateData = { isBanned: true, isActive: false, banReason: payload.reason || 'Banned by admin' }
        message = `User ${target.email} banned`
        break
      case 'unban':
        updateData = { isBanned: false, isActive: true, banReason: null }
        message = `User ${target.email} unbanned`
        break
      case 'activate':
        updateData = { isActive: true }
        message = `User ${target.email} activated`
        break
      case 'deactivate':
        updateData = { isActive: false }
        message = `User ${target.email} deactivated`
        break
      case 'makeAdmin':
        updateData = { isAdmin: true }
        message = `User ${target.email} promoted to admin`
        break
      case 'removeAdmin':
        updateData = { isAdmin: false }
        message = `User ${target.email} demoted from admin`
        break
      case 'verifyKyc':
        // Admin approves KYC - sets verified + status to APPROVED
        updateData = {
          kycVerified: true,
          kycLevel: Math.min(Math.max(parseInt(payload.level) || 1, 1), 2),
          kycStatus: 'APPROVED',
          kycReviewedAt: new Date(),
          kycRejectionReason: null,
        }
        message = `User ${target.email} KYC approved (L${updateData.kycLevel})`
        // Credit the 10 USDT welcome bonus ONLY when KYC is approved
        // (only if not already credited — check if a welcome bonus transaction exists)
        if (!target.kycVerified) {
          try {
            const existingBonus = await db.transaction.findFirst({
              where: { userId: target.id, network: 'WELCOME_BONUS' },
            })
            if (!existingBonus) {
              const { creditWelcomeBonus } = await import('@/lib/welcome-bonus')
              await creditWelcomeBonus(target.id)
              message += ' — 10 USDT welcome bonus credited'
            }
          } catch (e: any) {
            console.error('[admin/users/action] welcome bonus failed:', e?.message)
          }
        }
        break
      case 'rejectKyc':
        // Admin rejects KYC
        updateData = {
          kycVerified: false,
          kycLevel: 0,
          kycStatus: 'REJECTED',
          kycReviewedAt: new Date(),
          kycRejectionReason: payload.reason || 'Failed verification requirements',
        }
        message = `User ${target.email} KYC rejected`
        break
      case 'unapproveKyc':
        // Revoke verification and allow user to submit new info immediately
        // Clears old documents so user starts fresh
        updateData = {
          kycVerified: false,
          kycLevel: 0,
          kycStatus: 'NONE',
          kycSubmittedAt: null,
          kycReviewedAt: new Date(),
          kycRejectionReason: 'Verification revoked by admin — please resubmit',
          kycDocumentFront: null,
          kycDocumentBack: null,
        }
        message = `User ${target.email} verification revoked — can resubmit immediately`
        break
      case 'resetKyc':
        // Completely wipe all KYC data (documents, info, everything)
        updateData = {
          kycVerified: false,
          kycLevel: 0,
          kycStatus: 'NONE',
          kycFullName: null,
          kycDateOfBirth: null,
          kycNationality: null,
          kycIdType: null,
          kycIdNumber: null,
          kycAddress: null,
          kycDocumentFront: null,
          kycDocumentBack: null,
          kycSubmittedAt: null,
          kycReviewedAt: null,
          kycRejectionReason: null,
        }
        message = `User ${target.email} KYC completely reset`
        break
      case 'deleteUser':
        await db.user.delete({ where: { id: userId } })
        return NextResponse.json({ ok: true, message: `User ${target.email} deleted` })
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    await db.user.update({ where: { id: userId }, data: updateData })
    return NextResponse.json({ ok: true, message })

  } catch (e: any) {
    console.error('[admin route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
