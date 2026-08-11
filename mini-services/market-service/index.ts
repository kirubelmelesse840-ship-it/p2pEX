/**
 * Market Data WebSocket Service
 *
 * Provides real-time price feeds, order book updates, and trade streams
 * for the cryptocurrency exchange platform.
 *
 * Features:
 * - Live price ticks (simulated random walk for major pairs)
 * - Order book snapshots + diff updates
 * - Recent trades stream
 * - 24h ticker statistics (price change %, volume, high/low)
 * - Kline/candlestick data (1m, 5m, 15m, 1h, 4h, 1d)
 *
 * Port: 3003
 */

import { createServer } from 'http'
import { Server } from 'socket.io'

// ============== TYPES ==============
interface Asset {
  symbol: string
  name: string
  basePrice: number
  volatility: number // 0..1, daily volatility factor
  decimals: number
}

interface Pair {
  symbol: string // e.g. BTCUSDT
  base: string
  quote: string
  baseName: string
  quoteName: string
  price: number
  prevPrice: number
  open24h: number
  high24h: number
  low24h: number
  volume24h: number
  quoteVolume24h: number
  changePercent: number
  history: number[] // recent prices for chart
  klines: Kline[]
  orderBook: { bids: [number, number][]; asks: [number, number][] }
  trades: Trade[]
}

interface Kline {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  closeTime: number
}

interface Trade {
  id: string
  price: number
  qty: number
  time: number
  isBuyerMaker: boolean
}

// ============== ASSET & PAIR DEFINITIONS ==============
const ASSETS: Record<string, Asset> = {
  BTC:  { symbol: 'BTC',  name: 'Bitcoin',   basePrice: 67500,   volatility: 0.025, decimals: 2 },
  ETH:  { symbol: 'ETH',  name: 'Ethereum',  basePrice: 3450,    volatility: 0.03,  decimals: 2 },
  BNB:  { symbol: 'BNB',  name: 'BNB',       basePrice: 585,     volatility: 0.028, decimals: 2 },
  SOL:  { symbol: 'SOL',  name: 'Solana',    basePrice: 165,     volatility: 0.045, decimals: 2 },
  XRP:  { symbol: 'XRP',  name: 'XRP',       basePrice: 0.62,    volatility: 0.04,  decimals: 4 },
  ADA:  { symbol: 'ADA',  name: 'Cardano',   basePrice: 0.45,    volatility: 0.045, decimals: 4 },
  DOGE: { symbol: 'DOGE', name: 'Dogecoin',  basePrice: 0.16,    volatility: 0.06,  decimals: 5 },
  AVAX: { symbol: 'AVAX', name: 'Avalanche', basePrice: 38,      volatility: 0.05,  decimals: 2 },
  LINK: { symbol: 'LINK', name: 'Chainlink', basePrice: 18.5,    volatility: 0.05,  decimals: 3 },
  DOT:  { symbol: 'DOT',  name: 'Polkadot',  basePrice: 7.2,     volatility: 0.05,  decimals: 3 },
  MATIC:{ symbol: 'MATIC',name: 'Polygon',   basePrice: 0.72,    volatility: 0.05,  decimals: 4 },
  LTC:  { symbol: 'LTC',  name: 'Litecoin',  basePrice: 85,      volatility: 0.035, decimals: 2 },
  USDT: { symbol: 'USDT', name: 'Tether',    basePrice: 1.0,     volatility: 0.001, decimals: 4 },
  USDC: { symbol: 'USDC', name: 'USD Coin',  basePrice: 1.0,     volatility: 0.001, decimals: 4 },
}

const PAIR_DEFS: Array<[string, string]> = [
  ['BTC', 'USDT'],
  ['ETH', 'USDT'],
  ['BNB', 'USDT'],
  ['SOL', 'USDT'],
  ['XRP', 'USDT'],
  ['ADA', 'USDT'],
  ['DOGE', 'USDT'],
  ['AVAX', 'USDT'],
  ['LINK', 'USDT'],
  ['DOT', 'USDT'],
  ['MATIC', 'USDT'],
  ['LTC', 'USDT'],
  ['BTC', 'USDC'],
  ['ETH', 'USDC'],
  ['BTC', 'ETH'],
  ['ETH', 'BNB'],
]

// ============== INIT PAIRS ==============
const pairs: Map<string, Pair> = new Map()

