'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Headphones, Image as ImageIcon, Mic, Video, Play, Pause, X, Square,
  ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Lock, User, Copy,
} from 'lucide-react'
import { BackButton } from '@/components/back-button'
import {
  formatPrice, formatQty, formatUsd, formatCompact, formatDateTime, formatPercent,
} from '@/lib/utils'
import {
  ComposedChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts'

type Tab = 'dashboard' | 'users' | 'user-details' | 'pairs' | 'p2p' | 'payment-review' | 'support' | 'transactions' | 'dw-approvals' | 'orders' | 'notifications' | 'settings'

export function AdminView() {
  const { user, setView } = useAppStore()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [counts, setCounts] = useState({ kyc: 0, payments: 0, dw: 0 })

  useEffect(() => {
    const loadCounts = async () => {
      // Use Promise.allSettled so a single failed request doesn't break the others
      const [notifRes, payRes, dwRes] = await Promise.allSettled([
        fetch('/api/admin/notifications'),
        fetch('/api/admin/p2p-review?status=PENDING_REVIEW'),
        fetch('/api/admin/transactions?status=pending'),
      ])

      const safeJson = async (result: PromiseSettledResult<Response>) => {
        if (result.status !== 'fulfilled') return {}
        const res = result.value
        try {
          const text = await res.text()
          if (!text) return {}
          return JSON.parse(text)
        } catch {
          return {}
        }
      }

      const notifData = await safeJson(notifRes)
      const payData = await safeJson(payRes)
      const dwData = await safeJson(dwRes)

      setCounts({
        kyc: notifData?.highPriorityCount || 0,
        payments: payData?.orders?.length || 0,
        dw: dwData?.transactions?.length || 0,
      })
    }
    loadCounts() // Load once on mount — manual refresh only
  }, [])

  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShieldAlert className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Manager Access Required</h2>
        <p className="text-sm text-muted-foreground mb-6">
          You don't have permission to view this page. Only authorized managers can access the control panel.
        </p>
        <Button onClick={() => setView('home')}>Back to Home</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 max-w-7xl w-full">
      <BackButton to="home" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 mt-1">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Control Panel
          </h1>
          <p className="text-sm text-muted-foreground">
            Logged in as <span className="font-medium text-foreground">{user.name}</span> ({user.email})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AdminNotifications />
          <Badge variant="default" className="bg-red-500/15 text-red-600 dark:text-red-400">
            <Shield className="h-3 w-3 mr-1" /> MANAGER
          </Badge>
        </div>
      </div>

      {/* Tile-based dashboard navigation — big colorful cards, vertical sections */}
      <div className="mb-6 space-y-5">
        {/* Overview section */}
        <NavSection title="Overview" icon={<BarChart3 className="h-4 w-4" />}>
          <NavTile active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={<BarChart3 className="h-5 w-5" />} label="Dashboard" desc="Stats & charts" color="purple" />
        </NavSection>

        {/* User Management section */}
        <NavSection title="User Management" icon={<Users className="h-4 w-4" />}>
          <NavTile active={tab === 'users'} onClick={() => setTab('users')} icon={<Users className="h-5 w-5" />} label="Users" desc="All accounts" badge={counts.kyc} color="blue" />
          <NavTile active={tab === 'user-details'} onClick={() => setTab('user-details')} icon={<Search className="h-5 w-5" />} label="User Details" desc="Search & inspect" color="blue" />
        </NavSection>

        {/* Trading section */}
        <NavSection title="Trading" icon={<TrendingUp className="h-4 w-4" />}>
          <NavTile active={tab === 'pairs'} onClick={() => setTab('pairs')} icon={<TrendingUp className="h-5 w-5" />} label="Pairs" desc="Trading pairs" color="green" />
          <NavTile active={tab === 'orders'} onClick={() => setTab('orders')} icon={<Activity className="h-5 w-5" />} label="Orders" desc="Open orders" color="green" />
          <NavTile active={tab === 'transactions'} onClick={() => setTab('transactions')} icon={<DollarSign className="h-5 w-5" />} label="Transactions" desc="All tx history" color="green" />
        </NavSection>

        {/* P2P & Approvals section */}
        <NavSection title="P2P & Approvals" icon={<Shield className="h-4 w-4" />}>
          <NavTile active={tab === 'p2p'} onClick={() => setTab('p2p')} icon={<Shield className="h-5 w-5" />} label="P2P Ads" desc="Listings" color="amber" />
          <NavTile active={tab === 'payment-review'} onClick={() => setTab('payment-review')} icon={<Clock className="h-5 w-5" />} label="P2P Approvals" desc="Pending reviews" badge={counts.payments} color="amber" />
          <NavTile active={tab === 'dw-approvals'} onClick={() => setTab('dw-approvals')} icon={<ArrowDownToLine className="h-5 w-5" />} label="D/W Approvals" desc="Deposit / Withdraw" badge={counts.dw} color="amber" />
        </NavSection>

        {/* Communication section */}
        <NavSection title="Communication" icon={<Send className="h-4 w-4" />}>
          <NavTile active={tab === 'notifications'} onClick={() => setTab('notifications')} icon={<Send className="h-5 w-5" />} label="Notifications" desc="Broadcast" color="pink" />
          <NavTile active={tab === 'support'} onClick={() => setTab('support')} icon={<Headphones className="h-5 w-5" />} label="Support" desc="Live chat" color="pink" />
        </NavSection>

        {/* System section */}
        <NavSection title="System" icon={<Settings className="h-4 w-4" />}>
          <NavTile active={tab === 'settings'} onClick={() => setTab('settings')} icon={<Settings className="h-5 w-5" />} label="Settings" desc="Platform config" color="red" />
        </NavSection>
      </div>

      <div style={{ display: tab === 'dashboard' ? 'block' : 'none' }}>
        <DashboardTab />
      </div>
      <div style={{ display: tab === 'users' ? 'block' : 'none' }}>
        <UsersTab />
      </div>
      <div style={{ display: tab === 'user-details' ? 'block' : 'none' }}>
        <UserDetailsTab />
      </div>
      <div style={{ display: tab === 'pairs' ? 'block' : 'none' }}>
        <PairsTab />
      </div>
      <div style={{ display: tab === 'p2p' ? 'block' : 'none' }}>
        <P2PTab />
      </div>
      <div style={{ display: tab === 'payment-review' ? 'block' : 'none' }}>
        <PaymentReviewTab />
      </div>
      <div style={{ display: tab === 'dw-approvals' ? 'block' : 'none' }}>
        <DepositWithdrawApprovalsTab />
      </div>
      <div style={{ display: tab === 'orders' ? 'block' : 'none' }}>
        <OrdersTab />
      </div>
      <div style={{ display: tab === 'transactions' ? 'block' : 'none' }}>
        <TransactionsTab />
      </div>
      <div style={{ display: tab === 'notifications' ? 'block' : 'none' }}>
        <NotificationsTab />
      </div>
      <div style={{ display: tab === 'support' ? 'block' : 'none' }}>
        <SupportTab />
      </div>
      <div style={{ display: tab === 'settings' ? 'block' : 'none' }}>
        <SettingsTab />
      </div>
    </div>
  )
}

// Navigation section — vertical title + grid of big tiles
function NavSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-0.5">
        <span className="text-xs font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
          <span className="text-primary">{icon}</span>
          {title}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-primary/40 via-border/40 to-transparent" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {children}
      </div>
    </div>
  )
}

// Big colorful tile button — looks like dashboard cards, NOT horizontal pills
const TILE_COLORS: Record<string, {
  bg: string; border: string; iconBg: string; iconColor: string; activeBg: string; glow: string
}> = {
  purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', iconBg: 'bg-purple-500/30', iconColor: 'text-purple-600 dark:text-purple-400', activeBg: 'bg-purple-500/40', glow: 'glow-card-purple' },
  blue:   { bg: 'bg-blue-500/20',   border: 'border-blue-500/50',   iconBg: 'bg-blue-500/30',   iconColor: 'text-blue-600 dark:text-blue-400',   activeBg: 'bg-blue-500/40',   glow: 'glow-card-blue' },
  green:  { bg: 'bg-green-500/20',  border: 'border-green-500/50',  iconBg: 'bg-green-500/30',  iconColor: 'text-green-600 dark:text-green-400',  activeBg: 'bg-green-500/40',  glow: 'glow-card-green' },
  amber:  { bg: 'bg-amber-500/20',  border: 'border-amber-500/50',  iconBg: 'bg-amber-500/30',  iconColor: 'text-amber-600 dark:text-amber-400',  activeBg: 'bg-amber-500/40',  glow: 'glow-card-amber' },
  red:    { bg: 'bg-red-500/20',    border: 'border-red-500/50',    iconBg: 'bg-red-500/30',    iconColor: 'text-red-600 dark:text-red-400',     activeBg: 'bg-red-500/40',    glow: 'glow-card-red' },
  pink:   { bg: 'bg-pink-500/20',   border: 'border-pink-500/50',   iconBg: 'bg-pink-500/30',   iconColor: 'text-pink-600 dark:text-pink-400',   activeBg: 'bg-pink-500/40',   glow: 'glow-card-pink' },
}

