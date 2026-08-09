/**
 * GET /api/admin/settings - get all system settings
 * POST /api/admin/settings - update settings
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getSetting, setSetting } from '@/lib/auth'
import { db } from '@/lib/db'

const SETTING_KEYS = [
  'maintenanceMode', 'marketPaused', 'spotFeePercent', 'p2pFeePercent',
  'withdrawFeeMultiplier', 'minKycLevel', 'maxDailyWithdrawUsd',
  'supportEmail', 'announcement',
]

const DEFAULTS: Record<string, string> = {
  maintenanceMode: 'false',
  marketPaused: 'false',
  spotFeePercent: '0.1',
  p2pFeePercent: '0.0',
  withdrawFeeMultiplier: '1.0',
  minKycLevel: '0',
  maxDailyWithdrawUsd: '10000',
  supportEmail: 'support@crypex.com',
  announcement: 'Welcome to P2PET — trade securely with confidence!',
}

export async function GET(req: NextRequest) {
  const { error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })

  const rows = await db.setting.findMany({ where: { key: { in: SETTING_KEYS } } })
  const settings: Record<string, string> = {}
  for (const k of SETTING_KEYS) {
    settings[k] = rows.find(r => r.key === k)?.value ?? DEFAULTS[k]
  }
  return NextResponse.json({ settings })
}

export async function POST(req: NextRequest) {
  const { error, status } = await requireAdmin(req as unknown as Request)
  if (error) return NextResponse.json({ error }, { status })

  const body = await req.json()
  const updates = body.settings || body
  const updated: Record<string, string> = {}

  for (const key of Object.keys(updates)) {
    if (SETTING_KEYS.includes(key)) {
      const value = String(updates[key])
      await setSetting(key, value)
      updated[key] = value
    }
  }

  return NextResponse.json({
    ok: true,
    message: `${Object.keys(updated).length} setting(s) updated`,
    settings: updated,
  })
}