function initPairs() {
  for (const [base, quote] of PAIR_DEFS) {
    const baseAsset = ASSETS[base]
    const quoteAsset = ASSETS[quote]
    if (!baseAsset || !quoteAsset) continue
    const symbol = `${base}${quote}`
    // convert price via USD
    const price = baseAsset.basePrice / quoteAsset.basePrice
    const decimals = base === 'USDT' || base === 'USDC' ? 4 : 2

    // Generate initial klines (1m, last 200)
    const now = Date.now()
    const klines: Kline[] = []
    let lastPrice = price
    for (let i = 200; i >= 1; i--) {
      const openTime = now - i * 60_000
      const open = lastPrice
      const volatility = baseAsset.volatility / 24
      const change = (Math.random() - 0.5) * 2 * volatility * open
      const close = Math.max(open + change, open * 0.5)
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.3)
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.3)
      const volume = (Math.random() * 100 + 20) * (baseAsset.basePrice / 100)
      klines.push({
        openTime,
        open,
        high,
        low,
        close,
        volume,
        closeTime: openTime + 60_000,
      })
      lastPrice = close
    }

    // Initial price history for line chart
    const history = klines.map(k => k.close)

    // Build initial order book
    const orderBook = generateOrderBook(price, decimals)

    // Build initial trades
    const trades: Trade[] = []
    for (let i = 0; i < 30; i++) {
      trades.push({
        id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        price: price * (1 + (Math.random() - 0.5) * 0.0008),
        qty: Math.random() * 5 + 0.01,
        time: now - i * 3000,
        isBuyerMaker: Math.random() > 0.5,
      })
    }

    pairs.set(symbol, {
      symbol,
      base,
      quote,
      baseName: baseAsset.name,
      quoteName: quoteAsset.name,
      price: lastPrice,
      prevPrice: lastPrice,
      open24h: lastPrice * (1 + (Math.random() - 0.5) * 0.04),
      high24h: lastPrice * (1 + Math.random() * 0.03),
      low24h: lastPrice * (1 - Math.random() * 0.03),
      volume24h: (Math.random() * 50000 + 5000),
      quoteVolume24h: 0,
      changePercent: 0,
      history,
      klines,
      orderBook,
      trades,
    })
  }
  // Calculate initial change %
  for (const p of pairs.values()) {
    p.changePercent = ((p.price - p.open24h) / p.open24h) * 100
    p.quoteVolume24h = p.volume24h * p.price
  }
}

function generateOrderBook(price: number, decimals: number) {
  const bids: [number, number][] = []
  const asks: [number, number][] = []
  const step = price * 0.0001 // 1bp tick size
  for (let i = 0; i < 30; i++) {
    const bidPrice = price - step * (i + 1) - Math.random() * step * 0.5
    const askPrice = price + step * (i + 1) + Math.random() * step * 0.5
    const bidQty = Math.random() * 10 + 0.1
    const askQty = Math.random() * 10 + 0.1
    bids.push([Number(bidPrice.toFixed(decimals)), Number(bidQty.toFixed(6))])
    asks.push([Number(askPrice.toFixed(decimals)), Number(askQty.toFixed(6))])
  }
  return { bids, asks }
}

function updateOrderBook(pair: Pair) {
  const decimals = pair.base === 'USDT' || pair.base === 'USDC' ? 4 : 2
  // Randomly mutate top-of-book
  const newBook = generateOrderBook(pair.price, decimals)
  pair.orderBook = newBook
}

function tickPrice(pair: Pair) {
  const baseAsset = ASSETS[pair.base]
  // random walk: change per tick is small fraction of volatility
  const tickVol = baseAsset.volatility / 600 // ~ 600 ticks per hour
  const drift = (Math.random() - 0.5) * 2 * tickVol * pair.price
  const newPrice = Math.max(pair.price + drift, pair.price * 0.5)
  pair.prevPrice = pair.price
  pair.price = newPrice

  // Update 24h stats
  if (newPrice > pair.high24h) pair.high24h = newPrice
  if (newPrice < pair.low24h) pair.low24h = newPrice
  pair.changePercent = ((newPrice - pair.open24h) / pair.open24h) * 100

  // Push price history
  pair.history.push(newPrice)
  if (pair.history.length > 200) pair.history.shift()

  // Update kline (1m)
  const lastKline = pair.klines[pair.klines.length - 1]
  const now = Date.now()
  if (now - lastKline.openTime >= 60_000) {
    // close old, open new
    pair.klines.push({
      openTime: now,
      open: newPrice,
      high: newPrice,
      low: newPrice,
      close: newPrice,
      volume: 0,
      closeTime: now + 60_000,
    })
    if (pair.klines.length > 200) pair.klines.shift()
  } else {
    lastKline.close = newPrice
    if (newPrice > lastKline.high) lastKline.high = newPrice
    if (newPrice < lastKline.low) lastKline.low = newPrice
    lastKline.volume += Math.random() * 2
  }

  // Random trades
  if (Math.random() > 0.4) {
    const trade: Trade = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      price: newPrice,
      qty: Math.random() * 5 + 0.001,
      time: now,
      isBuyerMaker: Math.random() > 0.5,
    }
    pair.trades.unshift(trade)
    if (pair.trades.length > 50) pair.trades.pop()
    pair.volume24h += trade.qty
    pair.quoteVolume24h += trade.qty * newPrice
  }
}

