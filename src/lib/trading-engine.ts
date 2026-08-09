/**
 * Trading Engine - core order matching logic
 *
 * Supports LIMIT and MARKET orders, BUY and SELL sides.
 * Implements price-time priority matching against existing orders.
 */

import { db } from '@/lib/db'

export interface MatchResult {
  trades: Array<{
    buyOrderId: string
    sellOrderId: string
    price: number
    quantity: number
    buyerUserId: string
    sellerUserId: string
  }>
  filledQty: number
}

/**
 * Place a new order and match against the order book.
 * - MARKET orders match immediately against the best available prices.
 * - LIMIT orders match against any opposing orders at equal-or-better price,
 *   then rest in the book.
 */
export async function placeOrder(params: {
  userId: string
  symbol: string
  side: 'BUY' | 'SELL'
  type: 'LIMIT' | 'MARKET'
  price: number
  quantity: number
}): Promise<{ order: any; trades: any[] }> {
  const { userId, symbol, side, type, price, quantity } = params
  if (quantity <= 0) throw new Error('Quantity must be positive')
  if (type === 'LIMIT' && price <= 0) throw new Error('Limit price must be positive')

  // Find pair
  const pair = await db.tradingPair.findUnique({ where: { symbol } })
  if (!pair) throw new Error(`Trading pair ${symbol} not found`)

  // Get user wallets
  const baseWallet = await db.wallet.findUnique({ where: { userId_asset: { userId, asset: pair.baseAsset } } })
  const quoteWallet = await db.wallet.findUnique({ where: { userId_asset: { userId, asset: pair.quoteAsset } } })
  if (!baseWallet) throw new Error(`No ${pair.baseAsset} wallet`)
  if (!quoteWallet) throw new Error(`No ${pair.quoteAsset} wallet`)

  // Check balances / lock funds
  if (side === 'SELL') {
    // Need baseAsset
    if (baseWallet.available < quantity) {
      throw new Error(`Insufficient ${pair.baseAsset} balance. Available: ${baseWallet.available}`)
    }
  } else if (side === 'BUY' && type === 'LIMIT') {
    // Need quoteAsset = price * quantity
    const cost = price * quantity
    if (quoteWallet.available < cost) {
      throw new Error(`Insufficient ${pair.quoteAsset} balance. Available: ${quoteWallet.available}`)
    }
  } else if (side === 'BUY' && type === 'MARKET') {
    // Market buy: user specifies total quote amount they want to spend? or quantity they want to receive?
    // Convention: For MARKET BUY, treat quantity as the base asset quantity desired.
    // We'll estimate max cost = current price * quantity * 1.05 (slippage tolerance) and lock that.
    const estimatedCost = price * quantity * 1.05
    if (quoteWallet.available < estimatedCost) {
      throw new Error(`Insufficient ${pair.quoteAsset} balance for market buy. Need ~${estimatedCost}, available: ${quoteWallet.available}`)
    }
  }

  // Lock funds
  if (side === 'SELL') {
    await db.wallet.update({
      where: { id: baseWallet.id },
      data: {
        available: { decrement: quantity },
        locked: { increment: quantity },
      },
    })
  } else if (side === 'BUY' && type === 'LIMIT') {
    const cost = price * quantity
    await db.wallet.update({
      where: { id: quoteWallet.id },
      data: {
        available: { decrement: cost },
        locked: { increment: cost },
      },
    })
  } else if (side === 'BUY' && type === 'MARKET') {
    // Lock worst-case cost
    const cost = price * quantity * 1.05
    await db.wallet.update({
      where: { id: quoteWallet.id },
      data: {
        available: { decrement: cost },
        locked: { increment: cost },
      },
    })
  }

  // Create order
  const total = type === 'LIMIT' ? price * quantity : 0
  const order = await db.order.create({
    data: {
      userId,
      pairId: pair.id,
      symbol,
      side,
      type,
      price,
      quantity,
      filledQty: 0,
      total,
      status: 'OPEN',
    },
  })

  // Match against opposing orders
  const opposingSide = side === 'BUY' ? 'SELL' : 'BUY'
  const opposingOrders = await db.order.findMany({
    where: {
      symbol,
      side: opposingSide,
      status: { in: ['OPEN', 'PARTIAL'] },
      type: 'LIMIT',
      ...(side === 'BUY'
        ? { price: { lte: type === 'LIMIT' ? price : Number.MAX_SAFE_INTEGER } }
        : { price: { gte: type === 'LIMIT' ? price : 0 } }),
    },
    orderBy: side === 'BUY' ? [{ price: 'asc' }, { createdAt: 'asc' }] : [{ price: 'desc' }, { createdAt: 'asc' }],
  })

  const tradesCreated: any[] = []
  let remainingQty = quantity
  let totalSpent = 0

  for (const opp of opposingOrders) {
    if (remainingQty <= 0) break
    const availableQty = opp.quantity - opp.filledQty
    if (availableQty <= 0) continue
    const matchQty = Math.min(remainingQty, availableQty)
    const matchPrice = opp.price
    const matchTotal = matchQty * matchPrice

    // Determine buyer and seller
    const buyerId = side === 'BUY' ? userId : opp.userId
    const sellerId = side === 'BUY' ? opp.userId : userId
    const buyOrderId = side === 'BUY' ? order.id : opp.id
    const sellOrderId = side === 'BUY' ? opp.id : order.id

    // Create trade
    const trade = await db.trade.create({
      data: {
        pairId: pair.id,
        symbol,
        price: matchPrice,
        quantity: matchQty,
        total: matchTotal,
        buyerId,
        sellerId,
        buyOrderId,
        sellOrderId,
        makerSide: opposingSide,
        isMaker: false,
      },
    })
    tradesCreated.push(trade)

    // Update opposing order
    const newOppFilled = opp.filledQty + matchQty
    const newOppStatus = newOppFilled >= opp.quantity ? 'FILLED' : 'PARTIAL'
    await db.order.update({
      where: { id: opp.id },
      data: { filledQty: newOppFilled, status: newOppStatus },
    })

    // Settle funds for the opposing order (the maker)
    if (opp.side === 'SELL') {
      // Maker was selling: locked baseAsset gets converted to quoteAsset
      const oppBaseWallet = await db.wallet.findUnique({ where: { userId_asset: { userId: opp.userId, asset: pair.baseAsset } } })
      if (oppBaseWallet) {
        await db.wallet.update({
          where: { id: oppBaseWallet.id },
          data: {
            locked: { decrement: matchQty },
            balance: { decrement: matchQty },
          },
        })
      }
      const oppQuoteWallet = await db.wallet.findUnique({ where: { userId_asset: { userId: opp.userId, asset: pair.quoteAsset } } })
      if (oppQuoteWallet) {
        await db.wallet.update({
          where: { id: oppQuoteWallet.id },
          data: {
            balance: { increment: matchTotal },
            available: { increment: matchTotal },
          },
        })
      }
    } else {
      // Maker was buying: locked quoteAsset gets converted to baseAsset
      const oppQuoteWallet = await db.wallet.findUnique({ where: { userId_asset: { userId: opp.userId, asset: pair.quoteAsset } } })
      if (oppQuoteWallet) {
        await db.wallet.update({
          where: { id: oppQuoteWallet.id },
          data: {
            locked: { decrement: matchTotal },
            balance: { decrement: matchTotal },
          },
        })
      }
      const oppBaseWallet = await db.wallet.findUnique({ where: { userId_asset: { userId: opp.userId, asset: pair.baseAsset } } })
      if (oppBaseWallet) {
        await db.wallet.update({
          where: { id: oppBaseWallet.id },
          data: {
            balance: { increment: matchQty },
            available: { increment: matchQty },
          },
        })
      }
    }

    // Settle funds for the taker (current user's order)
    if (side === 'BUY') {
      // Taker is buying: spend quoteAsset, receive baseAsset
      totalSpent += matchTotal
      const takerQuoteWallet = await db.wallet.findUnique({ where: { userId_asset: { userId, asset: pair.quoteAsset } } })
      if (takerQuoteWallet) {
        await db.wallet.update({
          where: { id: takerQuoteWallet.id },
          data: { locked: { decrement: matchTotal }, balance: { decrement: matchTotal } },
        })
      }
      const takerBaseWallet = await db.wallet.findUnique({ where: { userId_asset: { userId, asset: pair.baseAsset } } })
      if (takerBaseWallet) {
        await db.wallet.update({
          where: { id: takerBaseWallet.id },
          data: { balance: { increment: matchQty }, available: { increment: matchQty } },
        })
      }
    } else {
      // Taker is selling: spend baseAsset, receive quoteAsset
      const takerBaseWallet = await db.wallet.findUnique({ where: { userId_asset: { userId, asset: pair.baseAsset } } })
      if (takerBaseWallet) {
        await db.wallet.update({
          where: { id: takerBaseWallet.id },
          data: { locked: { decrement: matchQty }, balance: { decrement: matchQty } },
        })
      }
      const takerQuoteWallet = await db.wallet.findUnique({ where: { userId_asset: { userId, asset: pair.quoteAsset } } })
      if (takerQuoteWallet) {
        await db.wallet.update({
          where: { id: takerQuoteWallet.id },
          data: { balance: { increment: matchTotal }, available: { increment: matchTotal } },
        })
      }
    }

    // Update pair last price
    await db.tradingPair.update({
      where: { id: pair.id },
      data: {
        lastPrice: matchPrice,
        volume24h: { increment: matchQty },
        quoteVolume24h: { increment: matchTotal },
      },
    })

    remainingQty -= matchQty
  }

  // For MARKET BUY: refund unused locked quoteAsset
  if (side === 'BUY' && type === 'MARKET') {
    const expectedMaxCost = price * quantity * 1.05
    const unused = expectedMaxCost - totalSpent
    if (unused > 0) {
      const takerQuoteWallet = await db.wallet.findUnique({ where: { userId_asset: { userId, asset: pair.quoteAsset } } })
      if (takerQuoteWallet) {
        await db.wallet.update({
          where: { id: takerQuoteWallet.id },
          data: {
            locked: { decrement: unused },
            available: { increment: unused },
          },
        })
      }
    }
  }

  // Update our order
  const filledQty = quantity - remainingQty
  const newStatus = filledQty >= quantity ? 'FILLED' : filledQty > 0 ? 'PARTIAL' : 'OPEN'
  await db.order.update({
    where: { id: order.id },
    data: {
      filledQty,
      status: newStatus,
      ...(type === 'MARKET' && filledQty > 0 ? { total: totalSpent } : {}),
    },
  })

  // If LIMIT order has remaining qty, the funds stay locked (already locked above)
  // If MARKET order didn't fill, refund locked funds
  if (type === 'MARKET' && filledQty === 0) {
    if (side === 'SELL') {
      const takerBaseWallet = await db.wallet.findUnique({ where: { userId_asset: { userId, asset: pair.baseAsset } } })
      if (takerBaseWallet) {
        await db.wallet.update({
          where: { id: takerBaseWallet.id },
          data: {
            locked: { decrement: quantity },
            available: { increment: quantity },
          },
        })
      }
    } else {
      const expectedMaxCost = price * quantity * 1.05
      const takerQuoteWallet = await db.wallet.findUnique({ where: { userId_asset: { userId, asset: pair.quoteAsset } } })
      if (takerQuoteWallet) {
        await db.wallet.update({
          where: { id: takerQuoteWallet.id },
          data: {
            locked: { decrement: expectedMaxCost },
            available: { increment: expectedMaxCost },
          },
        })
      }
    }
  }

  const finalOrder = await db.order.findUnique({ where: { id: order.id } })
  return { order: finalOrder, trades: tradesCreated }
}

