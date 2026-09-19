/**
 * POST /api/auth/reset-password
 *
 * One-time password reset endpoint. Requires a secret reset code
 * that only the site owner knows.
 *
 * Body: { email, newPassword, resetCode }
 *
 * The resetCode is a temporary secret — change it after use.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// Secret reset code — only the site owner knows this
const RESET_CODE = 'p2pex-reset-2026'

export async function POST(req: NextRequest) {
  try {
    const { email, newPassword, resetCode } = await req.json()

    // Validate reset code
    if (resetCode !== RESET_CODE) {
      return NextResponse.json({ error: 'Invalid reset code' }, { status: 403 })
    }

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and new password required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const user = await db.user.findUnique({ where: { email: normalizedEmail } })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Set new password
    const newHash = hashPassword(newPassword)
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    })

    return NextResponse.json({
      ok: true,
      message: `Password reset successfully for ${normalizedEmail}. You can now log in with your new password.`,
      user: { email: user.email, name: user.name, isAdmin: user.isAdmin },
    })
  } catch (e: any) {
    console.error('[reset-password]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
