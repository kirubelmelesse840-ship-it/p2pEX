'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Settings, User, Lock, Bell, Globe, Shield, Mail, Key, Smartphone,
  CheckCircle2, AlertCircle, Eye, EyeOff,
} from 'lucide-react'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

const FIAT_CURRENCIES = ['USD', 'EUR', 'GBP', 'ETB', 'CNY', 'JPY', 'KRW', 'INR', 'SGD', 'AUD', 'CAD']

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { user, setUser, theme, toggleTheme } = useAppStore()
  const { toast } = useToast()
  const [tab, setTab] = useState('account')

  // Account form state
  const [name, setName] = useState(user?.name || '')
  const [fiatCurrency, setFiatCurrency] = useState(user?.fiatCurrency || 'USD')

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Security settings
  const [twofaEnabled, setTwofaEnabled] = useState(false)
  const [twofaPhone, setTwofaPhone] = useState('')
  const [twofaStep, setTwofaStep] = useState<'idle' | 'phone' | 'verify'>('idle')
  const [smsCode, setSmsCode] = useState('')
  const [smsSending, setSmsSending] = useState(false)
  const [smsVerifying, setSmsVerifying] = useState(false)
  const [loginAlerts, setLoginAlerts] = useState(true)
  const [withdrawalWhitelist, setWithdrawalWhitelist] = useState(false)

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [priceAlerts, setPriceAlerts] = useState(true)
  const [tradeNotifications, setTradeNotifications] = useState(true)

  useEffect(() => {
    if (user) {
      setName(user.name)
      setFiatCurrency(user.fiatCurrency || 'USD')
    }
  }, [user])

  const saveAccount = async () => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, fiatCurrency }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      if (user) {
        setUser({ ...user, name, fiatCurrency })
      }
      toast({ title: 'Profile updated', description: 'Your account settings have been saved.' })
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' })
    }
  }

  // Send SMS verification code to phone number
  const sendSmsCode = async () => {
    if (!twofaPhone || twofaPhone.length < 8) {
      toast({ title: 'Invalid phone number', description: 'Please enter a valid phone number with country code', variant: 'destructive' })
      return
    }
    setSmsSending(true)
    try {
      const res = await fetch('/api/auth/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: twofaPhone }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setTwofaStep('verify')
      toast({ title: 'SMS sent', description: `A 6-digit code has been sent to ${twofaPhone}` })
    } catch (e: any) {
      toast({ title: 'SMS failed', description: e.message, variant: 'destructive' })
    } finally {
      setSmsSending(false)
    }
  }

  // Verify SMS code and enable 2FA
  const verifySmsCode = async () => {
    if (smsCode.length !== 6) return
    setSmsVerifying(true)
    try {
      const res = await fetch('/api/auth/verify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: twofaPhone, code: smsCode }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      if (d.valid) {
        setTwofaEnabled(true)
        setTwofaStep('idle')
        setSmsCode('')
        toast({ title: '2FA Enabled', description: `Verification codes will be sent to ${twofaPhone}` })
      } else {
        toast({ title: 'Invalid code', description: 'The code you entered is incorrect or expired', variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Verification failed', description: e.message, variant: 'destructive' })
    } finally {
      setSmsVerifying(false)
    }
  }

  // Disable 2FA
  const disable2fa = () => {
    setTwofaEnabled(false)
    setTwofaPhone('')
    setTwofaStep('idle')
    setSmsCode('')
    toast({ title: '2FA Disabled', description: 'Two-factor authentication has been turned off' })
  }

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: 'All fields required', variant: 'destructive' })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'New password and confirmation must match.', variant: 'destructive' })
      return
    }
    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters.', variant: 'destructive' })
      return
    }
    setChangingPassword(true)
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast({ title: 'Password changed', description: 'Your password has been updated successfully.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: any) {
      toast({ title: 'Password change failed', description: e.message, variant: 'destructive' })
    } finally {
      setChangingPassword(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Manage your account, security, and notification preferences.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="account" className="text-xs gap-1">
              <User className="h-3 w-3" /> Account
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs gap-1">
              <Lock className="h-3 w-3" /> Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs gap-1">
              <Bell className="h-3 w-3" /> Alerts
            </TabsTrigger>
          </TabsList>

          {/* ===== ACCOUNT TAB ===== */}
          <TabsContent value="account" className="space-y-4 mt-4">
            {/* Profile info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4" /> Profile Information
              </h3>

              <div>
                <Label className="text-xs text-muted-foreground">Email (cannot be changed)</Label>
                <Input value={user.email} disabled className="mt-1 bg-muted/30" />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Display Name</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="mt-1"
                  placeholder="Your name"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Preferred Fiat Currency</Label>
                <Select value={fiatCurrency} onValueChange={setFiatCurrency}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIAT_CURRENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Used for displaying prices and P2P marketplace default
                </p>
              </div>

              {/* Account verification status */}
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Account Verification</span>
                  {user.kycVerified ? (
                    <Badge className="bg-green-500/15 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Verified L{user.kycLevel}
                    </Badge>
                  ) : user.kycStatus === 'PENDING' ? (
                    <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">Pending Review</Badge>
                  ) : user.kycStatus === 'REJECTED' ? (
                    <Badge className="bg-red-500/15 text-red-600 dark:text-red-400">Rejected</Badge>
                  ) : (
                    <Badge variant="secondary">Unverified</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Admin Status</span>
                  {user.isAdmin ? (
                    <Badge className="bg-red-500/15 text-red-600 dark:text-red-400">Administrator</Badge>
                  ) : (
                    <Badge variant="secondary">Standard User</Badge>
                  )}
                </div>
              </div>

              <Button onClick={saveAccount} className="w-full">
                Save Changes
              </Button>
            </div>
          </TabsContent>

          {/* ===== SECURITY TAB ===== */}
          <TabsContent value="security" className="space-y-4 mt-4">
            {/* Change password */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Key className="h-4 w-4" /> Change Password
              </h3>

              <div>
                <Label className="text-xs text-muted-foreground">Current Password</Label>
                <div className="relative">
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="mt-1 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">New Password</Label>
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="mt-1"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Confirm New Password</Label>
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="mt-1"
                  placeholder="••••••••"
                  onKeyDown={e => { if (e.key === 'Enter') changePassword() }}
                />
              </div>

              <Button onClick={changePassword} disabled={changingPassword} className="w-full">
                {changingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>

            {/* Security toggles */}
            <div className="space-y-3 pt-3 border-t border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" /> Security Settings
              </h3>

              <div className="space-y-3">
                {/* 2FA with phone number verification */}
                <div className="border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-2 flex-1">
                      <Smartphone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">Two-Factor Authentication (2FA)</div>
                        <div className="text-xs text-muted-foreground">
                          {twofaEnabled
                            ? `Enabled · codes sent to ${twofaPhone}`
                            : 'Require a verification code sent to your phone at login'}
                        </div>
                      </div>
                    </div>
                    {twofaEnabled ? (
                      <Badge className="bg-green-500/15 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Off</Badge>
                    )}
                  </div>

                  {twofaEnabled ? (
                    <Button variant="outline" size="sm" className="w-full text-xs text-red-500" onClick={disable2fa}>
                      Disable 2FA
                    </Button>
                  ) : twofaStep === 'idle' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setTwofaStep('phone')}
                    >
                      <Smartphone className="h-3 w-3 mr-1" /> Set Up 2FA
                    </Button>
                  ) : twofaStep === 'phone' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Phone Number (with country code)</label>
                      <Input
                        type="tel"
                        value={twofaPhone}
                        onChange={e => setTwofaPhone(e.target.value)}
                        placeholder="+251912345678"
                        className="text-sm"
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">
                        Include country code (e.g., +251 for Ethiopia, +1 for USA)
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setTwofaStep('idle')}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 text-xs bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={sendSmsCode}
                          disabled={smsSending || !twofaPhone}
                        >
                          {smsSending ? 'Sending...' : 'Send Code'}
                        </Button>
                      </div>
                    </div>
                  ) : twofaStep === 'verify' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Enter 6-digit code sent to {twofaPhone}</label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={smsCode}
                        onChange={e => setSmsCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="text-center text-xl tracking-[0.5em] font-bold tabular-nums"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setTwofaStep('phone')}>
                          ← Back
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 text-xs bg-green-500 hover:bg-green-600 text-white"
                          onClick={verifySmsCode}
                          disabled={smsVerifying || smsCode.length !== 6}
                        >
                          {smsVerifying ? 'Verifying...' : 'Verify & Enable'}
                        </Button>
                      </div>
                      <button
                        className="w-full text-xs text-muted-foreground hover:text-foreground"
                        onClick={sendSmsCode}
                        disabled={smsSending}
                      >
                        Resend code
                      </button>
                    </div>
                  ) : null}
                </div>

                <ToggleRow
                  icon={<Mail className="h-4 w-4" />}
                  title="Login Alerts"
                  description="Get email notifications when someone logs into your account"
                  checked={loginAlerts}
                  onChange={setLoginAlerts}
                />
                <ToggleRow
                  icon={<Shield className="h-4 w-4" />}
                  title="Withdrawal Whitelist"
                  description="Only allow withdrawals to pre-approved addresses"
                  checked={withdrawalWhitelist}
                  onChange={setWithdrawalWhitelist}
                />
              </div>
            </div>

            {/* Sessions */}
            <div className="space-y-2 pt-3 border-t border-border">
              <h3 className="text-sm font-semibold">Active Sessions</h3>
              <div className="bg-muted/30 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Current Session</div>
                    <div className="text-muted-foreground">This device · Active now</div>
                  </div>
                  <Badge className="bg-green-500/15 text-green-600 dark:text-green-400">Active</Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" disabled>
                Log out of all other sessions
              </Button>
            </div>
          </TabsContent>

          {/* ===== NOTIFICATIONS TAB ===== */}
          <TabsContent value="notifications" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" /> Notification Preferences
              </h3>

              <ToggleRow
                icon={<Mail className="h-4 w-4" />}
                title="Email Notifications"
                description="Receive account-related emails (deposits, withdrawals, security alerts)"
                checked={emailNotifications}
                onChange={setEmailNotifications}
              />
              <ToggleRow
                icon={<Bell className="h-4 w-4" />}
                title="Trade Notifications"
                description="Get notified when your orders are filled or canceled"
                checked={tradeNotifications}
                onChange={setTradeNotifications}
              />
              <ToggleRow
                icon={<Globe className="h-4 w-4" />}
                title="Price Alerts"
                description="Receive alerts when your favorite assets hit target prices"
                checked={priceAlerts}
                onChange={setPriceAlerts}
              />

              {/* Theme toggle */}
              <div className="pt-3 border-t border-border">
                <ToggleRow
                  icon={theme === 'dark' ? <Settings className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                  title="Dark Mode"
                  description="Switch between light and dark theme"
                  checked={theme === 'dark'}
                  onChange={() => toggleTheme()}
                />
              </div>

              <Button
                onClick={() => {
                  toast({ title: 'Preferences saved', description: 'Your notification settings have been updated.' })
                }}
                className="w-full mt-2"
              >
                Save Preferences
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ToggleRow({ icon, title, description, checked, onChange }: {
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 bg-muted/30 rounded-lg">
      <div className="flex items-start gap-2 flex-1">
        <span className="text-muted-foreground mt-0.5">{icon}</span>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
