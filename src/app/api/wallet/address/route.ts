/**
 * GET /api/wallet/address?asset=BTC - get deposit address for an asset
 * POST /api/wallet/address - generate new address (returns existing for demo)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const url = new URL(req.url)
    const asset = url.searchParams.get('asset')
    if (!asset) return NextResponse.json({ error: 'asset required' }, { status: 400 })

    const wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: user.id, asset } } })
    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })

    // Multiple networks for stablecoins
    const networks = asset === 'USDT'
      ? [
          { network: 'TRC20', address: 'T' + (wallet.depositAddress || '').slice(1, 34).padEnd(33, 'A'), fee: 1, confirmations: 1 },
          { network: 'ERC20', address: '0x' + (wallet.depositAddress || '').slice(2, 42).padEnd(40, 'a'), fee: 5, confirmations: 12 },
          { network: 'BSC',  address: '0x' + (wallet.depositAddress || '').slice(2, 42).padEnd(40, 'b'), fee: 0.5, confirmations: 12 },
        ]
      : asset === 'USDC'
      ? [
          { network: 'ERC20', address: '0x' + (wallet.depositAddress || '').slice(2, 42).padEnd(40, 'a'), fee: 5, confirmations: 12 },
        ]
      : [
          {
            network: asset === 'BTC' ? 'BTC' : asset === 'ETH' ? 'ERC20' : asset,
            address: wallet.depositAddress,
            fee: asset === 'BTC' ? 0.0001 : asset === 'ETH' ? 0.001 : 0.01,
            confirmations: asset === 'BTC' ? 3 : 12,
          },
        ]

    return NextResponse.json({
      asset,
      networks: networks.map(n => ({ ...n, address: n.address || wallet.depositAddress })),
    })
  } catch (e: any) {
    console.error('[wallet/address GET]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { asset } = body
    if (!asset) return NextResponse.json({ error: 'asset required' }, { status: 400 })

    const wallet = await db.wallet.findUnique({ where: { userId_asset: { userId: user.id, asset } } })
    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })

    // For demo: just return existing address
    return NextResponse.json({
      asset,
      network: asset === 'BTC' ? 'BTC' : asset === 'ETH' ? 'ERC20' : asset,
      address: wallet.depositAddress,
      message: 'Use this address to receive funds.',
    })
  } catch (e: any) {
    console.error('[wallet/address POST]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
