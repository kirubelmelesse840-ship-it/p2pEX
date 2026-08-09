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
  CheckCircle2, Clock, XCircle, ExternalLink, ArrowLeftRight, Users, Zap,
} from 'lucide-react'
import { formatPrice, formatQty, formatUsd, formatDateTime, shortAddr, copyToClipboard } from '@/lib/utils'
import { BackButton } from '@/components/back-button'

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

  const load = useCallback(async () => {
    if (!user) { setWallets([]); setTransactions([]); setLoading(false); return }
    try {
      const [walletRes, txRes] = await Promise.all([
        fetch('/api/wallet'),
        fetch('/api/wallet/transactions?limit=50'),
      ])
      const walletData = await walletRes.json()
      const txData = await txRes.json()
      setWallets(walletData.wallets || [])
      setTotalUsd(walletData.totalUsd || 0)
      setTransactions(txData.transactions || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!user) return
    const t = setInterval(load, 5000)
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
    <div className="container mx-auto px-3 sm:px-4 py-4 max-w-6xl">
      <BackButton to="home" />

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
            <Button variant="default" onClick={() => wallets[0] && setDepositDialog(wallets[0])}>
              <ArrowDownToLine className="h-4 w-4 mr-1.5" /> Deposit
            </Button>
            <Button variant="outline" onClick={() => wallets[0] && setSendDialog(wallets[0])}>
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
              {loading ? (
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
                    <tr key={t.id} className={`border-t border-border/40 hover:bg-muted/30 ${isInternal ? 'bg-blue-500/5' : ''}`}>
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
                            <Zap className="h-3 w-3" /> P2PET
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
    </div>
  )
}

function AssetIcon({ asset }: { asset: string }) {
  const colors: Record<string, string> = {
    BTC: 'bg-orange-500',
    ETH: 'bg-blue-500',
    USDT: 'bg-green-500',
    USDC: 'bg-blue-400',
    BNB: 'bg-yellow-500',
    SOL: 'bg-purple-500',
    XRP: 'bg-gray-500',
    ADA: 'bg-blue-600',
    DOGE: 'bg-yellow-400',
    AVAX: 'bg-red-500',
    LINK: 'bg-blue-500',
    DOT: 'bg-pink-500',
    MATIC: 'bg-purple-600',
    LTC: 'bg-gray-400',
  }
  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold ${colors[asset] || 'bg-gray-500'}`}>
      {asset.slice(0, 3)}
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
  const [asset, setAsset] = useState(wallet.asset)
  const [address, setAddress] = useState('')
  const [network, setNetwork] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const NETWORKS: Record<string, string[]> = {
    BTC: ['BTC'],
    ETH: ['ERC20'],
    USDT: ['TRC20', 'ERC20', 'BSC'],
    USDC: ['ERC20'],
    BNB: ['BSC'],
    SOL: ['SOL'],
    XRP: ['XRP'],
    ADA: ['ADA'],
    DOGE: ['DOGE'],
    AVAX: ['AVAX'],
    LINK: ['ERC20'],
    DOT: ['DOT'],
    MATIC: ['ERC20'],
    LTC: ['LTC'],
  }
  const FEES: Record<string, Record<string, number>> = {
    BTC: { BTC: 0.0001 },
    ETH: { ERC20: 0.001 },
    USDT: { TRC20: 1, ERC20: 5, BSC: 0.5 },
    USDC: { ERC20: 5 },
    BNB: { BSC: 0.001 },
    SOL: { SOL: 0.01 },
    XRP: { XRP: 0.1 },
    ADA: { ADA: 0.2 },
    DOGE: { DOGE: 5 },
    AVAX: { AVAX: 0.01 },
    LINK: { ERC20: 0.1 },
    DOT: { DOT: 0.05 },
    MATIC: { ERC20: 0.5 },
    LTC: { LTC: 0.0005 },
  }

  const availableNetworks = NETWORKS[asset] || []
  const selectedWallet = wallets.find(w => w.asset === asset)
  const available = selectedWallet?.available ?? 0
  const fee = FEES[asset]?.[network] ?? 0
  const amountNum = parseFloat(amount) || 0
  const total = amountNum + fee

  useEffect(() => {
    if (availableNetworks.length > 0 && !availableNetworks.includes(network)) {
      setNetwork(availableNetworks[0])
    }
  }, [asset])

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
        title: 'Withdrawal submitted',
        description: `${amountNum} ${asset} will be sent to ${shortAddr(address)} via ${network}`,
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
          <DialogTitle>Withdraw Crypto</DialogTitle>
          <DialogDescription>Send crypto to an external wallet address</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
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
            <label className="text-xs font-medium text-muted-foreground">Network</label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger><SelectValue placeholder="Select network" /></SelectTrigger>
              <SelectContent>
                {availableNetworks.map(n => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
              ⚠ Only send {asset} via {network} network. Using wrong network will result in permanent loss.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Destination Address</label>
            <Input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Paste wallet address"
              className="font-mono text-sm"
            />
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

          <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available</span>
              <span className="tabular-nums">{formatQty(available)} {asset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network Fee</span>
              <span className="tabular-nums">{fee} {asset}</span>
            </div>
            <div className="flex justify-between font-medium pt-1 border-t border-border">
              <span>Total</span>
              <span className="tabular-nums">{formatQty(total)} {asset}</span>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
            onClick={submit}
            disabled={loading || !address || !amount || !network}
          >
            {loading ? 'Processing...' : `Withdraw ${asset}`}
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
  const [asset, setAsset] = useState(wallet.asset)
  const [networks, setNetworks] = useState<any[]>([])
  const [selectedNetwork, setSelectedNetwork] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const loadAddress = async (a: string) => {
    try {
      const res = await fetch(`/api/wallet/address?asset=${a}`)
      const data = await res.json()
      setNetworks(data.networks || [])
      if (data.networks?.length > 0) {
        setSelectedNetwork(data.networks[0].network)
      }
    } catch {}
  }

  useEffect(() => { loadAddress(asset) }, [asset])
  useEffect(() => { setAsset(wallet.asset) }, [wallet])

  const current = networks.find(n => n.network === selectedNetwork)
  const address = current?.address || wallet.depositAddress

  const copy = async () => {
    const ok = await copyToClipboard(address)
    if (ok) {
      setCopied(true)
      toast({ title: 'Address copied' })
      setTimeout(() => setCopied(false), 1500)
    }
  }

  // Mock deposit (simulate receiving funds)
  const simulateDeposit = async () => {
    setLoading(true)
    try {
      const amount = asset === 'USDT' ? 1000 : asset === 'BTC' ? 0.05 : asset === 'ETH' ? 0.5 : 10
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, network: selectedNetwork, amount }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast({
        title: 'Deposit initiated',
        description: `${amount} ${asset} will be credited after confirmations.`,
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
          <DialogTitle>Deposit Crypto</DialogTitle>
          <DialogDescription>Receive crypto to your P2PET wallet</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Asset</label>
            <Select value={asset} onValueChange={setAsset}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'LINK', 'DOT', 'MATIC', 'LTC'].map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Network</label>
            <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
              <SelectTrigger><SelectValue placeholder="Select network" /></SelectTrigger>
              <SelectContent>
                {networks.map(n => (
                  <SelectItem key={n.network} value={n.network}>
                    {n.network} {n.fee ? `(fee: ${n.fee})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {networks.length > 1 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                ⚠ Make sure to send via {selectedNetwork}. Other networks may not be credited.
              </p>
            )}
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

          <div className="text-xs text-muted-foreground bg-yellow-500/10 p-2 rounded">
            <p className="font-medium text-yellow-600 dark:text-yellow-500 mb-1">⚠ Important</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Send only {asset} to this address</li>
              <li>Minimum deposit: {asset === 'BTC' ? '0.0001' : '0.01'} {asset}</li>
              <li>Confirmations required: {current?.confirmations || 12}</li>
            </ul>
          </div>

          {/* Demo deposit button */}
          <Button
            variant="default"
            className="w-full"
            onClick={simulateDeposit}
            disabled={loading}
          >
            {loading ? 'Processing...' : `Simulate Deposit (Demo)`}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            In production, deposits are detected automatically from the blockchain.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * TransferDialog - internal transfer between P2PET users by email
 * Instant, fee-free, no blockchain confirmation needed
 */
function TransferDialog({ wallet, wallets, onClose, onSuccess }: {
  wallet: WalletData
  wallets: WalletData[]
  onClose: () => void
  onSuccess: () => void
}) {
  const { toast } = useToast()
  const [asset, setAsset] = useState(wallet.asset)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedWallet = wallets.find(w => w.asset === asset)
  const available = selectedWallet?.available ?? 0
  const amountNum = parseFloat(amount) || 0

  const submit = async () => {
    if (!recipientEmail) {
      toast({ title: 'Enter recipient email', variant: 'destructive' })
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
        body: JSON.stringify({ asset, amount: amountNum, recipientEmail, note }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast({
        title: 'Transfer successful',
        description: `${amountNum} ${asset} sent to ${recipientEmail}`,
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
            Send crypto to another P2PET user instantly — no blockchain fees, no confirmation delays.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Info banner */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-blue-700 dark:text-blue-400">
                <p className="font-medium mb-0.5">Internal transfers are:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>Free — no network fees</li>
                  <li>Instant — confirmed immediately</li>
                  <li>Only between P2PET users (by email)</li>
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
            <label className="text-xs font-medium text-muted-foreground">Recipient Email (P2PET user)</label>
            <Input
              type="email"
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="user@example.com"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The recipient must have a P2PET account.
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white"
              onClick={submit}
              disabled={loading || !recipientEmail || !amount}
            >
              {loading ? 'Sending...' : 'Send Transfer'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
