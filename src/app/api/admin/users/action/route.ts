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
      updateData = { kycVerified: true, kycLevel: Math.min(Math.max(parseInt(payload.level) || 1, 1), 2) }
      message = `User ${target.email} KYC verified (L${updateData.kycLevel})`
      break
    case 'resetKyc':
      updateData = { kycVerified: false, kycLevel: 0 }
      message = `User ${target.email} KYC reset`
      break
    case 'deleteUser':
      await db.user.delete({ where: { id: userId } })
      return NextResponse.json({ ok: true, message: `User ${target.email} deleted` })
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  await db.user.update({ where: { id: userId }, data: updateData })
  return NextResponse.json({ ok: true, message })
}