// ============== HTTP SERVER (health only - all data via socket.io) ==============
const httpServer = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://localhost`)
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, pairs: pairs.size, ts: Date.now() }))
    return
  }
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

// ============== SOCKET.IO SERVER ==============
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Track subscriptions: socketId -> { pairs: Set<string>, streams: Set<string> }
const subscriptions = new Map<string, { pairs: Set<string>; streams: Set<string> }>()

io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`)
  subscriptions.set(socket.id, { pairs: new Set(), streams: new Set() })

  // ============ Snapshot requests (request-response) ============
  socket.on('getTickers', (_data, ack) => {
    const tickers = Array.from(pairs.values()).map(p => ({
      symbol: p.symbol,
      base: p.base,
      quote: p.quote,
      baseName: p.baseName,
      quoteName: p.quoteName,
      lastPrice: p.price,
      changePercent: p.changePercent,
      high24h: p.high24h,
      low24h: p.low24h,
      volume24h: p.volume24h,
      quoteVolume24h: p.quoteVolume24h,
    }))
    if (ack) ack(tickers)
    else socket.emit('allTickers', tickers)
  })

  socket.on('getKlines', (data: { symbol: string; interval?: string }, ack) => {
    const p = pairs.get((data?.symbol || 'BTCUSDT').toUpperCase())
    if (!p) {
      if (ack) ack([])
      return
    }
    if (ack) ack(p.klines)
  })

  socket.on('getDepth', (data: { symbol: string }, ack) => {
    const p = pairs.get((data?.symbol || 'BTCUSDT').toUpperCase())
    if (!p) {
      if (ack) ack(null)
      return
    }
    if (ack) ack({ symbol: p.symbol, bids: p.orderBook.bids, asks: p.orderBook.asks })
  })

  socket.on('getTrades', (data: { symbol: string; limit?: number }, ack) => {
    const p = pairs.get((data?.symbol || 'BTCUSDT').toUpperCase())
    if (!p) {
      if (ack) ack([])
      return
    }
    const limit = data?.limit || 30
    if (ack) ack(p.trades.slice(0, limit))
  })

  socket.on('getTicker', (data: { symbol: string }, ack) => {
    const p = pairs.get((data?.symbol || 'BTCUSDT').toUpperCase())
    if (!p) {
      if (ack) ack(null)
      return
    }
    if (ack) ack({
      symbol: p.symbol,
      base: p.base,
      quote: p.quote,
      baseName: p.baseName,
      quoteName: p.quoteName,
      lastPrice: p.price,
      changePercent: p.changePercent,
      high24h: p.high24h,
      low24h: p.low24h,
      volume24h: p.volume24h,
      quoteVolume24h: p.quoteVolume24h,
    })
  })

  // ============ Stream subscriptions ============
  // streams: ticker, kline_1m, depth, trade, allTickers
  socket.on('subscribe', (data: { symbol?: string; streams: string[] }) => {
    const sub = subscriptions.get(socket.id)
    if (!sub) return
    if (data.symbol) sub.pairs.add(data.symbol.toUpperCase())
    for (const s of data.streams) sub.streams.add(s)
    console.log(`[socket] ${socket.id} subscribed to`, data.symbol, data.streams)

    // Send immediate snapshot
    if (data.symbol) {
      const p = pairs.get(data.symbol.toUpperCase())
      if (!p) return
      if (data.streams.includes('depth')) {
        socket.emit('depth', { symbol: p.symbol, bids: p.orderBook.bids, asks: p.orderBook.asks })
      }
      if (data.streams.includes('trade')) {
        socket.emit('trades', { symbol: p.symbol, trades: p.trades.slice(0, 30) })
      }
      if (data.streams.includes('kline_1m')) {
        socket.emit('kline', { symbol: p.symbol, interval: '1m', klines: p.klines })
      }
      if (data.streams.includes('ticker')) {
        socket.emit('ticker', {
          symbol: p.symbol,
          lastPrice: p.price,
          changePercent: p.changePercent,
          high24h: p.high24h,
          low24h: p.low24h,
          volume24h: p.volume24h,
          quoteVolume24h: p.quoteVolume24h,
        })
      }
    }
    if (data.streams.includes('allTickers')) {
      const tickers = Array.from(pairs.values()).map(p => ({
        symbol: p.symbol,
        base: p.base,
        quote: p.quote,
        lastPrice: p.price,
        changePercent: p.changePercent,
        high24h: p.high24h,
        low24h: p.low24h,
        volume24h: p.volume24h,
        quoteVolume24h: p.quoteVolume24h,
      }))
      socket.emit('allTickers', tickers)
    }
  })

  socket.on('unsubscribe', (data: { symbol?: string; streams: string[] }) => {
    const sub = subscriptions.get(socket.id)
    if (!sub) return
    if (data.symbol) sub.pairs.delete(data.symbol.toUpperCase())
    for (const s of data.streams) sub.streams.delete(s)
  })

  socket.on('disconnect', () => {
    subscriptions.delete(socket.id)
    console.log(`[socket] disconnected: ${socket.id}`)
  })
})

// ============== BROADCAST LOOP ==============
setInterval(() => {
  try {
    // 1. Tick prices
    for (const p of pairs.values()) {
      try {
        tickPrice(p)
        // 2. Update order book (less frequently)
        if (Math.random() > 0.7) {
          updateOrderBook(p)
        }
      } catch (e) {
        console.error('[market-service] tickPrice error for', p.symbol, e)
      }
    }

    // 3. Broadcast to subscribers
    for (const [socketId, sub] of subscriptions) {
      try {
        const socket = io.sockets.sockets.get(socketId)
        if (!socket) continue

        // allTickers stream
        if (sub.streams.has('allTickers')) {
          const tickers = Array.from(pairs.values()).map(p => ({
            symbol: p.symbol,
            base: p.base,
            quote: p.quote,
            lastPrice: p.price,
            changePercent: p.changePercent,
            high24h: p.high24h,
            low24h: p.low24h,
            volume24h: p.volume24h,
            quoteVolume24h: p.quoteVolume24h,
          }))
          socket.emit('allTickers', tickers)
        }

        // Per-pair streams
        for (const symbol of sub.pairs) {
          try {
            const p = pairs.get(symbol)
            if (!p) continue
            if (sub.streams.has('ticker')) {
              socket.emit('ticker', {
                symbol: p.symbol,
                lastPrice: p.price,
                prevPrice: p.prevPrice,
                changePercent: p.changePercent,
                high24h: p.high24h,
                low24h: p.low24h,
                volume24h: p.volume24h,
                quoteVolume24h: p.quoteVolume24h,
              })
            }
            if (sub.streams.has('depth')) {
              socket.emit('depth', { symbol: p.symbol, bids: p.orderBook.bids.slice(0, 20), asks: p.orderBook.asks.slice(0, 20) })
            }
            if (sub.streams.has('trade') && p.trades.length > 0) {
              socket.emit('trade', { symbol: p.symbol, trade: p.trades[0] })
            }
            if (sub.streams.has('kline_1m')) {
              const k = p.klines[p.klines.length - 1]
              socket.emit('kline_update', { symbol: p.symbol, interval: '1m', kline: k })
            }
          } catch (e) {
            console.error('[market-service] per-pair broadcast error', symbol, e)
          }
        }
      } catch (e) {
        console.error('[market-service] subscriber broadcast error', socketId, e)
      }
    }
  } catch (e) {
    console.error('[market-service] broadcast loop error', e)
  }
}, 1500) // tick every 1.5 seconds

// Global error handlers to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('[market-service] UNCAUGHT EXCEPTION:', err)
})
process.on('unhandledRejection', (err) => {
  console.error('[market-service] UNHANDLED REJECTION:', err)
})

// ============== START ==============
initPairs()
console.log(`[market-service] initialized ${pairs.size} pairs`)

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[market-service] HTTP+WS listening on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('[market-service] SIGTERM, shutting down...')
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  console.log('[market-service] SIGINT, shutting down...')
  httpServer.close(() => process.exit(0))
})