/**
 * Cancel an open order. Refunds any locked funds.
 */
export async function cancelOrder(orderId: string, userId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order) throw new Error('Order not found')
  if (order.userId !== userId) throw new Error('Not your order')
  if (order.status === 'FILLED' || order.status === 'CANCELED') {
    throw new Error(`Cannot cancel order in status ${order.status}`)
  }

  const pair = await db.tradingPair.findUnique({ where: { id: order.pairId } })
  if (!pair) throw new Error('Pair not found')

  const remainingQty = order.quantity - order.filledQty
  if (remainingQty <= 0) {
    await db.order.update({ where: { id: orderId }, data: { status: 'CANCELED' } })
    return { order }
  }

  // Refund locked funds
  if (order.side === 'SELL') {
    const wallet = await db.wallet.findUnique({ where: { userId_asset: { userId, asset: pair.baseAsset } } })
    if (wallet) {
      await db.wallet.update({
        where: { id: wallet.id },
        data: {
          locked: { decrement: remainingQty },
          available: { increment: remainingQty },
        },
      })
    }
  } else if (order.side === 'BUY' && order.type === 'LIMIT') {
    const refundAmount = remainingQty * order.price
    const wallet = await db.wallet.findUnique({ where: { userId_asset: { userId, asset: pair.quoteAsset } } })
    if (wallet) {
      await db.wallet.update({
        where: { id: wallet.id },
        data: {
          locked: { decrement: refundAmount },
          available: { increment: refundAmount },
        },
      })
    }
  }

  const updated = await db.order.update({
    where: { id: orderId },
    data: { status: 'CANCELED' },
  })
  return { order: updated }
}

