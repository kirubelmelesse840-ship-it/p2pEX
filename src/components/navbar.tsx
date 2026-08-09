'use client'

import { useState, useEffect } from 'react'
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
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { KycDialog } from '@/components/kyc-dialog'
import { SettingsDialog } from '@/components/settings-dialog'
import {
  Search, Menu, Sun, Moon, Wallet, LogOut, Settings,
  TrendingUp, Users, Home, ChevronDown, Bitcoin, Shield, Mail, Plus, CheckCircle2, Eye, EyeOff,
} from 'lucide-react'

// Google "G" logo (multi-color, matches Google's official brand)
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

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
  const [kycOpen, setKycOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const isAdmin = user?.isAdmin

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
    <>
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        {/* Mobile menu — hidden for admins */}
        {!isAdmin && (
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
              <span className="text-lg font-bold">P2PEX</span>
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
        )}

        {/* Logo */}
        <button
          onClick={() => !isAdmin && setView('home')}
          className="flex items-center gap-2 mr-1 hover:opacity-80 transition"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
            <Bitcoin className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold hidden sm:inline">P2PEX</span>
          {isAdmin && <Badge variant="default" className="bg-red-500/15 text-red-600 dark:text-red-400 ml-1">ADMIN</Badge>}
        </button>

        {/* Desktop nav — hidden for admins */}
        {!isAdmin && (
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
        )}

        {/* Search — hidden for admins */}
        {!isAdmin && (
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
        )}
        {isAdmin && <div className="flex-1" />}
        {!isAdmin && <div className="flex-1 lg:hidden" />}

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
              <DropdownMenuItem onClick={() => setKycOpen(true)}>
                <Shield className="mr-2 h-4 w-4" />
                {user.kycVerified ? `Verified (L${user.kycLevel})` : user.kycStatus === 'PENDING' ? 'KYC Pending Review' : user.kycStatus === 'REJECTED' ? 'KYC Rejected' : 'Verify Account'}
                {user.kycVerified ? (
                  <Badge className="ml-auto text-[10px] bg-green-500/15 text-green-600 dark:text-green-400">L{user.kycLevel}</Badge>
                ) : user.kycStatus === 'PENDING' ? (
                  <Badge className="ml-auto text-[10px] bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">PENDING</Badge>
                ) : user.kycStatus === 'REJECTED' ? (
                  <Badge className="ml-auto text-[10px] bg-red-500/15 text-red-600 dark:text-red-400">REJECTED</Badge>
                ) : (
                  <Badge className="ml-auto text-[10px]" variant="secondary">UNVERIFIED</Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
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

    {/* KYC Verification Dialog */}
    {kycOpen && (
      <KycDialog open={kycOpen} onClose={() => setKycOpen(false)} />
    )}

    {/* Settings Dialog */}
    {settingsOpen && (
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    )}
    </>
  )
}

function AuthButtons() {
  const [showAuth, setShowAuth] = useState<'login' | 'signup' | null>(null)
  const [showGoogle, setShowGoogle] = useState(false)
  const { toast } = useToast()
  const setUser = useAppStore(s => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (mode: 'login' | 'signup') => {
    if (mode === 'signup') {
      if (password.length < 6) {
        toast({ title: 'Password too short', description: 'At least 6 characters required', variant: 'destructive' })
        return
      }
      if (password !== confirmPassword) {
        toast({ title: 'Passwords do not match', variant: 'destructive' })
        return
      }
    }
    setLoading(true)
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth'
      const body = mode === 'login'
        ? { email, password }
        : { email, password, name: email.split('@')[0] }
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
      setEmail(''); setPassword(''); setConfirmPassword('')
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

  const googleLogin = async (googleEmail: string, googleName?: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: googleEmail, name: googleName }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setUser(data.user)
      toast({
        title: data.isNewUser ? 'Google account connected!' : 'Welcome back!',
        description: `Logged in as ${data.user.name} (${data.user.email})${data.user.isAdmin ? ' · Admin' : ''}`,
      })
      setShowAuth(null)
      setShowGoogle(false)
      setEmail(''); setPassword(''); setName('')
    } catch (e: any) {
      toast({ title: 'Google sign-in failed', description: e.message, variant: 'destructive' })
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
        <Dialog open onOpenChange={() => setShowAuth(null)}>
          <DialogContent className="max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
                <Bitcoin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{showAuth === 'login' ? 'Log In' : 'Create Account'}</h2>
                <p className="text-xs text-muted-foreground">P2PEX</p>
              </div>
            </div>

            <div className="space-y-3">
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
              {showAuth === 'signup' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`mt-1 ${confirmPassword && confirmPassword !== password ? 'border-red-500' : confirmPassword && confirmPassword === password ? 'border-green-500' : ''}`}
                    onKeyDown={e => { if (e.key === 'Enter') submit(showAuth) }}
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                  {confirmPassword && confirmPassword === password && (
                    <p className="text-xs text-green-500 mt-1">✓ Passwords match</p>
                  )}
                </div>
              )}

              <Button
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                onClick={() => submit(showAuth)}
                disabled={loading || !email || !password || (showAuth === 'signup' && (!confirmPassword || password !== confirmPassword))}
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
                className="w-full gap-2"
                onClick={() => setShowGoogle(true)}
                disabled={loading}
              >
                <GoogleIcon className="h-4 w-4" />
                Continue with Google
              </Button>

              <Button
                variant="ghost"
                className="w-full text-xs"
                onClick={quickDemo}
                disabled={loading}
              >
                Try Demo Account
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Demo account has sample balances: 50,000 USDT, 0.85 BTC, 12.5 ETH and more.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showGoogle && (
        <GoogleLoginDialog
          loading={loading}
          onClose={() => setShowGoogle(false)}
          onLogin={googleLogin}
        />
      )}
    </>
  )
}

