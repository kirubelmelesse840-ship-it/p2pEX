/**
 * useMarketSocket - React hook for market data.
 *
 * Uses WebSocket when available (local dev), falls back to client-side
 * simulation when WebSocket is not available (Vercel production).
 *
 * Provides:
 * - tickers: all-pairs snapshot (with periodic updates)
 * - ticker: single-pair live ticker
 * - orderBook: live depth (bids/asks)
 * - trades: recent trades stream
 * - klines: 1m candlestick history + live updates
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { initTickers, subscribe, getAllTickers, getTicker, getOrderBook, getTrades, getKlines } from './market-simulation'

export interface Ticker {
  symbol: string
  base: string
  quote: string
  baseName: string
  quoteName: string
  lastPrice: number
  prevPrice: number
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

// Check if we're in the browser
const isBrowser = typeof window !== 'undefined'

// Check if WebSocket is likely available (local dev with market-service running)
// On Vercel, the WebSocket server doesn't exist, so we use simulation
let _socket: Socket | null = null
let _useSimulation = true // Default to simulation (works everywhere)

function getSocket(): Socket | null {
  if (!isBrowser) return null
  if (_socket && _socket.connected) return _socket
  try {
    _socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 3, // Only try 3 times, then fall back to simulation
      reconnectionDelay: 1000,
      timeout: 5000,
    })
    // If connection fails, use simulation
    _socket.on('connect_error', () => {
      _useSimulation = true
    })
    _socket.on('connect', () => {
      _useSimulation = false
    })
    return _socket
  } catch {
    return null
  }
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
    // Always initialize the simulation as a fallback
    initTickers()

    // Try to connect via WebSocket
    const socket = getSocket()

    const updateFromSimulation = () => {
      setTickers(getAllTickers())
      const sym = symbolRef.current.toUpperCase()
      const t = getTicker(sym)
      if (t) setTicker(t)
      setOrderBook(getOrderBook(sym))
      setTrades(getTrades(sym))
      setKlines(getKlines(sym))
    }

    // If WebSocket connects, use it
    const onConnect = () => {
      setConnected(true)
      _useSimulation = false
      socket?.emit('getTickers', null, (data: Ticker[]) => {
        if (data && data.length > 0) setTickers(data)
      })
      socket?.emit('subscribe', { streams: ['allTickers'] })

      const sym = symbolRef.current.toUpperCase()
      socket?.emit('subscribe', {
        symbol: sym,
        streams: ['ticker', 'depth', 'trade', 'kline_1m'],
      })
      socket?.emit('getTicker', { symbol: sym }, (data: Ticker) => {
        if (data) setTicker(data)
      })
      socket?.emit('getDepth', { symbol: sym }, (data: OrderBook) => {
        if (data) setOrderBook(data)
      })
      socket?.emit('getTrades', { symbol: sym, limit: 50 }, (data: MarketTrade[]) => {
        if (data && data.length > 0) setTrades(data)
      })
      socket?.emit('getKlines', { symbol: sym, interval: '1m', limit: 60 }, (data: Kline[]) => {
        if (data && data.length > 0) setKlines(data)
      })
    }

    const onDisconnect = () => {
      setConnected(false)
      _useSimulation = true
    }

    const onAllTickers = (data: Ticker[]) => { if (data && data.length > 0) setTickers(data) }
    const onTicker = (data: Ticker) => {
      if (data && data.symbol === symbolRef.current.toUpperCase()) setTicker(data)
    }
    const onDepth = (data: OrderBook & { symbol: string }) => {
      if (data.symbol === symbolRef.current.toUpperCase()) {
        const { symbol: _, ...rest } = data
        setOrderBook(rest)
      }
    }
    const onTrade = (data: MarketTrade & { symbol: string }) => {
      if (data.symbol === symbolRef.current.toUpperCase()) {
        const { symbol: _, ...rest } = data
        setTrades(prev => [rest, ...prev].slice(0, 50))
      }
    }
    const onKline = (data: Kline & { symbol: string }) => {
      if (data.symbol === symbolRef.current.toUpperCase()) {
        const { symbol: _, ...rest } = data
        setKlines(prev => {
          const last = prev[prev.length - 1]
          if (last && Math.floor(last.openTime / 60000) === Math.floor(rest.openTime / 60000)) {
            return [...prev.slice(0, -1), rest]
          }
          return [...prev, rest].slice(-200)
        })
      }
    }

    // Subscribe to simulation updates (always active as fallback)
    const unsub = subscribe(() => {
      if (_useSimulation) {
        updateFromSimulation()
        setConnected(true) // Show as "connected" when using simulation
      }
    })

    // Initial load from simulation
    updateFromSimulation()
    setConnected(true) // Show as connected (using simulation)

    if (socket) {
      if (socket.connected) onConnect()
      else socket.on('connect', onConnect)
      socket.on('disconnect', onDisconnect)
      socket.on('allTickers', onAllTickers)
      socket.on('ticker', onTicker)
      socket.on('depth', onDepth)
      socket.on('trade', onTrade)
      socket.on('kline', onKline)
    }

    return () => {
      unsub()
      if (socket) {
        socket.off('connect', onConnect)
        socket.off('disconnect', onDisconnect)
        socket.off('allTickers', onAllTickers)
        socket.off('ticker', onTicker)
        socket.off('depth', onDepth)
        socket.off('trade', onTrade)
        socket.off('kline', onKline)
      }
    }
  }, [symbol])

  return { tickers, ticker, orderBook, trades, klines, connected }
}

/**
 * useTickers - hook for fetching all tickers
 * Uses simulation as fallback when WebSocket is not available
 */
export function useTickers() {
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Always initialize simulation
    initTickers()

    // Try WebSocket
    const socket = getSocket()

    const onConnect = () => {
      setConnected(true)
      _useSimulation = false
      socket?.emit('getTickers', null, (data: Ticker[]) => data && data.length > 0 && setTickers(data))
      socket?.emit('subscribe', { streams: ['allTickers'] })
    }
    const onDisconnect = () => {
      setConnected(false)
      _useSimulation = true
    }
    const onAllTickers = (data: Ticker[]) => { if (data && data.length > 0) setTickers(data) }

    // Subscribe to simulation updates (fallback)
    const unsub = subscribe(() => {
      if (_useSimulation) {
        setTickers(getAllTickers())
        setConnected(true)
      }
    })

    // Initial load from simulation
    setTickers(getAllTickers())
    setConnected(true) // Show as connected

    if (socket) {
      if (socket.connected) onConnect()
      else socket.on('connect', onConnect)
      socket.on('disconnect', onDisconnect)
      socket.on('allTickers', onAllTickers)
    }

    return () => {
      unsub()
      if (socket) {
        socket.off('connect', onConnect)
        socket.off('disconnect', onDisconnect)
        socket.off('allTickers', onAllTickers)
      }
    }
  }, [])

  return { tickers, connected }
}
