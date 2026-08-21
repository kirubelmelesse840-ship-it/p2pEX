/**
 * GET /api/admin/announcement - public endpoint to fetch announcement banner text
 * No admin required - this is read by all users
 */
import { NextResponse } from 'next/server'
import { getSetting } from '@/lib/auth'

export async function GET() {
// AUTO-TRY-CATCH
  try {

    const announcement = await getSetting('announcement', '')
    const maintenanceMode = (await getSetting('maintenanceMode', 'false')) === 'true'
    return NextResponse.json({ announcement, maintenanceMode })

  } catch (e: any) {
    console.error('[admin route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
