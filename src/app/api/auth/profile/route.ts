/**
 * POST /api/auth/profile - update user profile (name, fiatCurrency)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    try {
      const user = await getCurrentUser(req as unknown as Request)
      if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

      const body = await req.json().catch(() => ({}))
      const { name, fiatCurrency } = body

      const updateData: any = {}
      if (name && name.trim()) updateData.name = name.trim()
      if (fiatCurrency) updateData.fiatCurrency = fiatCurrency

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
      }

      const updated = await db.user.update({
        where: { id: user.id },
        data: updateData,
      })

      return NextResponse.json({
        ok: true,
        user: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          fiatCurrency: updated.fiatCurrency,
          kycVerified: updated.kycVerified,
          kycLevel: updated.kycLevel,
          kycStatus: updated.kycStatus,
          isAdmin: updated.isAdmin,
        },
      })
    } catch (e: any) {
      console.error('[profile POST]', e)
      return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
    }

  } catch (e: any) {
    console.error('[user route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
