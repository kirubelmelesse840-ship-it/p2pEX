'use client'
import { Ticker, OrderBook, MarketTrade, Kline } from './use-market'
const BASE_PRICES: Record<string, number> = { BTC: 67500, ETH: 3450, BNB: 585, SOL: 165, XRP: 0.62, ADA: 0.45, DOGE: 0.16, AVAX: 38, LINK: 18.5, DOT: 7.2, MATIC: 0.72, LTC: 85, USDT: 1, USDC: 1 }
const ASSET_NAMES: Record<string, string> = { BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'BNB', SOL: 'Solana', XRP: 'XRP', ADA: 'Cardano', DOGE: 'Dogecoin', AVAX: 'Avalanche', LINK: 'Chainlink', DOT: 'Polkadot', MATIC: 'Polygon', LTC: 'Litecoin', USDT: 'Tether', USDC: 'USD Coin' }
const PAIRS: Array<[string, string]> = [['BTC','USDT'],['ETH','USDT'],['BNB','USDT'],['SOL','USDT'],['XRP','USDT'],['ADA','USDT'],['DOGE','USDT'],['AVAX','USDT'],['LINK','USDT'],['DOT','USDT'],['MATIC','USDT'],['LTC','USDT'],['BTC','USDC'],['ETH','USDC']]
const tickerMap: Record<string, Ticker> = {}
const orderBookMap: Record<string, OrderBook> = {}
const tradesMap: Record<string, MarketTrade[]> = {}
const klinesMap: Record<string, Kline[]> = {}
let initialized = false
let intervalId: ReturnType<typeof setInterval> | null = null
const subscribers: Array<() => void> = []
function getBasePrice(base: string, quote: string): number { return (BASE_PRICES[base] || 1) / (BASE_PRICES[quote] || 1) }
function initTickers() {
  if (initialized) return; initialized = true
  for (const [base, quote] of PAIRS) {
    const symbol = `${base}${quote}`; const price = getBasePrice(base, quote); const changePercent = (Math.random() - 0.5) * 8
    tickerMap[symbol] = { symbol, base, quote, baseName: ASSET_NAMES[base] || base, quoteName: ASSET_NAMES[quote] || quote, lastPrice: price, prevPrice: price / (1 + changePercent / 100), changePercent, high24h: price * 1.02, low24h: price * 0.98, volume24h: Math.random() * 50000 + 5000, quoteVolume24h: 0 }
    orderBookMap[symbol] = generateOrderBook(price)
    klinesMap[symbol] = generateKlines(price, 60)
    tradesMap[symbol] = generateTrades(price, 30)
  }
  intervalId = setInterval(updateAll, 2000)
}
function generateOrderBook(price: number): OrderBook { const bids: [number, number][] = []; const asks: [number, number][] = []; for (let i = 0; i < 15; i++) { bids.push([parseFloat((price * (1 - (i + 1) * 0.0003)).toFixed(6)), parseFloat((Math.random() * 5 + 0.1).toFixed(4))]); asks.push([parseFloat((price * (1 + (i + 1) * 0.0003)).toFixed(6)), parseFloat((Math.random() * 5 + 0.1).toFixed(4))]) } return { bids, asks } }
function generateKlines(currentPrice: number, count: number): Kline[] { const klines: Kline[] = []; const now = Date.now(); let price = currentPrice * 0.98; for (let i = count; i > 0; i--) { const openTime = now - i * 60000; const open = price; const vol = currentPrice * 0.003; const close = price + (Math.random() - 0.5) * vol; klines.push({ openTime, open: parseFloat(open.toFixed(6)), high: parseFloat(Math.max(open, close).toFixed(6)), low: parseFloat(Math.min(open, close).toFixed(6)), close: parseFloat(close.toFixed(6)), volume: parseFloat((Math.random() * 100 + 10).toFixed(4)), closeTime: openTime + 59999 }); price = close } return klines }
function generateTrades(price: number, count: number): MarketTrade[] { const trades: MarketTrade[] = []; const now = Date.now(); for (let i = 0; i < count; i++) { trades.push({ id: `sim-${now}-${i}`, price: parseFloat((price * (1 + (Math.random() - 0.5) * 0.001)).toFixed(6)), qty: parseFloat((Math.random() * 2 + 0.01).toFixed(4)), time: now - i * 5000, isBuyerMaker: Math.random() > 0.5 }) } return trades }
function updateAll() { for (const [base, quote] of PAIRS) { const symbol = `${base}${quote}`; const t = tickerMap[symbol]; if (!t) continue; const delta = (Math.random() - 0.5) * t.lastPrice * 0.003; const newPrice = Math.max(t.lastPrice + delta, t.lastPrice * 0.5); t.prevPrice = t.lastPrice; t.lastPrice = parseFloat(newPrice.toFixed(6)); t.changePercent = ((newPrice - (t.prevPrice || newPrice)) / (t.prevPrice || newPrice)) * 100 + t.changePercent * 0.99; t.high24h = Math.max(t.high24h, newPrice); t.low24h = Math.min(t.low24h, newPrice); if (Math.random() > 0.5) orderBookMap[symbol] = generateOrderBook(newPrice); tradesMap[symbol] = [{ id: `sim-${Date.now()}`, price: parseFloat(newPrice.toFixed(6)), qty: parseFloat((Math.random() * 2 + 0.01).toFixed(4)), time: Date.now(), isBuyerMaker: Math.random() > 0.5 }, ...(tradesMap[symbol] || [])].slice(0, 50); const klines = klinesMap[symbol] || []; if (klines.length > 0) { const last = klines[klines.length - 1]; const minute = Math.floor(Date.now() / 60000); if (minute > Math.floor(last.openTime / 60000)) { klines.push({ openTime: minute * 60000, open: last.close, high: Math.max(last.close, newPrice), low: Math.min(last.close, newPrice), close: parseFloat(newPrice.toFixed(6)), volume: Math.random() * 100, closeTime: minute * 60000 + 59999 }); if (klines.length > 200) klines.shift() } else { last.close = parseFloat(newPrice.toFixed(6)); last.high = Math.max(last.high, newPrice); last.low = Math.min(last.low, newPrice) } } } for (const cb of subscribers) cb() }
export function subscribe(cb: () => void): () => void { subscribers.push(cb); return () => { const i = subscribers.indexOf(cb); if (i >= 0) subscribers.splice(i, 1) } }
export function getAllTickers(): Ticker[] { return Object.values(tickerMap) }
export function getTicker(symbol: string): Ticker | null { return tickerMap[symbol.toUpperCase()] || null }
export function getOrderBook(symbol: string): OrderBook { return orderBookMap[symbol.toUpperCase()] || { bids: [], asks: [] } }
export function getTrades(symbol: string): MarketTrade[] { return tradesMap[symbol.toUpperCase()] || [] }
export function getKlines(symbol: string): Kline[] { return klinesMap[symbol.toUpperCase()] || [] }
export { initTickers }
