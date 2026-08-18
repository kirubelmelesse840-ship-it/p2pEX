'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Copy, Send, Download, ArrowDownToLine, ArrowUpFromLine, QrCode, Wallet as WalletIcon,
  CheckCircle2, Clock, XCircle, ExternalLink, ArrowLeftRight, Users, Zap, RefreshCw,
} from 'lucide-react'
import { formatPrice, formatQty, formatUsd, formatDateTime, shortAddr, copyToClipboard } from '@/lib/utils'
import { BackButton } from '@/components/back-button'

const DEPOSIT_NETWORKS = [
  { network: 'TRC20', address: 'TCKoT3qjmFBA7MxtXdNoVxixUhjVAPo48E', fee: 0.01, confirmations: 1, description: 'Tron Network — Fast & cheap (recommended)' },
  { network: 'BEP20', address: '0x1c4f79b327a1e98003b2333dcd1ba482be5c300a', fee: 0.01, confirmations: 12, description: 'Binance Smart Chain — Low fees' },
  { network: 'ERC20', address: '0x1c4f79b327a1e98003b2333dcd1ba482be5c300a', fee: 0.01, confirmations: 12, description: 'Ethereum Network — Higher fees, wide support' },
]

const WITHDRAW_NETWORKS = [
  { network: 'TRC20', fee: 0.01, description: 'Tron Network — Fast & cheap (recommended)' },
  { network: 'BEP20', fee: 0.01, description: 'Binance Smart Chain — Low fees' },
  { network: 'ERC20', fee: 0.01, description: 'Ethereum Network — Higher fees, wide support' },
]

interface WalletData {
  asset: string
  assetName: string
  balance: number
  available: number
  locked: number
  depositAddress: string
  usdPrice: number
  usdValue: number
}

interface Transaction {
  id: string
  asset: string
  type: string
  amount: number
  fee: number
  network: string
  fromAddress?: string | null
  toAddress?: string | null
  fromName?: string | null
  toName?: string | null
  txHash?: string | null
  status: string
  confirmations: number
  requiredConfirmations: number
  note?: string | null
  createdAt: string
}