function NavTile({
  active, onClick, icon, label, desc, badge, color = 'blue',
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  desc: string
  badge?: number
  color?: keyof typeof TILE_COLORS | string
}) {
  const c = TILE_COLORS[color] || TILE_COLORS.blue
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left rounded-xl p-4 border-2 transition-all duration-200 ${c.bg} ${c.border} ${active ? `${c.activeBg} ${c.glow} scale-[1.02]` : 'hover:scale-[1.02] hover:' + c.activeBg}`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.iconBg} ${c.iconColor}`}>
          {icon}
        </span>
        {badge !== undefined && badge > 0 && (
          <span className="text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[20px] h-[20px] px-1.5 flex items-center justify-center notif-badge-pulse">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <div className="font-bold text-sm mb-0.5">{label}</div>
      <div className="text-[11px] text-muted-foreground">{desc}</div>
      {active && (
        <div className="absolute top-2 right-2">
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/80">
            Active
          </span>
        </div>
      )}
    </button>
  )
}

// =================== DASHBOARD TAB ===================
function DashboardTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    // Manual refresh button should feel instant — show cached data immediately, then update
    const cached = sessionStorage.getItem('admin-stats')
    if (cached && !data) {
      try { setData(JSON.parse(cached)) } catch {}
    }
    try {
      const res = await fetch('/api/admin/stats')
      // Handle empty response body (happens when function cold-starts or times out)
      const text = await res.text()
      if (!text) {
        // Empty response — keep existing data, don't overwrite with an error
        if (!data) setError('Server returned empty response. Tap Refresh to try again.')
        return
      }
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      setData(d)
      setError(null)
      sessionStorage.setItem('admin-stats', JSON.stringify(d))
    } catch (e: any) {
      console.error('[admin dashboard]', e)
      // Only set error if we don't have any data yet — otherwise keep showing the cached data
      if (!data) setError(e.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [data])

  useEffect(() => {
    load() // Load once on mount — manual refresh only (tap Refresh button)
  }, [load])

  if (!data) {
    return <div className="text-center py-12 text-muted-foreground">Loading dashboard...</div>
  }

  if (error && !data) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-3" />
        <p className="text-sm text-muted-foreground mb-2">Failed to load dashboard</p>
        <p className="text-xs text-muted-foreground mb-4">{error}</p>
        <Button onClick={load} size="sm">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    )
  }

  if (!data) return null

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
          sub={`${s.users.admins} managers`}
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
  // Pick BOLD color variant — colored background + glow
  const colorKey =
    color?.includes('blue') ? 'blue' :
    color?.includes('green') ? 'green' :
    color?.includes('yellow') ? 'amber' :
    color?.includes('orange') ? 'amber' :
    color?.includes('red') ? 'red' :
    color?.includes('purple') ? 'purple' :
    'blue'
  const c = TILE_COLORS[colorKey] || TILE_COLORS.blue

  return (
    <div className={`rounded-xl p-4 border-2 ${c.bg} ${c.border} ${c.glow} transition-all duration-200 hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.iconBg} ${c.iconColor}`}>
          {icon}
        </span>
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  )
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-muted/30 rounded-xl p-3 text-center glow-card border border-primary/20">
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
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [kycFilter, setKycFilter] = useState('all')
  const [walletDialog, setWalletDialog] = useState<any>(null)
  const [banDialog, setBanDialog] = useState<any>(null)
  const [docDialog, setDocDialog] = useState<any>(null)

  const load = useCallback(async () => {
    // Only show loading spinner on the FIRST load (not on every refresh tap)
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (kycFilter !== 'all') params.set('kyc', kycFilter)
      const res = await fetch(`/api/admin/users?${params}`)
      // Handle empty response body
      const text = await res.text()
      if (!text) {
        toast({ title: 'Failed to load users', description: 'Server returned empty response. Tap Refresh to try again.', variant: 'destructive' })
        return
      }
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      setUsers(d.users || [])
      setTotal(d.total || 0)
    } catch (e: any) {
      const errorMsg = e?.name === 'AbortError'
        ? 'Request timed out. Tap Refresh to try again.'
        : (e.message || 'Network error')
      toast({ title: 'Failed to load users', description: errorMsg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, kycFilter, toast])

  useEffect(() => {
    load() // Load once on mount — manual refresh only (tap Refresh button)
  }, [load])

  const [acting, setActing] = useState(false)
  const act = async (userId: string, action: string, payload?: any) => {
    if (acting) return // Prevent duplicate actions
    setActing(true)
    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, ...payload }),
      })
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      toast({ title: 'Action completed', description: d.message })
      load()
    } catch (e: any) {
      toast({ title: 'Action failed', description: e.message, variant: 'destructive' })
    } finally {
      setActing(false)
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
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Refresh
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
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground"></td></tr>
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
                        {(u.kycStatus === 'PENDING' || u.kycStatus === 'APPROVED' || u.kycStatus === 'REJECTED') && (
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
  const [fullUser, setFullUser] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(true)

  // Fetch full user details (including KYC document images) when dialog opens
  // The list query doesn't include images (too large), so we fetch them on demand
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/admin/users/details?userId=${user.id}`)
        const text = await res.text()
        if (text) {
          const d = JSON.parse(text)
          if (!d.error) setFullUser(d.user)
        }
      } catch (e) {
        console.error('[doc dialog] failed to fetch user details:', e)
      } finally {
        setLoadingDetails(false)
      }
    }
    fetchDetails()
  }, [user.id])

  // Use fullUser (with documents) if available, otherwise fall back to the list user
  const u = fullUser || user

  const handleApprove = async () => {
    if (processing) return // Prevent duplicate approvals
    setProcessing(true)
    try {
      const res = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: 'verifyKyc', level: 1 }),
      })
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      toast({ title: 'KYC Approved', description: `${user.name} is now verified (Level 1). ${d.message?.includes('bonus') ? '10 USDT welcome bonus credited!' : ''}` })
      onClose()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (processing) return // Prevent duplicate rejections
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
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
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
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      toast({ title: 'Verification Revoked', description: `${user.name} is now unverified` })
      onClose()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const isPending = u.kycStatus === 'PENDING'
  const isApproved = u.kycStatus === 'APPROVED'
  const isRejected = u.kycStatus === 'REJECTED'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            KYC Review — {u.name}
          </DialogTitle>
          <DialogDescription>
            {u.email} · Submitted {u.kycSubmittedAt ? formatDateTime(u.kycSubmittedAt) : 'N/A'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            {isApproved && <Badge className="bg-green-500/15 text-green-600 dark:text-green-400"><CheckCircle2 className="h-3 w-3 mr-1" />Approved (L{u.kycLevel})</Badge>}
            {isPending && <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>}
            {isRejected && <Badge className="bg-red-500/15 text-red-600 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>}
            {u.kycStatus === 'NONE' && <Badge variant="secondary">Not Submitted</Badge>}
          </div>

          {/* KYC info */}
          <div className="bg-muted/30 rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Full Name:</span> <span className="font-medium">{u.kycFullName || 'N/A'}</span></div>
            <div><span className="text-muted-foreground">ID Type:</span> <span className="font-medium">{u.kycIdType || 'N/A'}</span></div>
          </div>

          {/* Document images — front and back side by side */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Uploaded Documents</p>
            {loadingDetails ? (
              <div className="text-center py-12 text-muted-foreground">
                <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2" />
                Loading documents...
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                  <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px]">1</span>
                  Front
                </p>
                {u.kycDocumentFront ? (
                  <img
                    src={u.kycDocumentFront}
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
                {u.kycDocumentBack ? (
                  <img
                    src={u.kycDocumentBack}
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
            )}
          </div>

          {/* Rejection reason (if rejected previously) */}
          {isRejected && u.kycRejectionReason && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Rejection Reason:</p>
              <p className="text-sm text-muted-foreground">{u.kycRejectionReason}</p>
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
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
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
            This action will be logged as a manager transaction visible to the user.
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
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [addDialog, setAddDialog] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/pairs')
      const text = await res.text()
      if (!text) return
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      setPairs(d.pairs || [])
    } catch (e: any) {
      toast({ title: 'Failed to load pairs', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load() // Load once on mount — manual refresh only (tap Refresh button)
  }, [load])

  const toggleActive = async (pair: any) => {
    try {
      const res = await fetch('/api/admin/pairs/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairId: pair.id, action: 'update', isActive: !pair.isActive }),
      })
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
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
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
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
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground"></td></tr>
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

  const ASSET_NAMES: Record<string, string> = {
    BTC: 'Bitcoin', ETH: 'Ethereum', USDT: 'Tether', USDC: 'USD Coin',
    BNB: 'BNB', SOL: 'Solana', XRP: 'XRP', ADA: 'Cardano',
    DOGE: 'Dogecoin', AVAX: 'Avalanche', LINK: 'Chainlink', DOT: 'Polkadot',
    MATIC: 'Polygon', LTC: 'Litecoin', ETB: 'Ethiopian Birr',
  }

  const submit = async () => {
    setLoading(true)
    try {
      const symbol = `${baseAsset}${quoteAsset}`
      const res = await fetch('/api/admin/pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          baseAsset,
          quoteAsset,
          lastPrice: parseFloat(lastPrice),
          baseAssetName: ASSET_NAMES[baseAsset] || baseAsset,
          quoteAssetName: ASSET_NAMES[quoteAsset] || quoteAsset,
        }),
      })
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
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
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editDialog, setEditDialog] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/listings?status=${statusFilter}`)
      const text = await res.text()
      if (!text) return
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      setListings(d.listings || [])
    } catch (e: any) {
      toast({ title: 'Failed to load listings', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, toast])

  useEffect(() => {
    load() // Load once on mount — manual refresh only (tap Refresh button)
  }, [load])

  const [acting, setActing] = useState(false)
  const act = async (listingId: string, action: string) => {
    if (acting) return // Prevent duplicate actions
    setActing(true)
    try {
      const res = await fetch('/api/admin/listings/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, action }),
      })
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      toast({ title: 'Action completed', description: d.message })
      load()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    } finally {
      setActing(false)
    }
  }

  // Filter listings by advertiser name (from paymentDetails) or user.name
  const filtered = listings.filter(l => {
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    const firstMethod = l.paymentMethods?.[0]
    const advName = l.paymentDetails?.[firstMethod]?.name || l.user?.name || ''
    return (
      advName.toLowerCase().includes(q) ||
      (l.user?.name || '').toLowerCase().includes(q) ||
      (l.user?.email || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
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
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by advertiser name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Refresh
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add New Ad
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        Showing {filtered.length} of {listings.length} listings
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
                <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Methods / Account</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground"></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No listings</td></tr>
              ) : filtered.map(l => {
                const firstMethod = l.paymentMethods?.[0]
                const detail = l.paymentDetails?.[firstMethod]
                const advertiserName = detail?.name || l.user?.name || 'Unknown'
                const accountInfo = detail?.phone || detail?.account || detail?.address || detail?.email || detail?.iban || ''
                return (
                  <tr key={l.id} className="border-t border-border/40 hover:bg-muted/30">
                    <td className="px-3 py-3">
                      <div className="font-medium text-xs flex items-center gap-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-medium flex-shrink-0">
                          {advertiserName.slice(0, 2).toUpperCase()}
                        </div>
                        <span>{advertiserName}</span>
                        {l.tradesCount != null && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
                            {(l.rating || 0).toFixed(1)} · {l.tradesCount} trades
                          </span>
                        )}
                      </div>
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
                      <div className="flex flex-wrap gap-1 mb-1">
                        {l.paymentMethods.slice(0, 2).map((m: string) => (
                          <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
                        ))}
                        {l.paymentMethods.length > 2 && <span className="text-[10px]">+{l.paymentMethods.length - 2}</span>}
                      </div>
                      {accountInfo && (
                        <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[160px]" title={accountInfo}>
                          {accountInfo}
                        </div>
                      )}
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
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-500" title="Edit listing"
                          onClick={() => setEditDialog(l)}>
                          <Edit3 className="h-3 w-3" />
                        </Button>
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
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen && (
        <CreateListingDialog onClose={() => setCreateOpen(false)} onSuccess={load} />
      )}
      {editDialog && (
        <EditListingDialog listing={editDialog} onClose={() => setEditDialog(null)} onSuccess={load} />
      )}
    </div>
  )
}

// =================== EDIT LISTING DIALOG ===================
function EditListingDialog({ listing, onClose, onSuccess }: { listing: any; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast()
  const firstMethod = listing.paymentMethods?.[0] || ''
  const existingDetail = listing.paymentDetails?.[firstMethod] || {}

  const [price, setPrice] = useState(String(listing.price || ''))
  const [minOrder, setMinOrder] = useState(String(listing.minOrder ?? ''))
  const [maxOrder, setMaxOrder] = useState(String(listing.maxOrder ?? ''))
  const [tradesCount, setTradesCount] = useState(String(listing.tradesCount ?? 0))
  const [rating, setRating] = useState(String(listing.rating ?? 4.9))
  const [advertiserName, setAdvertiserName] = useState(existingDetail.name || listing.user?.name || '')
  const [accountNumber, setAccountNumber] = useState(
    existingDetail.phone || existingDetail.account || existingDetail.address || existingDetail.email || ''
  )
  const [terms, setTerms] = useState(listing.terms || '')
  const [loading, setLoading] = useState(false)

  const accountLabel = ['TRC20', 'BEP20', 'ERC20', 'SOL', 'MATIC', 'ARB', 'OP', 'AVAX', 'BNB'].includes(firstMethod)
    ? 'Wallet Address'
    : 'Account Number / Phone'

  const submit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/listings/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          action: 'edit',
          price: parseFloat(price) || 0,
          minOrder: parseFloat(minOrder) || 0,
          maxOrder: parseFloat(maxOrder) || 0,
          tradesCount: parseInt(tradesCount) || 0,
          rating: parseFloat(rating) || 0,
          advertiserName: advertiserName.trim(),
          accountNumber: accountNumber.trim(),
          terms: terms.trim(),
        }),
      })
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      toast({ title: 'Listing updated', description: d.message })
      onSuccess()
      onClose()
    } catch (e: any) {
      toast({ title: 'Failed to update', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-blue-500" /> Edit Listing
          </DialogTitle>
          <DialogDescription>
            {listing.side === 'SELL' ? 'Selling' : 'Buying'} {listing.asset} for {listing.fiatCurrency} · Method: {firstMethod}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Price ({listing.fiatCurrency})</label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="tabular-nums" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Min Order ({listing.fiatCurrency})</label>
              <Input type="number" value={minOrder} onChange={e => setMinOrder(e.target.value)} className="tabular-nums" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Max Order ({listing.fiatCurrency})</label>
              <Input type="number" value={maxOrder} onChange={e => setMaxOrder(e.target.value)} className="tabular-nums" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Trades Count</label>
              <Input type="number" value={tradesCount} onChange={e => setTradesCount(e.target.value)} className="tabular-nums" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Star Rating (0-5)</label>
            <Input type="number" step="0.1" min="0" max="5" value={rating} onChange={e => setRating(e.target.value)} className="tabular-nums" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Advertiser Name</label>
            <Input value={advertiserName} onChange={e => setAdvertiserName(e.target.value)} placeholder="e.g. Kirubel Trader" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{accountLabel}</label>
            <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder={accountLabel} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Terms (optional)</label>
            <Textarea value={terms} onChange={e => setTerms(e.target.value)} rows={2} placeholder="e.g. Release within 15 minutes." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// =================== CREATE LISTING DIALOG ===================
// P2P ad types:
// SELL ad = admin is SELLING USDT → buyer pays via FIAT (banks, mobile money)
// BUY ad  = admin is BUYING USDT  → seller sends via CRYPTO NETWORK (TRC20, BEP20, etc.)
const SELL_PAYMENT_METHODS = [
  'Telebirr', 'CBE', 'Awash', 'Dashen', 'Hibret', 'Wegagen', 'Abay', 'Coopbank',
  'Bank of Abyssinia', 'United', 'Nib', 'Berhan', 'Enat', 'Lion', 'Oromia', 'Zemen',
]
const BUY_PAYMENT_METHODS = ['TRC20', 'BEP20', 'ERC20', 'SOL', 'MATIC', 'ARB', 'OP', 'AVAX', 'BNB']

function CreateListingDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast()
  const [side, setSide] = useState<'BUY' | 'SELL'>('SELL')
  const [asset, setAsset] = useState('USDT')
  const [fiatCurrency, setFiatCurrency] = useState('ETB')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [minOrder, setMinOrder] = useState('100')
  const [paymentMethod, setPaymentMethod] = useState('Telebirr')
  const [advertiserName, setAdvertiserName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [terms, setTerms] = useState('')
  const [loading, setLoading] = useState(false)

  // SELL ad → buyer pays via fiat (banks) → show SELL_PAYMENT_METHODS
  // BUY ad  → seller sends via crypto network → show BUY_PAYMENT_METHODS
  const methods = side === 'SELL' ? SELL_PAYMENT_METHODS : BUY_PAYMENT_METHODS
  const accountLabel = ['TRC20', 'BEP20', 'ERC20', 'SOL', 'MATIC', 'ARB', 'OP', 'AVAX', 'BNB'].includes(paymentMethod)
    ? 'Wallet Address'
    : 'Account Number / Phone'

  // Reset payment method when side changes
  useEffect(() => {
    setPaymentMethod(side === 'SELL' ? SELL_PAYMENT_METHODS[0] : BUY_PAYMENT_METHODS[0])
  }, [side])

  // Auto-generate terms if empty
  const finalTerms = terms.trim() || (
    side === 'SELL'
      ? `Release crypto within 15 minutes of receiving payment via ${paymentMethod}. By trading, you agree to follow P2PEX P2P guidelines.`
      : `Send payment within 30 minutes via ${paymentMethod}. Mark payment as made after sending the funds. By trading, you agree to follow P2PEX P2P guidelines.`
  )

  const submit = async () => {
    if (!price || !amount) {
      toast({ title: 'Price and amount required', variant: 'destructive' })
      return
    }
    if (!advertiserName.trim()) {
      toast({ title: 'Advertiser name required', variant: 'destructive' })
      return
    }
    if (!accountNumber.trim()) {
      toast({ title: accountLabel + ' required', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/listings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset,
          fiatCurrency,
          side,
          price: parseFloat(price),
          amount: parseFloat(amount),
          minOrder: parseFloat(minOrder) || 0,
          maxOrder: parseFloat(price) * parseFloat(amount),
          paymentMethods: [paymentMethod],
          advertiserName: advertiserName.trim(),
          accountNumber: accountNumber.trim(),
          terms: finalTerms,
          tradesCount: 128,
          rating: 4.9,
        }),
      })
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      toast({ title: 'Ad created', description: `${side} ad for ${amount} ${asset} posted successfully` })
      onSuccess()
      onClose()
    } catch (e: any) {
      toast({ title: 'Failed to create ad', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Create P2P Advertisement
          </DialogTitle>
          <DialogDescription>
            Post a new P2P buy/sell ad as the manager
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Buy/Sell toggle */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={side === 'BUY' ? 'default' : 'outline'}
              className={side === 'BUY' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
              onClick={() => setSide('BUY')}
            >
              Buy Ad
            </Button>
            <Button
              variant={side === 'SELL' ? 'default' : 'outline'}
              className={side === 'SELL' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
              onClick={() => setSide('SELL')}
            >
              Sell Ad
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Asset</label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'SOL'].map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Fiat Currency</label>
              <Select value={fiatCurrency} onValueChange={setFiatCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['ETB', 'USD', 'EUR', 'KES', 'NGN'].map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Price per {asset} ({fiatCurrency})</label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="tabular-nums" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Total Amount ({asset})</label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="tabular-nums" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Min Order ({fiatCurrency})</label>
            <Input type="number" value={minOrder} onChange={e => setMinOrder(e.target.value)} className="tabular-nums" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Payment Method <span className="text-muted-foreground/60">(filtered by ad type)</span>
            </label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {methods.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              {side === 'SELL' ? 'Ethiopian banks / mobile money (buyer pays you in fiat)' : 'Crypto networks (seller sends you USDT)'}
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Advertiser Name</label>
            <Input value={advertiserName} onChange={e => setAdvertiserName(e.target.value)} placeholder="e.g. Kirubel Trader" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{accountLabel}</label>
            <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder={accountLabel} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Terms (optional — auto-generated if empty)</label>
            <Textarea
              value={terms}
              onChange={e => setTerms(e.target.value)}
              rows={2}
              placeholder={finalTerms}
            />
          </div>

          {/* Live summary preview */}
          <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs">
            <p className="font-semibold mb-1.5">Live Preview</p>
            <div className="grid grid-cols-2 gap-1.5">
              <div><span className="text-muted-foreground">Type:</span> <span className={side === 'BUY' ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>{side}</span></div>
              <div><span className="text-muted-foreground">Asset:</span> <span className="font-medium">{asset}</span></div>
              <div><span className="text-muted-foreground">Price:</span> <span className="font-medium tabular-nums">{formatPrice(parseFloat(price) || 0)} {fiatCurrency}</span></div>
              <div><span className="text-muted-foreground">Total:</span> <span className="font-medium tabular-nums">{formatQty(parseFloat(amount) || 0)} {asset}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Advertiser:</span> <span className="font-medium">{advertiserName || '—'}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">{accountLabel}:</span> <span className="font-mono">{accountNumber || '—'}</span></div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={loading || !price || !amount || !advertiserName.trim() || !accountNumber.trim()}>
              {loading ? 'Creating...' : 'Create Advertisement'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}


// =================== PAYMENT REVIEW TAB ===================
function PaymentReviewTab() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW')
  const [reviewDialog, setReviewDialog] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/p2p-review?status=${statusFilter}`)
      const text = await res.text()
      if (!text) return
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      setOrders(d.orders || [])
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, toast])

  useEffect(() => {
    load() // Load once on mount — manual refresh only (tap Refresh button)
  }, [load])

  const [acting, setActing] = useState(false)
  const act = async (orderId: string, action: string) => {
    if (acting) return // Prevent duplicate actions
    setActing(true)
    try {
      const res = await fetch('/api/admin/p2p-review/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action }),
      })
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      toast({ title: 'Action completed', description: d.message })
      setReviewDialog(null)
      load()
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' })
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING_REVIEW">⏳ Pending Review</SelectItem>
            <SelectItem value="PAYMENT_RECEIVED">✅ Payment Received</SelectItem>
            <SelectItem value="PAID">✅ Paid</SelectItem>
            <SelectItem value="COMPLETED">✓ Completed</SelectItem>
            <SelectItem value="CANCELED">❌ Canceled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Refresh
        </Button>
        {statusFilter === 'PENDING_REVIEW' && orders.length > 0 && (
          <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 ml-auto">
            {orders.length} pending
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-xs">No data</div>
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
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {/* BUY/SELL direction badge — green for BUY (user buying crypto), blue for SELL (user selling crypto) */}
                    {o.tradeDirection && (
                      <Badge className={
                        o.tradeDirection === 'BUY'
                          ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      }>
                        {o.tradeDirection === 'BUY' ? '↓ BUY' : '↑ SELL'}
                      </Badge>
                    )}
                    <Badge variant="secondary" className={
                      o.status === 'PENDING_REVIEW' ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' :
                      o.status === 'PAYMENT_RECEIVED' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                      o.status === 'PAID' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                      o.status === 'CANCELED' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                      'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    }>{o.status}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {/* BUYER — full real details (name, userId, username, email, KYC level) */}
                    <div className="bg-muted/30 rounded-lg p-2 border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Buyer (pays fiat)</span>
                      <div className="font-medium text-sm mt-0.5">{o.buyer.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 space-y-0.5">
                        {o.buyer.userId && <div>ID: <span className="font-mono">{o.buyer.userId}</span></div>}
                        {o.buyer.username && <div>@{o.buyer.username}</div>}
                        <div className="truncate">{o.buyer.email}</div>
                        {o.buyer.kycVerified && (
                          <div className="inline-flex items-center gap-0.5 text-green-600 dark:text-green-400">
                            <ShieldCheck className="h-2.5 w-2.5" /> KYC L{o.buyer.kycLevel || 0}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* SELLER — full real details */}
                    <div className="bg-muted/30 rounded-lg p-2 border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Seller (sends crypto)</span>
                      <div className="font-medium text-sm mt-0.5">{o.adPersonName || o.seller.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 space-y-0.5">
                        {o.seller.userId && <div>ID: <span className="font-mono">{o.seller.userId}</span></div>}
                        {o.seller.username && <div>@{o.seller.username}</div>}
                        <div className="truncate">{o.seller.email}</div>
                        {o.seller.kycVerified && (
                          <div className="inline-flex items-center gap-0.5 text-green-600 dark:text-green-400">
                            <ShieldCheck className="h-2.5 w-2.5" /> KYC L{o.seller.kycLevel || 0}
                          </div>
                        )}
                      </div>
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
                  {/* Real payment account info (if seller provided it) */}
                  {(o.sellerAccountNumber || o.sellerAccountName) && (
                    <div className="mt-2 bg-blue-500/5 border border-blue-500/20 rounded-lg p-2 text-[11px]">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Seller's Receive Account</div>
                      <div className="grid grid-cols-2 gap-2">
                        {o.sellerAccountName && (
                          <div><span className="text-muted-foreground">Name:</span> <span className="font-mono font-medium">{o.sellerAccountName}</span></div>
                        )}
                        {o.sellerAccountNumber && (
                          <div><span className="text-muted-foreground">Account/Phone:</span> <span className="font-mono font-medium">{o.sellerAccountNumber}</span></div>
                        )}
                        {o.sellerPaymentMethod && (
                          <div><span className="text-muted-foreground">Method:</span> <span className="font-medium">{o.sellerPaymentMethod}</span></div>
                        )}
                      </div>
                    </div>
                  )}
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
                  {(o.status === 'PENDING_REVIEW' || o.status === 'PAYMENT_RECEIVED') && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white"
                        onClick={() => act(o.id, 'approve')}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {o.status === 'PAYMENT_RECEIVED' ? 'Approve & Release' : (o.sellerPaymentMethod ? 'Finish' : 'Approve')}
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
                <div><span className="text-muted-foreground">Buyer (User):</span> <span className="font-medium">{reviewDialog.buyer.name}</span></div>
                <div><span className="text-muted-foreground">Seller (Ad by):</span> <span className="font-medium">{reviewDialog.adPersonName || reviewDialog.seller.name}</span></div>
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

              {/* Seller payment details (for SELL orders — user selling USDT) */}
              {reviewDialog.sellerPaymentMethod && reviewDialog.sellerAccountNumber && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-1 text-sm">
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Seller's Payment Details (to receive fiat)</p>
                  <div><span className="text-muted-foreground">Method:</span> <span className="font-medium">{reviewDialog.sellerPaymentMethod}</span></div>
                  <div><span className="text-muted-foreground">Account Number/Phone:</span> <span className="font-mono font-bold">{reviewDialog.sellerAccountNumber}</span></div>
                  <div><span className="text-muted-foreground">Account Name:</span> <span className="font-medium">{reviewDialog.sellerAccountName}</span></div>
                </div>
              )}

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
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => act(reviewDialog.id, 'approve')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {reviewDialog.sellerPaymentMethod ? 'Finish Order' : 'Approve & Transfer'}
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
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [symbolFilter, setSymbolFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (symbolFilter !== 'all') params.set('symbol', symbolFilter)
      const res = await fetch(`/api/admin/orders?${params}`)
      const text = await res.text()
      if (!text) return
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      setOrders(d.orders || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, symbolFilter])

  useEffect(() => {
    load() // Load once on mount — manual refresh only (tap Refresh button)
  }, [load])

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
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Refresh
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
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground"></td></tr>
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
                  <td className="px-3 py-3 text-right tabular-nums hidden sm:table-cell">{o.quantity > 0 ? ((o.filledQty / o.quantity) * 100).toFixed(0) : 0}%</td>
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
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/transactions?${params}`)
      const text = await res.text()
      if (!text) return
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      setTxs(d.transactions || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter])

  useEffect(() => {
    load() // Load once on mount — manual refresh only (tap Refresh button)
  }, [load])

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
            <SelectItem value="pending">⏳ Pending</SelectItem>
            <SelectItem value="completed">✓ Completed</SelectItem>
            <SelectItem value="confirmed">✓ Confirmed</SelectItem>
            <SelectItem value="rejected">❌ Rejected</SelectItem>
            <SelectItem value="failed">❌ Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Refresh
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
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground"></td></tr>
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
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      const text = await res.text()
      if (!text) return
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      setSettings(d.settings || {})
    } catch (e: any) {
      toast({ title: 'Failed to load settings', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load() // Load once on mount — manual refresh only (tap Refresh button)
  }, [load])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
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
            description="Disables all user trading. Only managers can access the platform."
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
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<any[]>([])
  const [highCount, setHighCount] = useState(0)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications')
      const text = await res.text()
      if (!text) return
      const d = JSON.parse(text)
      if (d.error) return
      setNotifications(d.notifications || [])
      setHighCount(d.highPriorityCount || 0)
    } catch (e) {
      console.error('[admin notifications]', e)
    }
  }, [])

  useEffect(() => {
    load() // Load once on mount — manual refresh only (tap Refresh button)
  }, [load])

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch('/api/admin/notifications/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      })
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      toast({ title: '✅ Notification deleted' })
      load()
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' })
    }
  }

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
                    className={'p-3 hover:bg-muted/30 transition cursor-pointer flex items-start gap-2 ' + (n.priority === 'high' ? 'bg-red-500/5' : '')}
                    onClick={() => setOpen(false)}
                  >
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
                    <button
                      className="flex-shrink-0 p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition"
                      onClick={(e) => deleteNotification(n.id, e)}
                      title="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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

// =================== NOTIFICATIONS TAB (full tab, not dialog) ===================
function NotificationsTab() {
  const { toast } = useToast()
  const [subTab, setSubTab] = useState<'broadcast' | 'user'>('broadcast')
  const [selectedUser, setSelectedUser] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [sentNotifs, setSentNotifs] = useState<any[]>([])
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

  const loadSent = async () => {
    try {
      const res = await fetch('/api/admin/send-notification')
      const d = await res.json()
      setSentNotifs(d.notifications || [])
    } catch {}
  }

  useEffect(() => {
    loadUsers()
    loadSent()
  }, [])

  const deleteSent = async (id: string) => {
    try {
      const res = await fetch('/api/admin/notifications/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      })
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      toast({ title: '✅ Notification deleted' })
      loadSent()
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' })
    }
  }

  const send = async () => {
    if (sending) return
    if (!title || !message) {
      toast({ title: 'Title and message required', variant: 'destructive' })
      return
    }
    if (subTab === 'user' && !selectedUser) {
      toast({ title: 'Select a user', variant: 'destructive' })
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/admin/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: subTab === 'user' ? selectedUser : null,
          title,
          message,
          type,
        }),
      })
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      toast({ title: 'Notification sent!', description: d.message })
      setTitle(''); setMessage(''); setSelectedUser('')
      loadSent()
    } catch (e: any) {
      toast({ title: 'Failed to send', description: e.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const formatTimeAgo = (time: string) => {
    const diff = Date.now() - new Date(time).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
    return Math.floor(diff / 86400000) + 'd ago'
  }

  return (
    <div className="space-y-4">
      {/* Two sub-tabs */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as 'broadcast' | 'user')}>
        <TabsList className="w-full">
          <TabsTrigger value="broadcast" className="flex-1 gap-1">
            <Users className="h-3.5 w-3.5" /> Broadcast (All Users)
          </TabsTrigger>
          <TabsTrigger value="user" className="flex-1 gap-1">
            <User className="h-3.5 w-3.5" /> Specific User
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Send form */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        {subTab === 'user' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Select User</label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a user" /></SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-muted-foreground">Notification Type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="info">ℹ️ Info (blue glow)</SelectItem>
              <SelectItem value="success">✅ Success (green glow)</SelectItem>
              <SelectItem value="warning">⚠️ Warning (yellow glow)</SelectItem>
              <SelectItem value="announcement">📢 Announcement (purple glow)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Title</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. System Maintenance" className="mt-1" maxLength={100} />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Message</label>
          <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message..." rows={4} className="mt-1 text-sm" maxLength={500} />
          <p className="text-xs text-muted-foreground mt-1">{message.length}/500 characters</p>
        </div>

        <Button onClick={send} disabled={sending || !title || !message || (subTab === 'user' && !selectedUser)} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white">
          {sending ? 'Sending...' : subTab === 'broadcast' ? '📢 Send to All Users' : '📤 Send to Selected User'}
        </Button>
      </div>

      {/* Sent notifications list */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Sent Notifications ({sentNotifs.length})</h3>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={loadSent}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
        </div>

        {sentNotifs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Send className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No notifications sent yet
          </div>
        ) : (
          <div className="space-y-2">
            {sentNotifs.slice(0, 20).map(n => (
              <div key={n.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <span className={`flex-shrink-0 w-2.5 h-2.5 rounded-full mt-1 ${
                  n.type === 'success' ? 'bg-green-500' :
                  n.type === 'warning' ? 'bg-yellow-500' :
                  n.type === 'announcement' ? 'bg-purple-500' :
                  'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{n.title}</span>
                    <Badge variant="secondary" className="text-[10px]">{n.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {n.userId ? '→ specific user' : '→ all users'} · {formatTimeAgo(n.createdAt)}
                  </p>
                </div>
                <button
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition"
                  onClick={() => deleteSent(n.id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// =================== USER DETAILS TAB ===================
function UserDetailsTab() {
  const { toast } = useToast()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [details, setDetails] = useState<any>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  // Load all users on mount
  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users?limit=100')
      const text = await res.text()
      if (!text) {
        toast({ title: 'Failed to load', description: 'Server returned empty response. Tap Refresh to try again.', variant: 'destructive' })
        return
      }
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      setUsers((d.users || []).filter((u: any) => !u.isAdmin))
    } catch (e: any) {
      toast({ title: 'Failed to load users', description: e.message || 'Network error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadUsers() // Load once on mount — manual refresh only
  }, [loadUsers])

  // Filter by name, email, ID, username
  const filtered = users.filter(u => {
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.userId || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.id || '').toLowerCase().includes(q)
    )
  })

  // Load selected user details
  const loadDetails = useCallback(async (userId: string) => {
    setDetailsLoading(true)
    setDetails(null)
    try {
      const res = await fetch(`/api/admin/users/details?userId=${userId}`)
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      setDetails(d)
    } catch (e: any) {
      toast({ title: 'Failed to load user details', description: e.message, variant: 'destructive' })
    } finally {
      setDetailsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (selectedUserId) loadDetails(selectedUserId)
  }, [selectedUserId, loadDetails])

  // Render details view if a user is selected
  if (selectedUserId) {
    return (
      <div className="space-y-3">
        <Button variant="outline" size="sm" onClick={() => { setSelectedUserId(null); setDetails(null) }}>
          <ArrowUpRight className="h-3.5 w-3.5 rotate-180" /> Back to user list
        </Button>

        {detailsLoading || !details ? (
          <div className="text-center py-12 text-muted-foreground">Loading user details...</div>
        ) : (
          <UserDetailsDetails user={details.user} wallets={details.wallets} transactions={details.transactions} p2pOrders={details.p2pOrders} orders={details.orders} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 p-3 bg-card rounded-lg border border-border">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, ID, or username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadUsers}>
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Refresh
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">Showing {filtered.length} of {users.length} users</div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-y-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium">User</th>
                <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Email</th>
                <th className="px-3 py-2 text-left font-medium">ID</th>
                <th className="px-3 py-2 text-left font-medium">KYC</th>
                <th className="px-3 py-2 text-right font-medium hidden md:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground"></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No users found</td></tr>
              ) : filtered.map(u => (
                <tr
                  key={u.id}
                  className="border-t border-border/40 hover:bg-muted/30 cursor-pointer"
                  onClick={() => setSelectedUserId(u.id)}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-xs">
                          {(u.name || '?').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-sm">{u.name}</div>
                        {u.username && <div className="text-[10px] text-muted-foreground">@{u.username}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs hidden sm:table-cell">{u.email}</td>
                  <td className="px-3 py-3">
                    <Badge variant="secondary" className="text-[10px] font-mono">#{u.userId || u.id.slice(-6).toUpperCase()}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    {u.kycVerified ? (
                      <Badge className="bg-green-500/15 text-green-600 dark:text-green-400">L{u.kycLevel}</Badge>
                    ) : u.kycStatus === 'PENDING' ? (
                      <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">Pending</Badge>
                    ) : u.kycStatus === 'REJECTED' ? (
                      <Badge className="bg-red-500/15 text-red-600 dark:text-red-400">Rejected</Badge>
                    ) : (
                      <Badge variant="secondary">Unverified</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-muted-foreground hidden md:table-cell">{formatDateTime(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function UserDetailsDetails({ user, wallets, transactions, p2pOrders, orders }: {
  user: any
  wallets: any[]
  transactions: any[]
  p2pOrders: any[]
  orders: any[]
}) {
  return (
    <div className="space-y-4">
      {/* Profile card */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-start gap-4">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
              {(user.name || '?').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">User ID</p>
              <p className="font-mono text-sm">#{user.userId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Username</p>
              <p className="text-sm">@{user.username}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm break-all">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">KYC</p>
              {user.kycVerified ? (
                <Badge className="bg-green-500/15 text-green-600 dark:text-green-400">Verified L{user.kycLevel}</Badge>
              ) : user.kycStatus === 'PENDING' ? (
                <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">Pending</Badge>
              ) : user.kycStatus === 'REJECTED' ? (
                <Badge className="bg-red-500/15 text-red-600 dark:text-red-400">Rejected</Badge>
              ) : (
                <Badge variant="secondary">Unverified</Badge>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              {user.isBanned ? (
                <Badge className="bg-red-500/15 text-red-600 dark:text-red-400">Banned</Badge>
              ) : user.isActive ? (
                <Badge className="bg-green-500/15 text-green-600 dark:text-green-400">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            <div className="col-span-2 md:col-span-3">
              <p className="text-xs text-muted-foreground">Join Date</p>
              <p className="text-sm">{formatDateTime(user.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet balances grid */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Wallet className="h-4 w-4" /> Wallet Balances ({wallets.length})
        </h3>
        {wallets.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No wallets</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {wallets.map(w => (
              <div key={w.id} className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">{w.asset}</div>
                <div className="font-bold tabular-nums">{formatQty(w.balance)}</div>
                <div className="text-[10px] text-muted-foreground">Available: {formatQty(w.available)}</div>
                {w.locked > 0 && <div className="text-[10px] text-yellow-600 dark:text-yellow-400">Locked: {formatQty(w.locked)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Recent Transactions ({transactions.length})
          </h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Asset</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Network</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium hidden md:table-cell">Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No transactions</td></tr>
              ) : transactions.map(t => (
                <tr key={t.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className={
                      t.type === 'DEPOSIT' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                      t.type === 'WITHDRAW' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                      'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    }>{t.type.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-3 py-2 text-xs">{t.asset}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatQty(t.amount)}</td>
                  <td className="px-3 py-2 text-xs hidden sm:table-cell">{t.network}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant="secondary" className={
                      t.status === 'COMPLETED' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                      t.status === 'PENDING' ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' :
                      'bg-red-500/15 text-red-600 dark:text-red-400'
                    }>{t.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground hidden md:table-cell">{formatDateTime(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* P2P Orders table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" /> P2P Orders ({p2pOrders.length})
          </h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Asset</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Method</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium hidden md:table-cell">Time</th>
              </tr>
            </thead>
            <tbody>
              {p2pOrders.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No P2P orders</td></tr>
              ) : p2pOrders.map(o => (
                <tr key={o.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-3 py-2 text-xs">{o.asset}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatQty(o.amount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPrice(o.total)} {o.fiatCurrency}</td>
                  <td className="px-3 py-2 text-xs hidden sm:table-cell">{o.paymentMethod}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant="secondary" className={
                      o.status === 'COMPLETED' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                      o.status === 'PENDING_REVIEW' || o.status === 'PENDING_PAYMENT' ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' :
                      o.status === 'CANCELED' || o.status === 'DISPUTED' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                      'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    }>{o.status.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground hidden md:table-cell">{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spot Orders table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" /> Spot Orders ({orders.length})
          </h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Pair</th>
                <th className="px-3 py-2 text-left font-medium">Side</th>
                <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Type</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium hidden md:table-cell">Time</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No spot orders</td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-3 py-2 text-xs font-medium">{o.symbol}</td>
                  <td className="px-3 py-2">
                    <span className={o.side === 'BUY' ? 'text-green-500 text-xs' : 'text-red-500 text-xs'}>
                      {o.side}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">{o.type}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPrice(o.price)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatQty(o.quantity)}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant="secondary" className={
                      o.status === 'FILLED' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                      o.status === 'CANCELED' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                      'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                    }>{o.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground hidden md:table-cell">{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// =================== SUPPORT TAB ===================
function SupportTab() {
  const { toast } = useToast()
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [viewer, setViewer] = useState<string | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [recTime, setRecTime] = useState(0)

  const mr = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const fImg = useRef<HTMLInputElement>(null)
  const fVid = useRef<HTMLInputElement>(null)

  // Load conversations (admin mode)
  const loadConversations = useCallback(async () => {
    try {
      const r = await fetch('/api/support')
      const d = await r.json()
      if (!d.error) setConversations(d.conversations || [])
    } catch {}
  }, [])

  // Load messages for selected user
  const loadMessages = useCallback(async () => {
    if (!selectedUserId) return
    try {
      const r = await fetch(`/api/support?userId=${selectedUserId}`)
      const d = await r.json()
      if (!d.error) setMessages(d.messages || [])
    } catch {}
  }, [selectedUserId])

  // Initial load + auto-refresh every 12 seconds
  useEffect(() => {
    loadConversations() // Load once on mount — manual refresh only
  }, [loadConversations])

  // Load messages when a conversation is selected (manual refresh only — tap Refresh to update)
  useEffect(() => {
    if (!selectedUserId) {
      setMessages([])
      return
    }
    loadMessages()
  }, [selectedUserId, loadMessages])

  // Auto-scroll
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight
  }, [messages])

  // Cleanup on unmount
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current)
    if (stream.current) stream.current.getTracks().forEach(t => t.stop())
    if (audio.current) audio.current.pause()
  }, [])

  const send = async (type: string, data?: any) => {
    if (!selectedUserId) {
      toast({ title: 'No user selected', description: 'Select a conversation first', variant: 'destructive' })
      return
    }
    if (type === 'text' && !text.trim()) return
    setBusy(true)
    try {
      const body: any = {
        type,
        message: type === 'text' ? text.trim() : (data?.message || ''),
        userId: selectedUserId,
      }
      if (data?.imageData) body.imageData = data.imageData
      if (data?.voiceData) body.voiceData = data.voiceData
      if (data?.videoData) body.videoData = data.videoData
      console.log('[admin support] sending message:', { type, userId: selectedUserId, hasImage: !!data?.imageData, hasVoice: !!data?.voiceData, hasVideo: !!data?.videoData })
      const r = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok || d.error) {
        throw new Error(d.error || `HTTP ${r.status}`)
      }
      console.log('[admin support] message sent:', d.message?.id)
      if (type === 'text') setText('')
      await loadMessages()
      await loadConversations()
    } catch (e: any) {
      console.error('[admin support] send error:', e)
      toast({ title: 'Send failed', description: e.message || 'Unknown error', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const startRec = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = s
      chunks.current = []
      let mt = 'audio/webm'
      if (!MediaRecorder.isTypeSupported(mt)) {
        mt = 'audio/mp4'
        if (!MediaRecorder.isTypeSupported(mt)) mt = ''
      }
      const r = mt ? new MediaRecorder(s, { mimeType: mt }) : new MediaRecorder(s)
      mr.current = r
      r.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data) }
      r.onstop = async () => {
        const b = new Blob(chunks.current, { type: mt || 'audio/webm' })
        if (b.size > 5e6) {
          toast({ title: 'Too long', description: 'Keep under 1 min', variant: 'destructive' })
          return
        }
        const rd = new FileReader()
        rd.onload = async () => await send('voice', { voiceData: rd.result as string, message: 'Voice' })
        rd.readAsDataURL(b)
        if (stream.current) {
          stream.current.getTracks().forEach(t => t.stop())
          stream.current = null
        }
      }
      r.start(1000)
      setRecording(true)
      setRecTime(0)
      timer.current = setInterval(() => setRecTime(p => {
        if (p >= 60) { stopRec(); return 60 }
        return p + 1
      }), 1000)
    } catch {
      toast({ title: 'Mic denied', description: 'Allow microphone access', variant: 'destructive' })
    }
  }

  const stopRec = () => {
    if (mr.current?.state === 'recording') mr.current.stop()
    setRecording(false)
    if (timer.current) { clearInterval(timer.current); timer.current = null }
  }

  const cancelRec = () => {
    if (mr.current?.state === 'recording') {
      mr.current.onstop = null
      mr.current.stop()
    }
    setRecording(false)
    setRecTime(0)
    if (timer.current) { clearInterval(timer.current); timer.current = null }
    if (stream.current) {
      stream.current.getTracks().forEach(t => t.stop())
      stream.current = null
    }
  }

  const onImg = (f: File) => {
    const r = new FileReader()
    r.onload = () => {
      const b = r.result as string
      const img = new Image()
      img.onload = () => {
        const c = document.createElement('canvas')
        const m = 600
        let { width: w, height: h } = img
        if (w > h && w > m) { h = h * m / w; w = m } else if (h > m) { w = w * m / h; h = m }
        c.width = w; c.height = h
        c.getContext('2d')?.drawImage(img, 0, 0, w, h)
        send('image', { imageData: c.toDataURL('image/jpeg', 0.6), message: f.name })
      }
      img.src = b
    }
    r.readAsDataURL(f)
  }

  const onVid = (f: File) => {
    if (f.size > 3e6) {
      toast({ title: 'Too large', description: 'Under 3MB', variant: 'destructive' })
      return
    }
    const r = new FileReader()
    r.onload = () => send('video', { videoData: r.result as string, message: f.name })
    r.readAsDataURL(f)
  }

  const play = (d: string, id: string) => {
    if (playing === id) {
      audio.current?.pause()
      setPlaying(null)
      return
    }
    if (audio.current) audio.current.pause()
    try {
      const b = d.includes(',') ? d.split(',')[1] : d
      const m = d.match(/data:(.*?);/)?.[1] || 'audio/webm'
      const bs = atob(b)
      const ab = new ArrayBuffer(bs.length)
      const ia = new Uint8Array(ab)
      for (let i = 0; i < bs.length; i++) ia[i] = bs.charCodeAt(i)
      audio.current = new Audio(URL.createObjectURL(new Blob([ab], { type: m })))
      audio.current.onended = () => setPlaying(null)
      audio.current.onerror = () => setPlaying(null)
      audio.current.play().catch(() => setPlaying(null))
      setPlaying(id)
    } catch {}
  }

  const ft = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const fd = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 min-h-[500px]">
        {/* Conversation list */}
        <div className={`border-r border-border flex flex-col min-h-0 ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
            <span className="font-semibold text-sm flex items-center gap-1.5">
              <Headphones className="h-4 w-4" /> Conversations ({conversations.length})
            </span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={loadConversations}>
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </div>
          <div className="overflow-y-auto max-h-[60vh] min-h-[200px]">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <Headphones className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No conversations yet
              </div>
            ) : conversations.map(c => (
              <button
                key={c.userId}
                onClick={() => setSelectedUserId(c.userId)}
                className={`w-full text-left p-3 border-b border-border/40 hover:bg-muted/30 transition ${selectedUserId === c.userId ? 'bg-muted/50' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium flex-shrink-0">
                    {(c.userName || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-medium truncate">{c.userName}</span>
                      {c.unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white text-[10px] h-4 min-w-4 px-1 flex items-center justify-center">{c.unreadCount}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDateTime(c.lastTime)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className={`md:col-span-2 flex flex-col min-h-[400px] ${selectedUserId ? 'flex' : 'hidden md:flex'}`}>
          {!selectedUserId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
              <div className="text-center">
                <Headphones className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select a conversation to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-border flex items-center gap-2 flex-shrink-0">
                <Button variant="ghost" size="sm" className="h-7 md:hidden text-xs" onClick={() => setSelectedUserId(null)}>
                  <ArrowUpRight className="h-3 w-3 rotate-180" /> Back
                </Button>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {(conversations.find(c => c.userId === selectedUserId)?.userName || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {conversations.find(c => c.userId === selectedUserId)?.userName || 'User'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {conversations.find(c => c.userId === selectedUserId)?.userEmail || ''}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={loadMessages}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>

              <div ref={scroll} className="overflow-y-auto max-h-[60vh] min-h-[300px] p-3 space-y-2">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Headphones className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="text-xs">Send a message to start the conversation</p>
                  </div>
                ) : messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-2.5 ${m.sender === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {m.type === 'text' && <p className="text-sm break-words whitespace-pre-wrap">{m.message}</p>}
                      {m.type === 'image' && m.imageData && (
                        <img src={m.imageData} alt="img" className="rounded-lg max-w-full max-h-40 cursor-pointer" onClick={() => setViewer(m.imageData)} />
                      )}
                      {m.type === 'voice' && m.voiceData && (
                        <button onClick={() => play(m.voiceData, m.id)} className="flex items-center gap-2 p-1.5 w-full">
                          {playing === m.id ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                          <span className="text-xs">Voice message</span>
                        </button>
                      )}
                      {m.type === 'video' && m.videoData && (
                        <video src={m.videoData} controls className="rounded-lg max-w-full max-h-40" />
                      )}
                      <p className={`text-[10px] mt-1 ${m.sender === 'admin' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{fd(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {recording && (
                <div className="flex items-center gap-2 p-2 bg-red-500/10 border-t border-red-500/30 flex-shrink-0">
                  <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm text-red-500 font-medium flex-1">Recording {ft(recTime)}</span>
                  <button onClick={cancelRec} className="text-xs px-2 py-1 rounded text-muted-foreground hover:bg-muted">Cancel</button>
                  <button onClick={stopRec} className="text-xs px-3 py-1 rounded bg-red-500 text-white font-medium">Send</button>
                </div>
              )}

              <div className="border-t border-border p-2 flex-shrink-0 bg-card">
                <div className="flex items-center gap-1">
                  <input ref={fImg} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) onImg(e.target.files[0]); e.target.value = '' }} />
                  <input ref={fVid} type="file" accept="video/*" className="hidden" onChange={e => { if (e.target.files?.[0]) onVid(e.target.files[0]); e.target.value = '' }} />
                  <button onClick={() => fImg.current?.click()} disabled={busy || recording} className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 flex-shrink-0" title="Send image">
                    <ImageIcon className="h-5 w-5" />
                  </button>
                  <button onClick={recording ? stopRec : startRec} disabled={busy} className={`p-2 rounded-lg hover:bg-muted flex-shrink-0 ${recording ? 'text-red-500' : ''}`} title="Record voice">
                    {recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                  <button onClick={() => fVid.current?.click()} disabled={busy || recording} className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 flex-shrink-0" title="Send video">
                    <Video className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !busy && !recording) send('text') }}
                    placeholder={recording ? 'Recording...' : 'Type a reply...'}
                    className="flex-1 min-w-0 h-9 px-3 rounded-lg border border-border bg-background text-sm"
                    disabled={busy || recording}
                  />
                  <button onClick={() => send('text')} disabled={busy || recording || !text.trim()} className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 flex-shrink-0" title="Send">
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {viewer && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={() => setViewer(null)}>
          <button className="absolute top-4 right-4 text-white p-2 z-10" onClick={() => setViewer(null)}>
            <X className="h-8 w-8" />
          </button>
          <img src={viewer} alt="Full" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  )
}

// =================== DEPOSIT/WITHDRAW APPROVALS TAB ===================
function DepositWithdrawApprovalsTab() {
  const { toast } = useToast()
  const [txs, setTxs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [confirmDialog, setConfirmDialog] = useState<{ tx: any; action: 'approve' | 'reject' } | null>(null)
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/transactions?status=${statusFilter}`)
      const text = await res.text()
      if (!text) return
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      // Filter to only DEPOSIT, WITHDRAW, INTERNAL_TRANSFER types
      const filtered = (d.transactions || []).filter((t: any) =>
        ['DEPOSIT', 'WITHDRAW', 'INTERNAL_TRANSFER'].includes(t.type)
      )
      setTxs(filtered)
    } catch (e: any) {
      toast({ title: 'Failed to load transactions', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, toast])

  useEffect(() => {
    load() // Load once on mount — manual refresh only (tap Refresh button)
  }, [load])

  const act = async (tx: any, action: 'approve' | 'reject') => {
    if (acting) return // Prevent duplicate actions
    setActing(true)
    try {
      const res = await fetch('/api/admin/transactions/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: tx.id, action }),
      })
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response')
      const d = JSON.parse(text)
      if (d.error) throw new Error(d.error)
      toast({ title: action === 'approve' ? 'Transaction approved' : 'Transaction rejected', description: d.message })
      setConfirmDialog(null)
      load()
    } catch (e: any) {
      toast({ title: 'Action failed', description: e.message, variant: 'destructive' })
    } finally {
      setActing(false)
    }
  }

  const typeIcon = (type: string) => {
    if (type === 'DEPOSIT') return <ArrowDownToLine className="h-3.5 w-3.5 text-green-500" />
    if (type === 'WITHDRAW') return <ArrowUpFromLine className="h-3.5 w-3.5 text-red-500" />
    if (type === 'INTERNAL_TRANSFER') return <ArrowLeftRight className="h-3.5 w-3.5 text-blue-500" />
    return null
  }

  const formatDetails = (t: any) => {
    if (t.type === 'INTERNAL_TRANSFER') {
      // toAddress may be "user:000001 (Name)"
      const to = t.toAddress || ''
      return (
        <div className="text-xs">
          <div className="text-muted-foreground">To: <span className="font-mono text-foreground">{to}</span></div>
        </div>
      )
    }
    if (t.type === 'DEPOSIT') {
      return (
        <div className="text-xs">
          {t.fromAddress && <div className="text-muted-foreground">From: <span className="font-mono text-foreground">{t.fromAddress}</span></div>}
          {t.txHash && <div className="text-muted-foreground">TxHash: <span className="font-mono text-foreground truncate inline-block max-w-[120px] align-bottom">{t.txHash}</span></div>}
        </div>
      )
    }
    if (t.type === 'WITHDRAW') {
      return (
        <div className="text-xs">
          {t.toAddress && <div className="text-muted-foreground">To: <span className="font-mono text-foreground">{t.toAddress}</span></div>}
          {t.txHash && <div className="text-muted-foreground">TxHash: <span className="font-mono text-foreground truncate inline-block max-w-[120px] align-bottom">{t.txHash}</span></div>}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Refresh
        </Button>
        {statusFilter === 'pending' && txs.length > 0 && (
          <Badge className="ml-auto bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">
            {txs.length} pending approval
          </Badge>
        )}
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
                <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Details</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground"></td></tr>
              ) : txs.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No transactions</td></tr>
              ) : txs.map(t => (
                <tr key={t.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-3 py-3">
                    <div className="font-medium text-xs">{t.userName}</div>
                    <div className="text-[10px] text-muted-foreground">{t.userEmail}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      {typeIcon(t.type)}
                      <Badge variant="secondary" className={
                        t.type === 'DEPOSIT' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                        t.type === 'WITHDRAW' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                        'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      }>{t.type.replace('_', ' ')}</Badge>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs">{t.asset}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-medium">{formatQty(t.amount)}</td>
                  <td className="px-3 py-3 text-xs hidden sm:table-cell">{t.network}</td>
                  <td className="px-3 py-3 hidden md:table-cell">{formatDetails(t)}</td>
                  <td className="px-3 py-3 text-center">
                    <Badge variant="secondary" className={
                      t.status === 'COMPLETED' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                      t.status === 'PENDING' ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' :
                      t.status === 'REJECTED' || t.status === 'FAILED' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                      ''
                    }>{t.status}</Badge>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {t.status === 'PENDING' ? (
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white"
                          onClick={() => setConfirmDialog({ tx: t, action: 'approve' })}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-red-500 text-red-500 hover:bg-red-500/10"
                          onClick={() => setConfirmDialog({ tx: t, action: 'reject' })}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmDialog && (
        <Dialog open onOpenChange={() => !acting && setConfirmDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {confirmDialog.action === 'approve' ? (
                  <><CheckCircle2 className="h-5 w-5 text-green-500" /> Confirm Approval</>
                ) : (
                  <><XCircle className="h-5 w-5 text-red-500" /> Confirm Rejection</>
                )}
              </DialogTitle>
              <DialogDescription>
                {confirmDialog.action === 'approve'
                  ? 'Please confirm you want to approve this transaction.'
                  : 'Please confirm you want to reject this transaction. Funds will be refunded to the user.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">User:</span>
                  <span className="font-medium">{confirmDialog.tx.userName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="secondary" className={
                    confirmDialog.tx.type === 'DEPOSIT' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                    confirmDialog.tx.type === 'WITHDRAW' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                    'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                  }>{confirmDialog.tx.type.replace('_', ' ')}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold tabular-nums">{formatQty(confirmDialog.tx.amount)} {confirmDialog.tx.asset}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Network:</span>
                  <span className="font-medium">{confirmDialog.tx.network}</span>
                </div>

                {confirmDialog.tx.type === 'INTERNAL_TRANSFER' && (
                  <>
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">From (Sender):</span>
                        <span className="font-medium text-xs">{confirmDialog.tx.userName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">To (Recipient):</span>
                        <span className="font-mono text-xs">{confirmDialog.tx.toAddress || '—'}</span>
                      </div>
                    </div>
                  </>
                )}
                {(confirmDialog.tx.type === 'DEPOSIT' || confirmDialog.tx.type === 'WITHDRAW') && confirmDialog.tx.toAddress && (
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{confirmDialog.tx.type === 'DEPOSIT' ? 'From:' : 'To:'}</span>
                      <span className="font-mono text-xs break-all">{confirmDialog.tx.toAddress}</span>
                    </div>
                  </div>
                )}
              </div>

              {confirmDialog.action === 'reject' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded p-2 text-xs text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Rejecting will refund {formatQty(confirmDialog.tx.amount)} {confirmDialog.tx.asset} back to the user's wallet (for withdrawals and internal transfers).
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmDialog(null)} disabled={acting}>Cancel</Button>
                <Button
                  className={confirmDialog.action === 'approve' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}
                  onClick={() => act(confirmDialog.tx, confirmDialog.action)}
                  disabled={acting}
                >
                  {acting ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> :
                    confirmDialog.action === 'approve' ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                  {confirmDialog.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
