/**
 * GET /api/wallet/transactions - list user's deposit/withdraw history
 * Resolves P2P:userId addresses to real user names for display
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
    const asset = url.searchParams.get('asset')

    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        ...(asset ? { asset } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Resolve P2P:userId addresses to real names
    const userIdsToResolve = new Set<string>()
    for (const tx of transactions) {
      const fromMatch = tx.fromAddress?.match(/P2P:(.+)/)
      const toMatch = tx.toAddress?.match(/P2P:(.+)/)
      if (fromMatch) userIdsToResolve.add(fromMatch[1])
      if (toMatch) userIdsToResolve.add(toMatch[1])
    }

    let userNameMap: Record<string, { name: string; userId: string | null }> = {}
    if (userIdsToResolve.size > 0) {
      const users = await db.user.findMany({
        where: { id: { in: Array.from(userIdsToResolve) } },
        select: { id: true, name: true, userId: true },
      })
      for (const u of users) {
        userNameMap[u.id] = { name: u.name, userId: u.userId }
      }
    }

    // Map transactions with resolved names
    const enrichedTransactions = transactions.map(tx => {
      const fromMatch = tx.fromAddress?.match(/P2P:(.+)/)
      const toMatch = tx.toAddress?.match(/P2P:(.+)/)
      
      let fromName: string | null = null
      let toName: string | null = null
      
      if (fromMatch && userNameMap[fromMatch[1]]) {
        fromName = userNameMap[fromMatch[1]].name
      }
      if (toMatch && userNameMap[toMatch[1]]) {
        toName = userNameMap[toMatch[1]].name
      }

      return {
        ...tx,
        fromName,
        toName,
      }
    })

    return NextResponse.json({ transactions: enrichedTransactions })
  } catch (e: any) {
    console.error('[wallet/transactions]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
