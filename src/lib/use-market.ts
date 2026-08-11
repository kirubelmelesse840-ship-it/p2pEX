/**
 * useMarketSocket - React hook for connecting to the market-service WebSocket.
 *
 * Provides:
 * - tickers: all-pairs snapshot (with periodic updates)
 * - ticker: single-pair live ticker
 * - orderBook: live depth (bids/asks)
 * - trades: recent trades stream
 * - klines: 1m candlestick history + live updates
 *
 * Usage:
 *   const { tickers, ticker, orderBook, trades, klines } = useMarketSocket(symbol)
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export interface Ticker {
  symbol: string
  base: string
  quote: string
  baseName: string
  quoteName: string
  lastPrice: number
  prevPrice?: number
  changePercent: number
  high24h: number
  low24h: number
  volume24h: number
  quoteVolume24h: number
}

export interface OrderBook {
  bids: [number, number][]
  asks: [number, number][]
}

export interface MarketTrade {
  id: string
  price: number
  qty: number
  time: number
  isBuyerMaker: boolean
}

export interface Kline {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  closeTime: number
}

let _socket: Socket | null = null
function getSocket(): Socket {
  if (_socket && _socket.connected) return _socket
  _socket = io('/?XTransformPort=3003', {
    transports: ['websocket', 'polling'],
    forceNew: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 10000,
  })
  return _socket
}

export function useMarketSocket(symbol: string) {
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [ticker, setTicker] = useState<Ticker | null>(null)
  const [orderBook, setOrderBook] = useState<OrderBook>({ bids: [], asks: [] })
  const [trades, setTrades] = useState<MarketTrade[]>([])
  const [klines, setKlines] = useState<Kline[]>([])
  const [connected, setConnected] = useState(false)
  const symbolRef = useRef(symbol)
  useEffect(() => {
    symbolRef.current = symbol
  }, [symbol])

  useEffect(() => {
    const socket = getSocket()

    const onConnect = () => {
      setConnected(true)
      // Initial snapshot requests
      socket.emit('getTickers', null, (data: Ticker[]) => {
        if (data) setTickers(data)
      })
      // Subscribe to allTickers for periodic updates
      socket.emit('subscribe', { streams: ['allTickers'] })

      // Subscribe to current symbol's streams
      const sym = symbolRef.current.toUpperCase()
      socket.emit('subscribe', {
        symbol: sym,
        streams: ['ticker', 'depth', 'trade', 'kline_1m'],
      })
      // Snapshot fetches for the symbol
      socket.emit('getTicker', { symbol: sym }, (data: Ticker) => {
        if (data) setTicker(data)
      })
      socket.emit('getDepth', { symbol: sym }, (data: OrderBook) => {
        if (data) setOrderBook(data)
      })
      socket.emit('getTrades', { symbol: sym, limit: 50 }, (data: MarketTrade[]) => {
        if (data) setTrades(data)
      })
      socket.emit('getKlines', { symbol: sym, interval: '1m' }, (data: Kline[]) => {
        if (data) setKlines(data)
      })
    }
    const onDisconnect = () => setConnected(false)

    const onAllTickers = (data: Ticker[]) => setTickers(data)
    const onTicker = (data: Ticker) => {
      if (data.symbol === symbolRef.current.toUpperCase()) setTicker(data)
    }
    const onDepth = (data: OrderBook & { symbol: string }) => {
      if (data.symbol === symbolRef.current.toUpperCase()) {
        setOrderBook({ bids: data.bids, asks: data.asks })
      }
    }
    const onTrade = (data: { symbol: string; trade: MarketTrade }) => {
      if (data.symbol === symbolRef.current.toUpperCase()) {
        setTrades(prev => [data.trade, ...prev].slice(0, 50))
      }
    }
    const onTrades = (data: { symbol: string; trades: MarketTrade[] }) => {
      if (data.symbol === symbolRef.current.toUpperCase()) {
        setTrades(data.trades)
      }
    }
    const onKlineUpdate = (data: { symbol: string; kline: Kline }) => {
      if (data.symbol !== symbolRef.current.toUpperCase()) return
      setKlines(prev => {
        if (prev.length === 0) return [data.kline]
        const last = prev[prev.length - 1]
        if (last.openTime === data.kline.openTime) {
          return [...prev.slice(0, -1), data.kline]
        }
        return [...prev, data.kline].slice(-200)
      })
    }

    if (socket.connected) {
      onConnect()
    } else {
      socket.on('connect', onConnect)
    }
    socket.on('disconnect', onDisconnect)
    socket.on('allTickers', onAllTickers)
    socket.on('ticker', onTicker)
    socket.on('depth', onDepth)
    socket.on('trade', onTrade)
    socket.on('trades', onTrades)
    socket.on('kline_update', onKlineUpdate)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('allTickers', onAllTickers)
      socket.off('ticker', onTicker)
      socket.off('depth', onDepth)
      socket.off('trade', onTrade)
      socket.off('trades', onTrades)
      socket.off('kline_update', onKlineUpdate)
    }
  }, [symbol])

  // Re-subscribe when symbol changes
  useEffect(() => {
    const socket = getSocket()
    if (!socket.connected) return
    const sym = symbol.toUpperCase()
    socket.emit('subscribe', {
      symbol: sym,
      streams: ['ticker', 'depth', 'trade', 'kline_1m'],
    })
    socket.emit('getTicker', { symbol: sym }, (data: Ticker) => data && setTicker(data))
    socket.emit('getDepth', { symbol: sym }, (data: OrderBook) => data && setOrderBook(data))
    socket.emit('getTrades', { symbol: sym, limit: 50 }, (data: MarketTrade[]) => data && setTrades(data))
    socket.emit('getKlines', { symbol: sym, interval: '1m' }, (data: Kline[]) => data && setKlines(data))
  }, [symbol])

  return { tickers, ticker, orderBook, trades, klines, connected }
}

/**
 * useTickers - hook for fetching all tickers (without subscribing to a specific pair)
 */
export function useTickers() {
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const socket = getSocket()

    const onConnect = () => {
      setConnected(true)
      socket.emit('getTickers', null, (data: Ticker[]) => data && setTickers(data))
      socket.emit('subscribe', { streams: ['allTickers'] })
    }
    const onDisconnect = () => setConnected(false)
    const onAllTickers = (data: Ticker[]) => setTickers(data)

    if (socket.connected) onConnect()
    else socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('allTickers', onAllTickers)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('allTickers', onAllTickers)
    }
  }, [])

  return { tickers, connected }
}
