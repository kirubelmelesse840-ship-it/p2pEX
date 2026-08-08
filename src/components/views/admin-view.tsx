'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Tabs, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Shield, Users, TrendingUp, DollarSign, Activity, Settings, AlertTriangle,
  CheckCircle2, XCircle, Clock, Search, Star, Ban, ShieldCheck, ShieldAlert,
  Zap, BarChart3, ArrowUpRight, ArrowDownRight, Plus, Trash2, Edit3, Power,
  Wallet, RefreshCw,
} from 'lucide-react'
import { BackButton } from '@/components/back-button'
import {
  formatPrice, formatQty, formatUsd, formatCompact, formatDateTime, formatPercent,
} from '@/lib/utils'
import {
  ComposedChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts'

type Tab = 'dashboard' | 'users' | 'pairs' | 'p2p' | 'transactions' | 'orders' | 'settings'

export function AdminView() {
  const { user, setView } = useAppStore()
  const [tab, setTab] = useState<Tab>('dashboard')

  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShieldAlert className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
        <p className="text-sm text-muted-foreground mb-6">
          You don't have permission to view this page. Only admin users can access the control panel.
        </p>
        <Button onClick={() => setView('home')}>Back to Home</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 max-w-7xl">
      <BackButton to="home" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 mt-1">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground">
            Logged in as <span className="font-medium text-foreground">{user.name}</span> ({user.email})
          </p>
        </div>
        <Badge variant="default" className="bg-red-500/15 text-red-600 dark:text-red-400">
          <Shield className="h-3 w-3 mr-1" /> ADMIN
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList className="overflow-x-auto h-auto flex-wrap">
          <TabsTrigger value="dashboard" className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="users" className="gap-1"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="pairs" className="gap-1"><TrendingUp className="h-3.5 w-3.5" /> Pairs</TabsTrigger>
          <TabsTrigger value="p2p" className="gap-1"><Shield className="h-3.5 w-3.5" /> P2P Moderation</TabsTrigger>
          <TabsTrigger value="orders" className="gap-1"><Activity className="h-3.5 w-3.5" /> Orders</TabsTrigger>
          <TabsTrigger value="transactions" className="gap-1"><DollarSign className="h-3.5 w-3.5" /> Transactions</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1"><Settings className="h-3.5 w-3.5" /> Settings</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'pairs' && <PairsTab />}
      {tab === 'p2p' && <P2PTab />}
      {tab === 'orders' && <OrdersTab />}
      {tab === 'transactions' && <TransactionsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  )
}

// =================== DASHBOARD TAB ===================
function DashboardTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats')
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setData(d)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [load])

  if (loading || !data) {
    return <div className="text-center py-12 text-muted-foreground">Loading dashboard...</div>
  }

  const s = data.stats

  return (
    <div className="space-y-4">
      {/* Top metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          label="Total Users"
          value={s.users.total}
          sub={`${s.users.active} active · ${s.users.banned} banned`}
          color="text-blue-500"
        />
        <MetricCard
          icon={<Activity className="h-5 w-5" />}
          label="24h Volume"
          value={formatUsd(s.trades.volume24hUsd)}
          sub={`${s.trades.last24h} trades in 24h`}
          color="text-green-500"
        />
        <MetricCard
          icon={<Wallet className="h-5 w-5" />}
          label="Total Balance"
          value={formatUsd(s.wallets.totalUsdValue)}
          sub={`${formatUsd(s.wallets.totalLockedValue)} locked in orders`}
          color="text-yellow-500"
        />
        <MetricCard
          icon={<Shield className="h-5 w-5" />}
          label="KYC Pending"
          value={s.users.kycPending}
          sub={`${s.users.admins} admins`}
          color="text-orange-500"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SmallStat label="Active Pairs" value={`${s.pairs.active}/${s.pairs.total}`} />
        <SmallStat label="Open Orders" value={s.orders.open} />
        <SmallStat label="P2P Active" value={`${s.p2p.active}/${s.p2p.listings}`} />
        <SmallStat label="Pending Tx" value={s.transactions.pending} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User growth chart */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" /> New Users (7 days)
          </h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.userGrowth}>
                <defs>
                  <linearGradient id="userGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  tickFormatter={(v) => v.slice(5)}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#userGrowth)"
                  name="New users"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Recent Trades
          </h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {data.recentTrades.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No recent trades</p>
            ) : (
              data.recentTrades.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/40 last:border-0">
                  <div>
                    <div className="font-medium">{t.symbol}</div>
                    <div className="text-muted-foreground">
                      {t.buyer} ← {t.seller}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tabular-nums font-medium">{formatPrice(t.price)}</div>
                    <div className="text-muted-foreground">{formatQty(t.quantity)} {t.symbol.replace(/USDT|USDC|BTC|ETH|BNB$/, '')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent registrations */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" /> Recent Registrations
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">User</th>
                <th className="px-4 py-2 text-left font-medium hidden sm:table-cell">Email</th>
                <th className="px-4 py-2 text-left font-medium">KYC</th>
                <th className="px-4 py-2 text-right font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No users yet</td></tr>
              ) : (
                data.recentUsers.map((u: any) => (
                  <tr key={u.id} className="border-t border-border/40 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.kycVerified ? (
                        <Badge variant="default" className="bg-green-500/15 text-green-600 dark:text-green-400">L{u.kycLevel}</Badge>
                      ) : (
                        <Badge variant="secondary">Unverified</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDateTime(u.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className={color}>{icon}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  )
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  )
}

// =================== USERS TAB ===================
function UsersTab() {
  const { toast } = useToast()
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [kycFilter, setKycFilter] = useState('all')
  const [walletDialog, setWalletDialog] = useState<any>(null)
  const [banDialog, setBanDialog] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (kycFilter !== 'all') params.set('kyc', kycFilter)
      const res = await fetch(`/api/admin/users?${params}`)
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setUsers(d.users || [])
      setTotal(d.total || 0)
    } catch (e: any) {
      toast({ title: 'Failed to load users', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, kycFilter, toast])

  useEffect(() => { load() }, [load])

  const act = async (userId: string, action: string, payload?: any) => {
    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, ...payload }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast({ title: 'Action completed', description: d.message })
      load()
    } catch (e: any) {
      toast({ title: 'Action failed', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-card rounded-lg border border-border">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kycFilter} onValueChange={setKycFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All KYC</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
            <SelectItem value="level1">Level 1</SelectItem>
            <SelectItem value="level2">Level 2</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">Showing {users.length} of {total} users</div>

      {/* Users table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">User</th>
                <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Email</th>
                <th className="px-3 py-2 text-left font-medium">KYC</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium hidden sm:table-cell">Balance</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No users found</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="border-t border-border/40 hover:bg-muted/30">
                    <td className="px-3 py-3">
                      <div className="font-medium flex items-center gap-1">
                        {u.name}
                        {u.isAdmin && <Shield className="h-3 w-3 text-red-500" />}
                      </div>
                      <div className="text-xs text-muted-foreground">{u._count.orders} orders · {u._count.transactions} txs</div>
                    </td>
                    <td className="px-3 py-3 text-xs hidden md:table-cell">{u.email}</td>
                    <td className="px-3 py-3">
                      {u.kycVerified ? (
                        <Badge variant="default" className="bg-green-500/15 text-green-600 dark:text-green-400">L{u.kycLevel}</Badge>
                      ) : (
                        <Badge variant="secondary">None</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {u.isBanned ? (
                        <Badge variant="default" className="bg-red-500/15 text-red-600 dark:text-red-400">Banned</Badge>
                      ) : u.isActive ? (
                        <Badge variant="default" className="bg-green-500/15 text-green-600 dark:text-green-400">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums hidden sm:table-cell">
                      {formatQty(u.totalBalance)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex gap-1 justify-end flex-wrap">
                        {!u.kycVerified && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" title="Verify KYC Level 1"
                            onClick={() => act(u.id, 'verifyKyc', { level: 1 })}>
                            <ShieldCheck className="h-3 w-3" />
                          </Button>
                        )}
                        {u.kycLevel < 2 && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" title="Upgrade to L2"
                            onClick={() => act(u.id, 'verifyKyc', { level: 2 })}>
                            <Star className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 text-xs" title="Adjust wallet"
                          onClick={() => setWalletDialog(u)}>
                          <Wallet className="h-3 w-3" />
                        </Button>
                        {!u.isBanned ? (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" title="Ban user"
                            onClick={() => setBanDialog(u)}>
                            <Ban className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-green-500" title="Unban user"
                            onClick={() => act(u.id, 'unban')}>
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                        )}
                        {!u.isAdmin ? (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" title="Make admin"
                            onClick={() => act(u.id, 'makeAdmin')}>
                            <ShieldAlert className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" title="Remove admin"
                            onClick={() => act(u.id, 'removeAdmin')}>
                            <Shield className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {walletDialog && (
        <WalletAdjustDialog user={walletDialog} onClose={() => setWalletDialog(null)} onSuccess={load} />
      )}
      {banDialog && (
        <BanDialog user={banDialog} onClose={() => setBanDialog(null)} onConfirm={(reason) => {
          act(banDialog.id, 'ban', { reason })
          setBanDialog(null)
        }} />
      )}
    </div>
  )
}

function WalletAdjustDialog({ user, onClose, onSuccess }: any) {
  const { toast } = useToast()
  const [asset, setAsset] = useState('USDT')
  const [action, setAction] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, asset, action, amount: parseFloat(amount) }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast({ title: 'Wallet adjusted', description: d.message })
      onSuccess()
      onClose()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Wallet — {user.name}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant={action === 'credit' ? 'default' : 'outline'}
              className={action === 'credit' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
              onClick={() => setAction('credit')}
            >
              <ArrowDownRight className="h-4 w-4 mr-1.5" /> Credit
            </Button>
            <Button
              variant={action === 'debit' ? 'default' : 'outline'}
              className={action === 'debit' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
              onClick={() => setAction('debit')}
            >
              <ArrowUpRight className="h-4 w-4 mr-1.5" /> Debit
            </Button>
          </div>
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
            <label className="text-xs font-medium text-muted-foreground">Amount</label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="tabular-nums"
            />
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-xs text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            This action will be logged as an admin transaction visible to the user.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className={action === 'credit' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}
              onClick={submit}
              disabled={loading || !amount}
            >
              {loading ? 'Processing...' : `${action === 'credit' ? 'Credit' : 'Debit'} ${asset}`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function BanDialog({ user, onClose, onConfirm }: any) {
  const [reason, setReason] = useState('Violation of terms')
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-500" /> Ban User
          </DialogTitle>
          <DialogDescription>
            Banning <strong>{user.name}</strong> ({user.email}) will prevent them from logging in and trading.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Reason</label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Why is this user being banned?"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => onConfirm(reason)}
            >
              <Ban className="h-4 w-4 mr-1.5" /> Confirm Ban
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// =================== PAIRS TAB ===================
function PairsTab() {
  const { toast } = useToast()
  const [pairs, setPairs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialog, setAddDialog] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/pairs')
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setPairs(d.pairs || [])
    } catch (e: any) {
      toast({ title: 'Failed to load pairs', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const toggleActive = async (pair: any) => {
    try {
      const res = await fetch('/api/admin/pairs/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairId: pair.id, action: 'update', isActive: !pair.isActive }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast({ title: 'Pair updated', description: d.message })
      load()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  const remove = async (pair: any) => {
    if (!confirm(`Delete pair ${pair.symbol}? This cannot be undone.`)) return
    try {
      const res = await fetch('/api/admin/pairs/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairId: pair.id, action: 'delete' }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast({ title: 'Pair deleted', description: d.message })
      load()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{pairs.length} trading pairs</p>
        <Button size="sm" onClick={() => setAddDialog(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Pair
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Symbol</th>
                <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Base/Quote</th>
                <th className="px-3 py-2 text-right font-medium">Last Price</th>
                <th className="px-3 py-2 text-right font-medium hidden md:table-cell">24h Change</th>
                <th className="px-3 py-2 text-right font-medium hidden lg:table-cell">Volume</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : pairs.map(p => (
                <tr key={p.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-3 py-3 font-medium">{p.symbol}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                    {p.baseAssetName} / {p.quoteAssetName}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatPrice(p.lastPrice)}</td>
                  <td className="px-3 py-3 text-right tabular-nums hidden md:table-cell">
                    <span className={p.priceChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {formatPercent(p.priceChangePercent)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted-foreground hidden lg:table-cell">
                    {formatCompact(p.volume24h)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 text-xs ${p.isActive ? 'text-green-500' : 'text-red-500'}`}
                      onClick={() => toggleActive(p)}
                    >
                      <Power className="h-3 w-3 mr-1" />
                      {p.isActive ? 'Active' : 'Disabled'}
                    </Button>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => remove(p)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {addDialog && (
        <AddPairDialog onClose={() => setAddDialog(false)} onSuccess={load} />
      )}
    </div>
  )
}

function AddPairDialog({ onClose, onSuccess }: any) {
  const { toast } = useToast()
  const [baseAsset, setBaseAsset] = useState('BTC')
  const [quoteAsset, setQuoteAsset] = useState('USDT')
  const [lastPrice, setLastPrice] = useState('1')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      const symbol = `${baseAsset}${quoteAsset}`
      const res = await fetch('/api/admin/pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, baseAsset, quoteAsset, lastPrice: parseFloat(lastPrice) }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast({ title: 'Pair created', description: d.message })
      onSuccess()
      onClose()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Trading Pair</DialogTitle>
          <DialogDescription>Create a new spot trading pair</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Base Asset</label>
              <Input value={baseAsset} onChange={e => setBaseAsset(e.target.value.toUpperCase())} placeholder="BTC" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Quote Asset</label>
              <Input value={quoteAsset} onChange={e => setQuoteAsset(e.target.value.toUpperCase())} placeholder="USDT" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Initial Price</label>
            <Input type="number" value={lastPrice} onChange={e => setLastPrice(e.target.value)} className="tabular-nums" />
          </div>
          <div className="bg-muted/30 p-2 rounded text-xs">
            Pair symbol: <strong>{baseAsset}{quoteAsset}</strong>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={loading || !baseAsset || !quoteAsset}>
              {loading ? 'Creating...' : 'Create Pair'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// =================== P2P MODERATION TAB ===================
function P2PTab() {
  const { toast } = useToast()
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/listings?status=${statusFilter}`)
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setListings(d.listings || [])
    } catch (e: any) {
      toast({ title: 'Failed to load listings', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, toast])

  useEffect(() => { load() }, [load])

  const act = async (listingId: string, action: string) => {
    try {
      const res = await fetch('/api/admin/listings/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, action }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast({ title: 'Action completed', description: d.message })
      load()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Listings</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Advertiser</th>
                <th className="px-3 py-2 text-left font-medium">Pair</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-right font-medium hidden sm:table-cell">Available</th>
                <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Methods</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : listings.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No listings</td></tr>
              ) : listings.map(l => (
                <tr key={l.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-3 py-3">
                    <div className="font-medium text-xs">{l.user.name}</div>
                    <div className="text-xs text-muted-foreground">{l.user.email}</div>
                    {l.user.isBanned && <Badge variant="default" className="bg-red-500/15 text-red-600 dark:text-red-400 text-[10px]">Banned</Badge>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-xs">{l.side === 'SELL' ? 'Selling' : 'Buying'} {l.asset}</div>
                    <div className="text-xs text-muted-foreground">for {l.fiatCurrency}</div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatPrice(l.price)}</td>
                  <td className="px-3 py-3 text-right tabular-nums hidden sm:table-cell">{formatQty(l.available)}</td>
                  <td className="px-3 py-3 text-xs hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {l.paymentMethods.slice(0, 2).map((m: string) => (
                        <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
                      ))}
                      {l.paymentMethods.length > 2 && <span className="text-[10px]">+{l.paymentMethods.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Badge variant="secondary" className={
                      l.status === 'ACTIVE' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                      l.status === 'PAUSED' ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' :
                      l.status === 'CANCELED' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                      ''
                    }>{l.status}</Badge>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      {l.status === 'ACTIVE' && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" title="Pause" onClick={() => act(l.id, 'pause')}>
                          <Power className="h-3 w-3" />
                        </Button>
                      )}
                      {l.status === 'PAUSED' && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-green-500" title="Resume" onClick={() => act(l.id, 'resume')}>
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                      )}
                      {(l.status === 'ACTIVE' || l.status === 'PAUSED') && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" title="Cancel & refund" onClick={() => act(l.id, 'cancel')}>
                          <XCircle className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" title="Delete" onClick={() => {
                        if (confirm('Delete this listing permanently?')) act(l.id, 'delete')
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// =================== ORDERS TAB ===================
function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [symbolFilter, setSymbolFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (symbolFilter !== 'all') params.set('symbol', symbolFilter)
      const res = await fetch(`/api/admin/orders?${params}`)
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setOrders(d.orders || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, symbolFilter])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="FILLED">Filled</SelectItem>
            <SelectItem value="CANCELED">Canceled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={symbolFilter} onValueChange={setSymbolFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pairs</SelectItem>
            {['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT'].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">User</th>
                <th className="px-3 py-2 text-left font-medium">Pair</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium hidden sm:table-cell">Filled</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium hidden md:table-cell">Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No orders</td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-3 py-3 text-xs">{o.userName}</td>
                  <td className="px-3 py-3">
                    <span className={o.side === 'BUY' ? 'text-green-500' : 'text-red-500'}>
                      {o.side === 'BUY' ? 'Buy' : 'Sell'}
                    </span>{' '}
                    {o.symbol}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{o.type}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatPrice(o.price)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatQty(o.quantity)}</td>
                  <td className="px-3 py-3 text-right tabular-nums hidden sm:table-cell">{((o.filledQty / o.quantity) * 100).toFixed(0)}%</td>
                  <td className="px-3 py-3 text-center">
                    <Badge variant="secondary" className={
                      o.status === 'FILLED' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                      o.status === 'CANCELED' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                      'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                    }>{o.status}</Badge>
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-muted-foreground hidden md:table-cell">{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// =================== TRANSACTIONS TAB ===================
function TransactionsTab() {
  const [txs, setTxs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/transactions?${params}`)
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setTxs(d.transactions || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="deposit">Deposits</SelectItem>
            <SelectItem value="withdraw">Withdrawals</SelectItem>
            <SelectItem value="internal_transfer">Internal Transfers</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">User</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Asset</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Network</th>
                <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Note</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium hidden md:table-cell">Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : txs.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No transactions</td></tr>
              ) : txs.map(t => (
                <tr key={t.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-3 py-3 text-xs">{t.userName}</td>
                  <td className="px-3 py-3">
                    <Badge variant="secondary" className={
                      t.type === 'DEPOSIT' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                      t.type === 'WITHDRAW' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                      'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    }>{t.type.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-3 py-3">{t.asset}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatQty(t.amount)}</td>
                  <td className="px-3 py-3 text-xs hidden sm:table-cell">{t.network}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{t.note}</td>
                  <td className="px-3 py-3 text-center">
                    <Badge variant="secondary" className={
                      t.status === 'COMPLETED' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                      t.status === 'PENDING' ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' :
                      'bg-red-500/15 text-red-600 dark:text-red-400'
                    }>{t.status}</Badge>
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-muted-foreground hidden md:table-cell">{formatDateTime(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// =================== SETTINGS TAB ===================
function SettingsTab() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings')
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setSettings(d.settings || {})
    } catch (e: any) {
      toast({ title: 'Failed to load settings', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast({ title: 'Settings saved', description: d.message })
    } catch (e: any) {
      toast({ title: 'Failed to save', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const update = (key: string, value: string) => {
    setSettings(s => ({ ...s, [key]: value }))
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading settings...</div>

  return (
    <div className="space-y-4">
      {/* Critical controls */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" /> Platform Controls
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleRow
            label="Maintenance Mode"
            description="Disables all user trading. Only admins can access the platform."
            value={settings.maintenanceMode === 'true'}
            onChange={(v) => update('maintenanceMode', v ? 'true' : 'false')}
            icon={<Power className="h-4 w-4" />}
            danger
          />
          <ToggleRow
            label="Pause Market Data"
            description="Stops the simulated market price feed (does not affect open orders)."
            value={settings.marketPaused === 'true'}
            onChange={(v) => update('marketPaused', v ? 'true' : 'false')}
            icon={<Zap className="h-4 w-4" />}
            danger
          />
        </div>
      </div>

      {/* Fee configuration */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4" /> Fee Configuration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Spot Trading Fee (%)</label>
            <Input
              type="number"
              step="0.01"
              value={settings.spotFeePercent}
              onChange={e => update('spotFeePercent', e.target.value)}
              className="tabular-nums"
            />
            <p className="text-xs text-muted-foreground mt-1">Charged on each completed trade</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">P2P Fee (%)</label>
            <Input
              type="number"
              step="0.01"
              value={settings.p2pFeePercent}
              onChange={e => update('p2pFeePercent', e.target.value)}
              className="tabular-nums"
            />
            <p className="text-xs text-muted-foreground mt-1">Charged on completed P2P trades</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Withdraw Fee Multiplier</label>
            <Input
              type="number"
              step="0.1"
              value={settings.withdrawFeeMultiplier}
              onChange={e => update('withdrawFeeMultiplier', e.target.value)}
              className="tabular-nums"
            />
            <p className="text-xs text-muted-foreground mt-1">Multiplier applied to all withdrawal network fees</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Max Daily Withdraw (USD)</label>
            <Input
              type="number"
              value={settings.maxDailyWithdrawUsd}
              onChange={e => update('maxDailyWithdrawUsd', e.target.value)}
              className="tabular-nums"
            />
            <p className="text-xs text-muted-foreground mt-1">Per-user daily withdrawal limit</p>
          </div>
        </div>
      </div>

      {/* KYC + general */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> General
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Minimum KYC Level for Trading</label>
            <Select value={settings.minKycLevel} onValueChange={(v) => update('minKycLevel', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No KYC required</SelectItem>
                <SelectItem value="1">Level 1 (Basic)</SelectItem>
                <SelectItem value="2">Level 2 (Advanced)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Support Email</label>
            <Input
              type="email"
              value={settings.supportEmail}
              onChange={e => update('supportEmail', e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs font-medium text-muted-foreground">Public Announcement Banner</label>
          <Textarea
            value={settings.announcement}
            onChange={e => update('announcement', e.target.value)}
            rows={2}
            placeholder="Shown to all users at the top of the page. Leave empty to hide."
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={load}>Reset</Button>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  )
}

function ToggleRow({ label, description, value, onChange, icon, danger }: {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
  icon?: React.ReactNode
  danger?: boolean
}) {
  return (
    <div className={`border rounded-lg p-3 ${value ? (danger ? 'border-red-500 bg-red-500/5' : 'border-green-500 bg-green-500/5') : 'border-border'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <button
          onClick={() => onChange(!value)}
          className={`relative w-10 h-5 rounded-full transition ${value ? (danger ? 'bg-red-500' : 'bg-green-500') : 'bg-muted'}`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${value ? 'left-5' : 'left-0.5'}`}
          />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {value && (
        <p className={`text-xs mt-1 font-medium ${danger ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          ⚠ {label} is currently {danger ? 'ENABLED' : 'active'}
        </p>
      )}
    </div>
  )
}
