'use client'

import { useState } from 'react'
import { useAppStore, View } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Search, Menu, Sun, Moon, Wallet, LogOut, Settings,
  TrendingUp, Users, Home, ChevronDown, Bitcoin, Shield,
} from 'lucide-react'

const NAV_ITEMS: Array<{ id: View; label: string; icon: any }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'markets', label: 'Markets', icon: TrendingUp },
  { id: 'spot', label: 'Spot', icon: Bitcoin },
  { id: 'p2p', label: 'P2P', icon: Users },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
]

export function Navbar() {
  const { user, view, setView, theme, toggleTheme, setSymbol } = useAppStore()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      useAppStore.getState().setUser(null)
      toast({ title: 'Logged out', description: 'See you soon!' })
    } catch (e) {
      toast({ title: 'Logout failed', variant: 'destructive' })
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = search.trim().toUpperCase()
    if (!q) return
    if (q.endsWith('USDT') || q.endsWith('USDC') || q.endsWith('BTC') || q.endsWith('ETH') || q.endsWith('BNB')) {
      setSymbol(q)
    } else {
      setSymbol(q + 'USDT')
    }
    setView('spot')
    setSearch('')
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <div className="flex items-center gap-2 px-2 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
                <Bitcoin className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold">CrypEx</span>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map(item => (
                <Button
                  key={item.id}
                  variant={view === item.id ? 'secondary' : 'ghost'}
                  className="justify-start"
                  onClick={() => { setView(item.id); setMobileOpen(false) }}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <button
          onClick={() => setView('home')}
          className="flex items-center gap-2 mr-1 hover:opacity-80 transition"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
            <Bitcoin className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold hidden sm:inline">CrypEx</span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          {NAV_ITEMS.map(item => (
            <Button
              key={item.id}
              variant={view === item.id ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView(item.id)}
              className="font-medium"
            >
              {item.label}
            </Button>
          ))}
        </nav>

        {/* Search */}
        <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-sm mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search BTC, ETH, USDT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 bg-muted/50 border-0"
            />
          </div>
        </form>

        <div className="flex-1 lg:hidden" />

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User menu */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 px-2 gap-1.5">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setView('wallet')}>
                <Wallet className="mr-2 h-4 w-4" />
                My Wallet
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView('spot')}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Trade
              </DropdownMenuItem>
              {user.isAdmin && (
                <DropdownMenuItem onClick={() => setView('admin')} className="text-red-600 dark:text-red-400">
                  <Shield className="mr-2 h-4 w-4" />
                  Admin Panel
                  <Badge className="ml-auto text-[10px] bg-red-500/15 text-red-600 dark:text-red-400">ADMIN</Badge>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem disabled>
                <Shield className="mr-2 h-4 w-4" />
                KYC {user.kycVerified ? 'Verified' : 'Unverified'}
                {user.kycVerified && <Badge className="ml-auto text-[10px]" variant="default">L{user.kycLevel}</Badge>}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <AuthButtons />
          </div>
        )}
      </div>
    </header>
  )
}

function AuthButtons() {
  const [showAuth, setShowAuth] = useState<'login' | 'signup' | null>(null)
  const { toast } = useToast()
  const setUser = useAppStore(s => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (mode: 'login' | 'signup') => {
    setLoading(true)
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth'
      const body = mode === 'login'
        ? { email, password }
        : { email, password, name: name || email.split('@')[0] }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setUser(data.user)
      toast({
        title: mode === 'login' ? 'Welcome back!' : 'Account created!',
        description: `Logged in as ${data.user.name}`,
      })
      setShowAuth(null)
      setEmail(''); setPassword(''); setName('')
    } catch (e: any) {
      toast({ title: 'Authentication failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const quickDemo = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@crypex.com', password: 'demo12345' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setUser(data.user)
      toast({ title: 'Welcome to Demo!', description: `Logged in as ${data.user.name} with sample balances.` })
    } catch (e: any) {
      toast({ title: 'Login failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={quickDemo} disabled={loading} className="hidden sm:flex">
        Demo Login
      </Button>
      <Button variant="default" size="sm" onClick={() => setShowAuth('signup')}>
        Sign Up
      </Button>
      <Button variant="outline" size="sm" onClick={() => setShowAuth('login')} className="hidden sm:flex">
        Log In
      </Button>

      {showAuth && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowAuth(null)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
                <Bitcoin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{showAuth === 'login' ? 'Log In' : 'Create Account'}</h2>
                <p className="text-xs text-muted-foreground">CrypEx Cryptocurrency Exchange</p>
              </div>
            </div>

            <div className="space-y-3">
              {showAuth === 'signup' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                  onKeyDown={e => { if (e.key === 'Enter') submit(showAuth) }}
                />
              </div>

              <Button
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                onClick={() => submit(showAuth)}
                disabled={loading || !email || !password}
              >
                {loading ? 'Please wait...' : showAuth === 'login' ? 'Log In' : 'Create Account'}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                {showAuth === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  className="text-primary underline-offset-2 hover:underline"
                  onClick={() => setShowAuth(showAuth === 'login' ? 'signup' : 'login')}
                >
                  {showAuth === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </div>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={quickDemo}
                disabled={loading}
              >
                Try Demo Account
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Demo account has sample balances: 50,000 USDT, 0.85 BTC, 12.5 ETH and more.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