export function WalletView() {
  const { user, setView } = useAppStore()
  const { toast } = useToast()
  const [wallets, setWallets] = useState<WalletData[]>([])
  const [totalUsd, setTotalUsd] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [sendDialog, setSendDialog] = useState<WalletData | null>(null)
  const [depositDialog, setDepositDialog] = useState<WalletData | null>(null)
  const [transferDialog, setTransferDialog] = useState<WalletData | null>(null)
  const [txDetail, setTxDetail] = useState<Transaction | null>(null)

  const load = useCallback(async () => {
    if (!user) { setWallets([]); setTransactions([]); setLoading(false); return }
    try {
      // Show cached wallet data immediately (instant load)
      const cacheKey = `wallet-${user.id}`
      const cached = sessionStorage.getItem(cacheKey)
      if (cached && wallets.length === 0) {
        try {
          const cachedData = JSON.parse(cached)
          setWallets(cachedData.wallets || [])
          setTotalUsd(cachedData.totalUsd || 0)
          setTransactions(cachedData.transactions || [])
          setLoading(false)
        } catch {}
      }

      const [walletRes, txRes] = await Promise.all([
        fetch('/api/wallet'),
        fetch('/api/wallet/transactions?limit=50'),
      ])
      const walletData = await walletRes.json()
      const txData = await txRes.json()
      setWallets(walletData.wallets || [])
      setTotalUsd(walletData.totalUsd || 0)
      setTransactions(txData.transactions || [])
      // Cache for instant load next time
      sessionStorage.setItem(cacheKey, JSON.stringify({
        wallets: walletData.wallets || [],
        totalUsd: walletData.totalUsd || 0,
        transactions: txData.transactions || [],
      }))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!user) return
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [user, load])

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <WalletIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Connect to view your wallet</h2>
        <p className="text-sm text-muted-foreground mb-6">Log in or sign up to access your multi-asset wallet.</p>
        <Button onClick={() => setView('home')}>Back to Home</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 max-w-6xl w-full">
      <div className="flex items-center justify-between">
        <BackButton to="home" />
        <Button variant="outline" size="sm" onClick={() => { load() }} className="gap-1.5 cursor-pointer hover:bg-primary/10">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Total balance card */}
      <div className="bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 border border-border rounded-xl p-5 mb-4 mt-1">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Estimated Value</p>
            <p className="text-3xl sm:text-4xl font-bold tabular-nums">{formatUsd(totalUsd)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              ≈ {formatQty(totalUsd)} USD across {wallets.filter(w => w.balance > 0).length} assets
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" onClick={() => {
              const usdt = wallets.find(w => w.asset === 'USDT') || wallets[0]
              if (usdt) setDepositDialog(usdt)
            }}>
              <ArrowDownToLine className="h-4 w-4 mr-1.5" /> Deposit
            </Button>
            <Button variant="outline" onClick={() => {
              const usdt = wallets.find(w => w.asset === 'USDT') || wallets[0]
              if (usdt) setSendDialog(usdt)
            }}>
              <ArrowUpFromLine className="h-4 w-4 mr-1.5" /> Withdraw
            </Button>
            <Button
              variant="secondary"
              onClick={() => wallets[0] && setTransferDialog(wallets[0])}
              className="bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25"
            >
              <ArrowLeftRight className="h-4 w-4 mr-1.5" /> Transfer
            </Button>
          </div>
        </div>
      </div>

      {/* Wallets table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold">Assets</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Asset</th>
                <th className="px-4 py-2 text-right font-medium">Total Balance</th>
                <th className="px-4 py-2 text-right font-medium hidden sm:table-cell">Available</th>
                <th className="px-4 py-2 text-right font-medium hidden md:table-cell">Locked</th>
                <th className="px-4 py-2 text-right font-medium hidden md:table-cell">USD Value</th>
                <th className="px-4 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && wallets.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8">
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="h-8 w-8 rounded-full bg-muted" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-16 bg-muted rounded" />
                          <div className="h-2 w-24 bg-muted rounded" />
                        </div>
                        <div className="h-3 w-20 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                </td></tr>
              ) : loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading wallets...</td></tr>
              ) : wallets.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No wallets</td></tr>
              ) : (
                wallets.filter(w => w.balance > 0 || ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL'].includes(w.asset))
                  .map(w => (
                  <tr key={w.asset} className="border-t border-border/40 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AssetIcon asset={w.asset} />
                        <div>
                          <div className="font-medium">{w.asset}</div>
                          <div className="text-xs text-muted-foreground">{w.assetName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <div>{formatQty(w.balance)}</div>
                      <div className="text-xs text-muted-foreground">{w.asset}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                      {formatQty(w.available)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell">
                      {w.locked > 0 ? <span className="text-yellow-500">{formatQty(w.locked)}</span> : '0'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell">
                      {formatUsd(w.usdValue)}
                      <div className="text-xs text-muted-foreground">${formatPrice(w.usdPrice)}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDepositDialog(w)}>
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSendDialog(w)}>
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions - distinguish internal vs external */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Recent Transactions</h2>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Internal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Deposit
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Withdraw
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-left font-medium">Asset</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
                <th className="px-4 py-2 text-left font-medium hidden sm:table-cell">Network</th>
                <th className="px-4 py-2 text-left font-medium hidden md:table-cell">Counterparty</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium hidden sm:table-cell">Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No transactions yet</td></tr>
              ) : (
                transactions.map(t => {
                  const isInternal = t.type === 'INTERNAL_TRANSFER'
                  const isIncoming = isInternal
                    ? !!t.fromAddress  // if fromAddress exists, we received it
                    : t.type === 'DEPOSIT'
                  return (
                    <tr key={t.id} className={`border-t border-border/40 hover:bg-muted/30 cursor-pointer ${isInternal ? 'bg-blue-500/5' : ''}`} onClick={() => setTxDetail(t)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isInternal ? (
                            <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                          ) : t.type === 'DEPOSIT' ? (
                            <ArrowDownToLine className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowUpFromLine className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <span className="font-medium">
                              {isInternal ? 'Internal Transfer' : t.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}
                            </span>
                            {isInternal && (
                              <span className={`ml-1.5 text-[10px] px-1 py-0.5 rounded ${
                                isIncoming ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'
                              }`}>
                                {isIncoming ? 'Received' : 'Sent'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{t.asset}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={isIncoming ? 'text-green-500' : 'text-red-500'}>
                          {isIncoming ? '+' : '-'}{formatQty(t.amount)}
                        </span>
                        {t.fee > 0 && (
                          <div className="text-xs text-muted-foreground">Fee: {formatQty(t.fee)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs hidden sm:table-cell">
                        {isInternal ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <Zap className="h-3 w-3" /> P2PEX
                          </span>
                        ) : (
                          <span>{t.network}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell font-mono">
                        {isInternal ? (
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {isIncoming ? shortAddr(t.fromAddress || '') : shortAddr(t.toAddress || '')}
                          </span>
                        ) : (
                          <span>
                            {t.type === 'DEPOSIT' ? shortAddr(t.fromAddress || '') : shortAddr(t.toAddress || '')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground hidden sm:table-cell">
                        {formatDateTime(t.createdAt)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send dialog */}
      {sendDialog && (
        <SendDialog
          wallet={sendDialog}
          wallets={wallets}
          onClose={() => setSendDialog(null)}
          onSuccess={load}
        />
      )}

      {/* Deposit dialog */}
      {depositDialog && (
        <DepositDialog
          wallet={depositDialog}
          onClose={() => setDepositDialog(null)}
          onSuccess={load}
        />
      )}

      {/* Internal transfer dialog */}
      {transferDialog && (
        <TransferDialog
          wallet={transferDialog}
          wallets={wallets}
          onClose={() => setTransferDialog(null)}
          onSuccess={load}
        />
      )}

      {/* Transaction detail dialog */}
      {txDetail && (() => {
        const isInternal = txDetail.type === 'INTERNAL_TRANSFER'
        const isIncoming = isInternal ? !!txDetail.fromAddress : txDetail.type === 'DEPOSIT'
        const isP2P = txDetail.network === 'P2P'
        const noteText = txDetail.note || ''
        // Parse P2P note: "P2P trade #xxx - bought 10 USDT for 1863.00 ETB via Telebirr"
        // or "P2P trade #xxx - sold 10 USDT for 1863.00 ETB via Telebirr"
        const p2pAction = noteText.includes('bought') ? 'bought' : noteText.includes('sold') ? 'sold' : ''
        const p2pAmount = noteText.match(/(\d+\.?\d*)\s*(USDT|BTC|ETH|BNB|SOL)/i)
        const p2pFiat = noteText.match(/for\s+(\d+\.?\d*)\s*(ETB|USD|EUR)/i)
        const p2pMethod = noteText.match(/via\s+(\w+)/)
        return (
        <Dialog open onOpenChange={() => setTxDetail(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {isP2P ? (
                  isIncoming ? <ArrowDownToLine className="h-5 w-5 text-green-500" /> : <ArrowUpFromLine className="h-5 w-5 text-red-500" />
                ) : isInternal ? <ArrowLeftRight className="h-5 w-5 text-blue-500" /> :
                 txDetail.type === 'DEPOSIT' ? <ArrowDownToLine className="h-5 w-5 text-green-500" /> :
                 <ArrowUpFromLine className="h-5 w-5 text-red-500" />}
                {isP2P ? (isIncoming ? '🤝 P2P Buy Order' : '🤝 P2P Sell Order') :
                 isInternal ? (isIncoming ? 'Received (Internal Transfer)' : 'Sent (Internal Transfer)') :
                 txDetail.type === 'DEPOSIT' ? '📥 Deposit' : '📤 Withdrawal'}
              </DialogTitle>
              <DialogDescription>Transaction #{txDetail.id.slice(-8).toUpperCase()}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {/* Main amount card */}
              <div className={`rounded-xl p-4 text-center ${isIncoming ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <p className="text-xs text-muted-foreground mb-1">
                  {isIncoming ? 'Received' : 'Sent'}
                </p>
                <p className={`text-3xl font-bold tabular-nums ${isIncoming ? 'text-green-500' : 'text-red-500'}`}>
                  {isIncoming ? '+' : '-'}{formatQty(txDetail.amount)} {txDetail.asset}
                </p>
                {txDetail.fee > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Network Fee: {formatQty(txDetail.fee)} {txDetail.asset}</p>
                )}
              </div>

              {/* P2P trade context — the REAL details */}
              {isP2P && p2pAction && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    {isIncoming ? '✅ You bought crypto' : '💰 You sold crypto'}
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isIncoming ? 'You bought:' : 'You sold:'}</span>
                      <span className="font-bold">{p2pAmount ? `${p2pAmount[1]} ${p2pAmount[2]}` : `${formatQty(txDetail.amount)} ${txDetail.asset}`}</span>
                    </div>
                    {p2pFiat && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{isIncoming ? 'You paid:' : 'You received:'}</span>
                        <span className="font-bold tabular-nums">{p2pFiat[1]} {p2pFiat[2]}</span>
                      </div>
                    )}
                    {p2pMethod && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment method:</span>
                        <span className="font-medium">{p2pMethod[1]}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-blue-500/20 text-xs text-muted-foreground">
                    {isIncoming
                      ? `The crypto has been credited to your wallet after the trade was approved.`
                      : `The crypto has been sent to the buyer after the trade was approved.`}
                  </div>
                </div>
              )}

              {/* General transaction info */}
              <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">
                    {isP2P ? '🤝 P2P Trade' : isInternal ? '🔄 Internal Transfer' : txDetail.type === 'DEPOSIT' ? '📥 Deposit' : '📤 Withdrawal'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-medium">{txDetail.network}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={txDetail.status} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Date</span>
                  <span className="text-xs">{formatDateTime(txDetail.createdAt)}</span>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setTxDetail(null)}>Close</Button>
          </DialogContent>
        </Dialog>
        )
      })()}
    </div>
  )
}

function AssetIcon({ asset }: { asset: string }) {
  const icons: Record<string, string> = {
    BTC: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    USDT: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    USDC: 'https://assets.coingecko.com/coins/images/6319/large/usdc.png',
    BNB: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
    SOL: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    XRP: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
    ADA: 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
    DOGE: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
    AVAX: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedTransparent.png',
    LINK: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
    DOT: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',
    MATIC: 'https://assets.coingecko.com/coins/images/4713/large/polygon.png',
    LTC: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png',
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden bg-muted flex-shrink-0">
      {icons[asset] ? (
        <img src={icons[asset]} alt={asset} className="h-7 w-7 rounded-full" loading="lazy" />
      ) : (
        <span className="text-xs font-bold">{asset.slice(0, 3)}</span>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: any; label: string }> = {
    COMPLETED: { color: 'text-green-500 bg-green-500/10', icon: CheckCircle2, label: 'Completed' },
    PENDING: { color: 'text-yellow-500 bg-yellow-500/10', icon: Clock, label: 'Pending' },
    FAILED: { color: 'text-red-500 bg-red-500/10', icon: XCircle, label: 'Failed' },
    REJECTED: { color: 'text-red-500 bg-red-500/10', icon: XCircle, label: 'Rejected' },
    CONFIRMED: { color: 'text-green-500 bg-green-500/10', icon: CheckCircle2, label: 'Confirmed' },
  }
  const config = map[status] || map.PENDING
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

function SendDialog({ wallet, wallets, onClose, onSuccess }: {
  wallet: WalletData
  wallets: WalletData[]
  onClose: () => void
  onSuccess: () => void
}) {
  const { toast } = useToast()
  const [asset] = useState('USDT')
  const [address, setAddress] = useState('')
  const [network, setNetwork] = useState(WITHDRAW_NETWORKS[0].network)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedWallet = wallets.find(w => w.asset === asset)
  const available = selectedWallet?.available ?? 0
  const networkInfo = WITHDRAW_NETWORKS.find(n => n.network === network) || WITHDRAW_NETWORKS[0]
  const fee = networkInfo.fee
  const amountNum = parseFloat(amount) || 0
  const total = amountNum + fee

  const setMax = () => {
    const max = Math.max(0, available - fee)
    setAmount(max.toString())
  }

  const placeholderByNetwork: Record<string, string> = {
    TRC20: 'T... (Tron address)',
    BEP20: '0x... (BSC address)',
    ERC20: '0x... (Ethereum address)',
  }

  const submit = async () => {
    if (!address) {
      toast({ title: 'Enter destination address', variant: 'destructive' })
      return
    }
    if (amountNum <= 0) {
      toast({ title: 'Enter valid amount', variant: 'destructive' })
      return
    }
    if (total > available) {
      toast({ title: 'Insufficient balance', description: `Need ${total} ${asset}, have ${available}`, variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/wallet/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, network, address, amount: amountNum }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast({
        title: 'Withdrawal request submitted',
        description: `${amountNum} ${asset} is now pending verification. You will be notified once processed.`,
      })
      onSuccess()
      onClose()
    } catch (e: any) {
      toast({ title: 'Withdrawal failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw USDT</DialogTitle>
          <DialogDescription>Send USDT to an external wallet address</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Network</label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger><SelectValue placeholder="Select network" /></SelectTrigger>
              <SelectContent>
                {WITHDRAW_NETWORKS.map(n => (
                  <SelectItem key={n.network} value={n.network}>
                    {n.network} (fee: {n.fee} USDT)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{networkInfo.description}</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
              ⚠ Only send USDT via {network} network. Using wrong network will result in permanent loss.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Destination Address</label>
            <Input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder={placeholderByNetwork[network] || 'Paste wallet address'}
              className="font-mono text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Amount</label>
              <button
                className="text-xs text-primary hover:underline"
                onClick={setMax}
              >
                Max: {formatQty(Math.max(0, available - fee))}
              </button>
            </div>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="tabular-nums"
            />
          </div>

          <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available</span>
              <span className="tabular-nums">{formatQty(available)} USDT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network Fee</span>
              <span className="tabular-nums">{fee} USDT</span>
            </div>
            <div className="flex justify-between font-medium pt-1 border-t border-border">
              <span>Total</span>
              <span className="tabular-nums">{formatQty(total)} USDT</span>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-blue-700 dark:text-blue-400">
                <p className="font-medium mb-0.5">Verification Required</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>Funds are locked (moved from available) until processed</li>
                  <li>Your total balance does NOT change until approved</li>
                  <li>If approved, funds leave your wallet</li>
                  <li>If rejected, locked funds return to your available balance</li>
                  <li>You will receive a notification once processed</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
            onClick={submit}
            disabled={loading || !address || !amount || !network}
          >
            {loading ? 'Processing...' : 'Submit Withdrawal Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DepositDialog({ wallet, onClose, onSuccess }: {
  wallet: WalletData
  onClose: () => void
  onSuccess: () => void
}) {
  const { toast } = useToast()
  const [asset] = useState('USDT')
  const [selectedNetwork, setSelectedNetwork] = useState(DEPOSIT_NETWORKS[0].network)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const current = DEPOSIT_NETWORKS.find(n => n.network === selectedNetwork) || DEPOSIT_NETWORKS[0]
  const address = current.address
  const amountNum = parseFloat(amount) || 0

  const copy = async () => {
    const ok = await copyToClipboard(address)
    if (ok) {
      setCopied(true)
      toast({ title: 'Address copied' })
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const submit = async () => {
    if (amountNum <= 0) {
      toast({ title: 'Enter valid amount', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, network: selectedNetwork, amount: amountNum }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast({
        title: 'Deposit request submitted',
        description: `${amountNum} USDT will be credited after verification.`,
      })
      onSuccess()
      onClose()
    } catch (e: any) {
      toast({ title: 'Deposit failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit USDT</DialogTitle>
          <DialogDescription>Receive USDT to your P2PEX wallet</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Network</label>
            <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
              <SelectTrigger><SelectValue placeholder="Select network" /></SelectTrigger>
              <SelectContent>
                {DEPOSIT_NETWORKS.map(n => (
                  <SelectItem key={n.network} value={n.network}>
                    {n.network} (fee: {n.fee} USDT)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{current.description}</p>
          </div>

          {/* QR + Address */}
          <div className="flex flex-col items-center py-4 bg-muted/30 rounded-lg">
            <div className="bg-white p-3 rounded-lg mb-3">
              <QrCode className="h-32 w-32 text-black" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">Deposit Address ({selectedNetwork})</p>
            <p className="text-xs font-mono break-all px-4 text-center max-w-xs">{address}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={copy}>
              {copied ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {copied ? 'Copied!' : 'Copy Address'}
            </Button>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Amount Sent (USDT)</label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="tabular-nums"
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-blue-700 dark:text-blue-400">
                <p className="font-medium mb-0.5">Verification Required</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>Your balance will NOT change until verified</li>
                  <li>Submit this form after sending the funds on-chain</li>
                  <li>We verify the on-chain transaction</li>
                  <li>You will receive a notification once approved</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-yellow-500/10 p-2 rounded">
            <p className="font-medium text-yellow-600 dark:text-yellow-500 mb-1">⚠ Important</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Send only USDT to this address</li>
              <li>Network fee: 0.01 USDT</li>
              <li>Your deposit will be credited after verification</li>
            </ul>
          </div>

          <Button
            variant="default"
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
            onClick={submit}
            disabled={loading || !amount}
          >
            {loading ? 'Processing...' : 'Submit Deposit Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * TransferDialog - internal transfer between P2PEX users by User ID or @username.
 * Funds are locked pending verification. Recipient is credited on approval;
 * funds return to sender on rejection.
 */
function TransferDialog({ wallet, wallets, onClose, onSuccess }: {
  wallet: WalletData
  wallets: WalletData[]
  onClose: () => void
  onSuccess: () => void
}) {
  const { toast } = useToast()
  const [asset, setAsset] = useState(wallet.asset)
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedWallet = wallets.find(w => w.asset === asset)
  const available = selectedWallet?.available ?? 0
  const amountNum = parseFloat(amount) || 0

  const submit = async () => {
    if (!recipient.trim()) {
      toast({ title: 'Enter recipient', description: 'Enter the recipient\'s user ID (e.g. 000001) or @username', variant: 'destructive' })
      return
    }
    if (amountNum <= 0) {
      toast({ title: 'Enter valid amount', variant: 'destructive' })
      return
    }
    if (amountNum > available) {
      toast({ title: 'Insufficient balance', description: `Available: ${available} ${asset}`, variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, amount: amountNum, recipient: recipient.trim(), note }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast({
        title: 'Transfer submitted',
        description: `${amountNum} ${asset} is locked pending verification. Recipient: ${recipient.trim()}.`,
      })
      onSuccess()
      onClose()
    } catch (e: any) {
      toast({ title: 'Transfer failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-blue-500" />
            Internal Transfer
          </DialogTitle>
          <DialogDescription>
            Send crypto to another P2PEX user by their User ID or @username. Requires verification before the recipient receives the funds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Info banner */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-blue-700 dark:text-blue-400">
                <p className="font-medium mb-0.5">How internal transfers work:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>Free — no network fees</li>
                  <li>Funds are locked until verified</li>
                  <li>Recipient is credited only after approval</li>
                  <li>If rejected, funds return to your available balance</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Asset</label>
            <Select value={asset} onValueChange={setAsset}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {wallets.filter(w => w.balance > 0 || ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL'].includes(w.asset)).map(w => (
                  <SelectItem key={w.asset} value={w.asset}>
                    {w.asset} - {w.assetName} ({formatQty(w.available)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Recipient (User ID or @username)</label>
            <Input
              type="text"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder="e.g. 000001 or @kirubel"
              className="mt-1 font-mono"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the recipient&apos;s numerical User ID (e.g. <span className="font-mono">000001</span>) or @username (e.g. <span className="font-mono">@kirubel</span>). The recipient must have a P2PEX account.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Amount</label>
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => setAmount(available.toString())}
              >
                Max: {formatQty(available)}
              </button>
            </div>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="tabular-nums"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="What's this transfer for?"
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available</span>
              <span className="tabular-nums">{formatQty(available)} {asset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network Fee</span>
              <span className="text-green-600 dark:text-green-400 font-medium">FREE</span>
            </div>
            <div className="flex justify-between font-medium pt-1 border-t border-border">
              <span>Recipient receives</span>
              <span className="tabular-nums">{formatQty(amountNum)} {asset}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-border text-yellow-600 dark:text-yellow-400">
              <span>Status</span>
              <span>Pending verification</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white"
              onClick={submit}
              disabled={loading || !recipient.trim() || !amount}
            >
              {loading ? 'Submitting...' : 'Submit Transfer Request'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
