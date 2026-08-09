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
  Wallet, RefreshCw, FileText, Bell, Send,
} from 'lucide-react'
import { BackButton } from '@/components/back-button'
import {
  formatPrice, formatQty, formatUsd, formatCompact, formatDateTime, formatPercent,
} from '@/lib/utils'
import {
  ComposedChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts'

type Tab = 'dashboard' | 'users' | 'pairs' | 'p2p' | 'payment-review' | 'transactions' | 'orders' | 'settings'

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
        <div className="flex items-center gap-2">
          <SendNotificationButton />
          <AdminNotifications />
          <Badge variant="default" className="bg-red-500/15 text-red-600 dark:text-red-400">
            <Shield className="h-3 w-3 mr-1" /> ADMIN
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList className="overflow-x-auto h-auto flex-wrap">
          <TabsTrigger value="dashboard" className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="users" className="gap-1"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="pairs" className="gap-1"><TrendingUp className="h-3.5 w-3.5" /> Pairs</TabsTrigger>
          <TabsTrigger value="p2p" className="gap-1"><Shield className="h-3.5 w-3.5" /> P2P Moderation</TabsTrigger>
          <TabsTrigger value="payment-review" className="gap-1"><Clock className="h-3.5 w-3.5" /> Payment Review</TabsTrigger>
          <TabsTrigger value="orders" className="gap-1"><Activity className="h-3.5 w-3.5" /> Orders</TabsTrigger>
          <TabsTrigger value="transactions" className="gap-1"><DollarSign className="h-3.5 w-3.5" /> Transactions</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1"><Settings className="h-3.5 w-3.5" /> Settings</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'pairs' && <PairsTab />}
      {tab === 'p2p' && <P2PTab />}
      {tab === 'payment-review' && <PaymentReviewTab />}
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
  const [docDialog, setDocDialog] = useState<any>(null)

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
          </SelectContent>
        </Select>
        <Select value={kycFilter} onValueChange={setKycFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All KYC</SelectItem>
            <SelectItem value="pending">⏳ Pending Review</SelectItem>
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
              ) : users.filter(u => !u.isAdmin).length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No users found</td></tr>
              ) : (
                users.filter(u => !u.isAdmin).map(u => (
                  <tr key={u.id} className="border-t border-border/40 hover:bg-muted/30">
                    <td className="px-3 py-3">
                      <div className="font-medium flex items-center gap-1">
                        {u.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{u._count.orders} orders · {u._count.transactions} txs</div>
                    </td>
                    <td className="px-3 py-3 text-xs hidden md:table-cell">{u.email}</td>
                    <td className="px-3 py-3">
                      {u.kycVerified ? (
                        <Badge variant="default" className="bg-green-500/15 text-green-600 dark:text-green-400">Verified L{u.kycLevel}</Badge>
                      ) : u.kycStatus === 'PENDING' ? (
                        <Badge variant="default" className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">Pending Review</Badge>
                      ) : u.kycStatus === 'REJECTED' ? (
                        <Badge variant="default" className="bg-red-500/15 text-red-600 dark:text-red-400">Rejected</Badge>
                      ) : (
                        <Badge variant="secondary">Not Submitted</Badge>
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
                        {/* KYC actions — Approve / Reject / Unapprove based on status */}
                        {u.kycStatus === 'PENDING' && (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-500" title="Approve KYC"
                              onClick={() => act(u.id, 'verifyKyc', { level: 1 })}>
                              <ShieldCheck className="h-3 w-3" /> Approve
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" title="Reject KYC"
                              onClick={() => {
                                const reason = prompt('Reason for rejection:')
                                if (reason !== null && reason.trim()) act(u.id, 'rejectKyc', { reason })
                              }}>
                              <XCircle className="h-3 w-3" /> Reject
                            </Button>
                          </>
                        )}
                        {u.kycStatus === 'APPROVED' && (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-500" title="Upgrade to Level 2"
                              onClick={() => act(u.id, 'verifyKyc', { level: 2 })}>
                              <Star className="h-3 w-3" /> Upgrade L2
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-orange-500" title="Revoke verification (unapprove)"
                              onClick={() => {
                                if (confirm(`Revoke verification for ${u.name}? They will become unverified and return to pending status.`)) {
                                  act(u.id, 'unapproveKyc')
                                }
                              }}>
                              <ShieldAlert className="h-3 w-3" /> Unapprove
                            </Button>
                          </>
                        )}
                        {u.kycStatus === 'REJECTED' && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-green-500" title="Approve after re-review"
                            onClick={() => act(u.id, 'verifyKyc', { level: 1 })}>
                            <ShieldCheck className="h-3 w-3" /> Approve
                          </Button>
                        )}
                        {(u.kycStatus === 'PENDING' || u.kycStatus === 'APPROVED' || u.kycStatus === 'REJECTED') && u.kycDocumentFront && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" title="View KYC documents"
                            onClick={() => setDocDialog(u)}>
                            <FileText className="h-3 w-3" /> Docs
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

      {docDialog && (
        <DocumentViewerDialog user={docDialog} onClose={() => setDocDialog(null)} />
      )}
    </div>
  )
}

/**
 * DocumentViewerDialog - shows the KYC document images and info for admin review,
 * with Approve and Reject buttons directly in the dialog.
 */
function DocumentViewerDialog({ user, onClose, onAction }: { user: any; onClose: () => void; onAction?: (userId: string, action: string, payload?: any) => void }) {
  const { toast } = useToast()
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleApprove = async () => {
    setProcessing(true)
    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: 'verifyKyc', level: 1 }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast({ title: 'KYC Approved', description: `${user.name} is now verified (Level 1)` })
      onClose()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast({ title: 'Reason required', description: 'Please provide a reason for rejection', variant: 'destructive' })
      return
    }
    setProcessing(true)
    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: 'rejectKyc', reason: rejectReason.trim() }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast({ title: 'KYC Rejected', description: `${user.name} has been notified` })
      onClose()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const handleUnapprove = async () => {
    if (!confirm(`Revoke verification for ${user.name}? They will become unverified.`)) return
    setProcessing(true)
    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: 'unapproveKyc' }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast({ title: 'Verification Revoked', description: `${user.name} is now unverified` })
      onClose()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const isPending = user.kycStatus === 'PENDING'
  const isApproved = user.kycStatus === 'APPROVED'
  const isRejected = user.kycStatus === 'REJECTED'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            KYC Review — {user.name}
          </DialogTitle>
          <DialogDescription>
            {user.email} · Submitted {user.kycSubmittedAt ? formatDateTime(user.kycSubmittedAt) : 'N/A'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            {isApproved && <Badge className="bg-green-500/15 text-green-600 dark:text-green-400"><CheckCircle2 className="h-3 w-3 mr-1" />Approved (L{user.kycLevel})</Badge>}
            {isPending && <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>}
            {isRejected && <Badge className="bg-red-500/15 text-red-600 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>}
            {user.kycStatus === 'NONE' && <Badge variant="secondary">Not Submitted</Badge>}
          </div>

          {/* KYC info */}
          <div className="bg-muted/30 rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Full Name:</span> <span className="font-medium">{user.kycFullName || 'N/A'}</span></div>
            <div><span className="text-muted-foreground">ID Type:</span> <span className="font-medium">{user.kycIdType || 'N/A'}</span></div>
          </div>

          {/* Document images — front and back side by side */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Uploaded Documents</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                  <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px]">1</span>
                  Front
                </p>
                {user.kycDocumentFront ? (
                  <img
                    src={user.kycDocumentFront}
                    alt="Document front"
                    className="w-full rounded-lg border-2 border-border"
                  />
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-12 border-2 border-dashed border-border rounded-lg">
                    No front photo
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                  <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px]">2</span>
                  Back
                </p>
                {user.kycDocumentBack ? (
                  <img
                    src={user.kycDocumentBack}
                    alt="Document back"
                    className="w-full rounded-lg border-2 border-border"
                  />
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-12 border-2 border-dashed border-border rounded-lg">
                    No back photo
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rejection reason (if rejected previously) */}
          {isRejected && user.kycRejectionReason && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Rejection Reason:</p>
              <p className="text-sm text-muted-foreground">{user.kycRejectionReason}</p>
            </div>
          )}

          {/* Approve / Reject actions */}
          {!isApproved && (
            <div className="border-t border-border pt-4 space-y-3">
              {!rejectMode ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onClose}
                    disabled={processing}
                  >
                    Close
                  </Button>
                  {isPending || isRejected ? (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                        onClick={() => setRejectMode(true)}
                        disabled={processing}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      <Button
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                        onClick={handleApprove}
                        disabled={processing}
                      >
                        {processing ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        Approve
                      </Button>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Reason for rejection</label>
                    <Textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="e.g. Document photo is blurry, please retake with better lighting"
                      rows={3}
                      className="mt-1 text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setRejectMode(false); setRejectReason('') }}
                      disabled={processing}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                      onClick={handleReject}
                      disabled={processing || !rejectReason.trim()}
                    >
                      {processing ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                      Confirm Rejection
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions for APPROVED users — can unapprove (revoke) */}
          {isApproved && (
            <div className="border-t border-border pt-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                  disabled={processing}
                >
                  Close
                </Button>
                {user.kycLevel < 2 && (
                  <Button
                    variant="outline"
                    className="flex-1 border-green-500 text-green-500 hover:bg-green-500/10"
                    onClick={() => {
                      setProcessing(true)
                      fetch('/api/admin/users/action', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id, action: 'verifyKyc', level: 2 }),
                      }).then(r => r.json()).then(d => {
                        if (d.error) throw new Error(d.error)
                        toast({ title: 'Upgraded', description: `${user.name} is now Level 2 verified` })
                        onClose()
                      }).catch(e => {
                        toast({ title: 'Failed', description: e.message, variant: 'destructive' })
                      }).finally(() => setProcessing(false))
                    }}
                    disabled={processing}
                  >
                    <Star className="h-4 w-4 mr-1" /> Upgrade to L2
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1 border-orange-500 text-orange-500 hover:bg-orange-500/10"
                  onClick={handleUnapprove}
                  disabled={processing}
                >
                  {processing ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <ShieldAlert className="h-4 w-4 mr-1" />}
                  Unapprove
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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

// =================== PAYMENT REVIEW TAB ===================
function PaymentReviewTab() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW')
  const [reviewDialog, setReviewDialog] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/p2p-review?status=${statusFilter}`)
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setOrders(d.orders || [])
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, toast])

  useEffect(() => { load() }, [load])

  const act = async (orderId: string, action: string) => {
    try {
      const res = await fetch('/api/admin/p2p-review/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast({ title: 'Action completed', description: d.message })
      setReviewDialog(null)
      load()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING_REVIEW">⏳ Pending Review</SelectItem>
            <SelectItem value="PAID">✅ Verified (Paid)</SelectItem>
            <SelectItem value="CANCELED">❌ Rejected/Canceled</SelectItem>
            <SelectItem value="COMPLETED">✓ Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
        {statusFilter === 'PENDING_REVIEW' && orders.length > 0 && (
          <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 ml-auto">
            {orders.length} pending
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No orders with status "{statusFilter}"</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(o => (
            <div key={o.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Left: order info */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className={
                      o.status === 'PENDING_REVIEW' ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' :
                      o.status === 'PAID' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                      o.status === 'CANCELED' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                      'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    }>{o.status}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Buyer:</span>
                      <div className="font-medium">{o.buyer.name}</div>
                      <div className="text-xs text-muted-foreground">{o.buyer.email}</div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Seller:</span>
                      <div className="font-medium">{o.seller.name}</div>
                      <div className="text-xs text-muted-foreground">{o.seller.email}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Trade:</span>{' '}
                      <span className="font-medium">{formatQty(o.amount)} {o.asset}</span>
                      {' '}for{' '}
                      <span className="font-medium tabular-nums">{formatPrice(o.total)} {o.fiatCurrency}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Method:</span>{' '}
                      <span className="font-medium">{o.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                {/* Right: screenshot thumbnail + actions */}
                <div className="flex flex-col items-end gap-2">
                  {o.paymentScreenshot ? (
                    <img
                      src={o.paymentScreenshot}
                      alt="Payment proof"
                      className="w-32 h-20 object-cover rounded-lg border-2 border-border cursor-pointer hover:border-primary"
                      onClick={() => setReviewDialog(o)}
                    />
                  ) : (
                    <div className="w-32 h-20 flex items-center justify-center border-2 border-dashed border-border rounded-lg text-xs text-muted-foreground">
                      No screenshot
                    </div>
                  )}
                  {o.status === 'PENDING_REVIEW' && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white"
                        onClick={() => act(o.id, 'approve')}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-red-500 text-red-500 hover:bg-red-500/10"
                        onClick={() => act(o.id, 'reject')}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setReviewDialog(o)}
                  >
                    <FileText className="h-3 w-3 mr-1" /> View Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review dialog with full screenshot */}
      {reviewDialog && (
        <Dialog open onOpenChange={() => setReviewDialog(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Payment Review — {reviewDialog.buyer.name}
              </DialogTitle>
              <DialogDescription>
                Order #{reviewDialog.id.slice(-8).toUpperCase()} · {formatDateTime(reviewDialog.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Order details */}
              <div className="bg-muted/30 rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Buyer:</span> <span className="font-medium">{reviewDialog.buyer.name}</span></div>
                <div><span className="text-muted-foreground">Seller:</span> <span className="font-medium">{reviewDialog.seller.name}</span></div>
                <div><span className="text-muted-foreground">Asset:</span> <span className="font-medium">{formatQty(reviewDialog.amount)} {reviewDialog.asset}</span></div>
                <div><span className="text-muted-foreground">Total:</span> <span className="font-medium tabular-nums">{formatPrice(reviewDialog.total)} {reviewDialog.fiatCurrency}</span></div>
                <div><span className="text-muted-foreground">Payment Method:</span> <span className="font-medium">{reviewDialog.paymentMethod}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{reviewDialog.status}</span></div>
              </div>

              {/* Payment screenshot */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Payment Screenshot</p>
                {reviewDialog.paymentScreenshot ? (
                  <img
                    src={reviewDialog.paymentScreenshot}
                    alt="Payment proof"
                    className="w-full rounded-lg border-2 border-border"
                  />
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-lg text-muted-foreground text-sm">
                    No screenshot uploaded
                  </div>
                )}
              </div>

              {/* Actions */}
              {reviewDialog.status === 'PENDING_REVIEW' && (
                <div className="flex gap-2 border-t border-border pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setReviewDialog(null)}>
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                    onClick={() => act(reviewDialog.id, 'reject')}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject Payment
                  </Button>
                  <Button
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => act(reviewDialog.id, 'approve')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve Payment
                  </Button>
                </div>
              )}

              {reviewDialog.status !== 'PENDING_REVIEW' && (
                <Button variant="outline" className="w-full" onClick={() => setReviewDialog(null)}>Close</Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
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

// =================== ADMIN NOTIFICATIONS ===================
function AdminNotifications() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [highCount, setHighCount] = useState(0)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications')
      const d = await res.json()
      if (d.error) return
      setNotifications(d.notifications || [])
      setHighCount(d.highPriorityCount || 0)
    } catch {}
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [load])

  const formatTimeAgo = (time: string) => {
    const diff = Date.now() - new Date(time).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
    return Math.floor(diff / 86400000) + 'd ago'
  }

  const iconForType = (type: string) => {
    switch (type) {
      case 'payment': return <Clock className="h-4 w-4 text-orange-500" />
      case 'kyc': return <ShieldCheck className="h-4 w-4 text-blue-500" />
      case 'user': return <Users className="h-4 w-4 text-green-500" />
      case 'trade': return <TrendingUp className="h-4 w-4 text-purple-500" />
      default: return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => { setOpen(!open); if (!open) load() }}
      >
        <Bell className="h-5 w-5" />
        {highCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {highCount > 9 ? '9+' : highCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-lg shadow-xl z-50">
            <div className="sticky top-0 bg-card border-b border-border px-3 py-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Notifications</span>
              {highCount > 0 && (
                <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 text-[10px]">
                  {highCount} urgent
                </Badge>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={'p-3 hover:bg-muted/30 transition cursor-pointer ' + (n.priority === 'high' ? 'bg-red-500/5' : '')}
                    onClick={() => setOpen(false)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {iconForType(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium">{n.title}</span>
                          {n.priority === 'high' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{formatTimeAgo(n.time)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="sticky bottom-0 bg-card border-t border-border p-2">
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => load()}>
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// =================== SEND NOTIFICATION (Admin → User) ===================
function SendNotificationButton() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<'all' | 'user'>('all')
  const [selectedUser, setSelectedUser] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('info')
  const [sending, setSending] = useState(false)

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users?limit=100')
      const d = await res.json()
      setUsers((d.users || []).filter((u: any) => !u.isAdmin))
    } catch {}
  }

  useEffect(() => {
    if (open) loadUsers()
  }, [open])

  const send = async () => {
    if (!title || !message) {
      toast({ title: 'Title and message required', variant: 'destructive' })
      return
    }
    if (target === 'user' && !selectedUser) {
      toast({ title: 'Select a user', variant: 'destructive' })
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/admin/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: target === 'user' ? selectedUser : null,
          title,
          message,
          type,
        }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast({ title: 'Notification sent!', description: d.message })
      setOpen(false)
      setTitle(''); setMessage(''); setSelectedUser(''); setTarget('all'); setType('info')
    } catch (e: any) {
      toast({ title: 'Failed to send', description: e.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        title="Send notification to users"
        onClick={() => setOpen(true)}
      >
        <Send className="h-5 w-5" />
      </Button>

      {open && (
        <Dialog open onOpenChange={() => setOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" /> Send Notification
              </DialogTitle>
              <DialogDescription>
                Send a message notification to users. They will see it in their notification bell.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {/* Target */}
              <div className="flex gap-2">
                <Button
                  variant={target === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setTarget('all')}
                >
                  All Users (Broadcast)
                </Button>
                <Button
                  variant={target === 'user' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setTarget('user')}
                >
                  Specific User
                </Button>
              </div>

              {target === 'user' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Select User</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a user" /></SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Type */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notification Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ℹ️ Info (blue)</SelectItem>
                    <SelectItem value="success">✅ Success (green)</SelectItem>
                    <SelectItem value="warning">⚠️ Warning (yellow)</SelectItem>
                    <SelectItem value="announcement">📢 Announcement (purple)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Title</label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. System Maintenance"
                  className="mt-1"
                  maxLength={100}
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Message</label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your message to the user(s)..."
                  rows={4}
                  className="mt-1 text-sm"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">{message.length}/500 characters</p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  onClick={send}
                  disabled={sending || !title || !message || (target === 'user' && !selectedUser)}
                >
                  {sending ? 'Sending...' : 'Send Notification'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