/**
 * GoogleLoginDialog - Simulates the Google account chooser flow.
 *
 * 1. Shows Google accounts already signed into the device (from localStorage).
 * 2. "Use another account" opens a signup form asking for email, password,
 *    and confirm password — no email verification needed.
 */
function GoogleLoginDialog({ loading, onClose, onLogin }: {
  loading: boolean
  onClose: () => void
  onLogin: (email: string, name?: string) => void
}) {
  const [step, setStep] = useState<'choose' | 'signup'>('choose')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  // Load detected Google accounts from localStorage
  const [detectedAccounts, setDetectedAccounts] = useState<Array<{ email: string; name: string }>>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('google-signed-accounts')
      if (stored) {
        const accounts = JSON.parse(stored)
        if (Array.isArray(accounts)) setDetectedAccounts(accounts)
      }
    } catch {}
  }, [])

  const pickAccount = (acc: { email: string; name: string }) => {
    // Account already on device - log in directly
    onLogin(acc.email, acc.name)
  }

  // Create a new account with email + password (no verification needed)
  const createAccount = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      toast({ title: 'All fields are required', variant: 'destructive' })
      return
    }
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'At least 6 characters required', variant: 'destructive' })
      return
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      // Create the account via the signup API
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: email.split('@')[0],
        }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)

      // Save this account to detected accounts for next time
      const newAcc = { email: email.trim(), name: d.user.name }
      const updated = [...detectedAccounts.filter(a => a.email !== newAcc.email), newAcc]
      setDetectedAccounts(updated)
      try { localStorage.setItem('google-signed-accounts', JSON.stringify(updated)) } catch {}

      toast({ title: 'Account created!', description: `Welcome to P2PEX, ${d.user.name}` })
      // Call onLogin to set the user state (the signup already set the session cookie)
      onLogin(email.trim(), d.user.name)
    } catch (e: any) {
      toast({ title: 'Sign up failed', description: e.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        {/* Google-style header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="mb-3">
            <svg className="h-10 w-10" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold">
            {step === 'signup' ? 'Create your account' : 'Sign in with Google'}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {step === 'choose' && 'Choose an account to continue to P2PEX'}
            {step === 'signup' && 'Enter your details to create a new account'}
          </p>
        </div>

        {/* STEP 1: Choose account (detected accounts on device) */}
        {step === 'choose' && (
          <div className="space-y-2">
            {detectedAccounts.length > 0 && (
              <>
                <div className="text-xs text-muted-foreground px-1 mb-1">
                  Accounts on this device:
                </div>
                {detectedAccounts.map(acc => (
                  <button
                    key={acc.email}
                    onClick={() => pickAccount(acc)}
                    disabled={loading}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition text-left disabled:opacity-50"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm font-bold flex-shrink-0">
                      {acc.name.slice(0, 1).toUpperCase() || acc.email.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{acc.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{acc.email}</div>
                    </div>
                  </button>
                ))}
                <div className="border-t border-border my-2" />
              </>
            )}

            <button
              onClick={() => setStep('signup')}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition text-left disabled:opacity-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-muted-foreground text-muted-foreground flex-shrink-0">
                <Plus className="h-4 w-4" />
              </div>
              <div className="text-sm font-medium">Use another account</div>
            </button>

            <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 flex items-start gap-2 mt-3">
              <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                P2PEX will use your email to create or access your account.
                We don't access your Google data or store your Google password.
              </span>
            </div>
          </div>
        )}

        {/* STEP 2: Sign up with email + password */}
        {step === 'signup' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your.email@gmail.com"
                className="mt-1"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 pr-10"
                  onKeyDown={e => { if (e.key === 'Enter') createAccount() }}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`mt-1 ${confirmPassword && confirmPassword !== password ? 'border-red-500' : confirmPassword && confirmPassword === password ? 'border-green-500' : ''}`}
                onKeyDown={e => { if (e.key === 'Enter') createAccount() }}
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
              {confirmPassword && confirmPassword === password && (
                <p className="text-xs text-green-500 mt-1">✓ Passwords match</p>
              )}
            </div>

            <Button
              className="w-full bg-[#4285F4] hover:bg-[#3367D6] text-white"
              onClick={createAccount}
              disabled={submitting || !email.trim() || !password || !confirmPassword || password !== confirmPassword || password.length < 6}
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </Button>

            <button
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setStep('choose')}
            >
              ← Back to account list
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