/**
 * Get the aggregated order book for a symbol from DB.
 */
export async function getOrderBook(symbol: string, limit = 20) {
  const pair = await db.tradingPair.findUnique({ where: { symbol } })
  if (!pair) throw new Error('Pair not found')

  const openBuyOrders = await db.order.findMany({
    where: { symbol, side: 'BUY', status: { in: ['OPEN', 'PARTIAL'] } },
    orderBy: [{ price: 'desc' }, { createdAt: 'asc' }],
    take: limit * 4,
  })

  const openSellOrders = await db.order.findMany({
    where: { symbol, side: 'SELL', status: { in: ['OPEN', 'PARTIAL'] } },
    orderBy: [{ price: 'asc' }, { createdAt: 'asc' }],
    take: limit * 4,
  })

  // Aggregate
  const bidMap = new Map<number, number>()
  const askMap = new Map<number, number>()
  for (const o of openBuyOrders) {
    const remaining = o.quantity - o.filledQty
    if (remaining <= 0) continue
    bidMap.set(o.price, (bidMap.get(o.price) || 0) + remaining)
  }
  for (const o of openSellOrders) {
    const remaining = o.quantity - o.filledQty
    if (remaining <= 0) continue
    askMap.set(o.price, (askMap.get(o.price) || 0) + remaining)
  }

  const bids = Array.from(bidMap.entries())
    .map(([price, qty]) => [price, qty] as [number, number])
    .sort((a, b) => b[0] - a[0])
    .slice(0, limit)
  const asks = Array.from(askMap.entries())
    .map(([price, qty]) => [price, qty] as [number, number])
    .sort((a, b) => a[0] - b[0])
    .slice(0, limit)

  return { bids, asks }
}
