'use client'

import { useState, useEffect } from 'react'
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
  Shield, ShieldCheck, ShieldAlert, Clock, XCircle, CheckCircle2, FileText, Upload, AlertCircle,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface KycDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

const ID_TYPES = ['Passport', 'National ID', 'Driver License', 'Residence Permit']
const NATIONALITIES = [
  'Ethiopian', 'Kenyan', 'Nigerian', 'South African', 'Egyptian', 'Ghanaian',
  'American', 'British', 'European', 'Indian', 'Chinese', 'Japanese', 'Other',
]

export function KycDialog({ open, onClose, onSuccess }: KycDialogProps) {
  const { user, setUser } = useAppStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [kycData, setKycData] = useState<any>(null)
  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '',
    nationality: '',
    idType: '',
    idNumber: '',
    address: '',
  })

  // Load current KYC status
  const loadKyc = async () => {
    try {
      const res = await fetch('/api/kyc/submit')
      const d = await res.json()
      if (d.error) return
      setKycData(d)
      // Pre-fill form if data exists
      if (d.kycFullName) {
        setForm({
          fullName: d.kycFullName || '',
          dateOfBirth: d.kycDateOfBirth || '',
          nationality: d.kycNationality || '',
          idType: d.kycIdType || '',
          idNumber: d.kycIdNumber || '',
          address: d.kycAddress || '',
        })
      }
    } catch {}
  }

  useEffect(() => {
    if (open) loadKyc()
  }, [open])

  const submit = async () => {
    if (!form.fullName || !form.dateOfBirth || !form.nationality || !form.idType || !form.idNumber || !form.address) {
      toast({ title: 'All fields are required', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      toast({
        title: 'KYC Submitted',
        description: d.message,
      })
      // Update user state
      if (user) {
        setUser({ ...user, kycStatus: 'PENDING', kycVerified: false, kycLevel: 0 })
      }
      onSuccess?.()
      onClose()
    } catch (e: any) {
      toast({ title: 'Submission failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const status = kycData?.kycStatus || user?.kycStatus || 'NONE'
  const isVerified = kycData?.kycVerified || user?.kycVerified
  const kycLevel = kycData?.kycLevel || user?.kycLevel || 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Account Verification (KYC)
          </DialogTitle>
          <DialogDescription>
            Complete identity verification to unlock trading, withdrawals, and P2P features.
          </DialogDescription>
        </DialogHeader>

        {/* Status banner */}
        <div className={`rounded-lg p-3 border ${
          status === 'APPROVED' ? 'bg-green-500/10 border-green-500/30' :
          status === 'PENDING' ? 'bg-yellow-500/10 border-yellow-500/30' :
          status === 'REJECTED' ? 'bg-red-500/10 border-red-500/30' :
          'bg-muted/30 border-border'
        }`}>
          <div className="flex items-center gap-2">
            {status === 'APPROVED' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {status === 'PENDING' && <Clock className="h-5 w-5 text-yellow-500" />}
            {status === 'REJECTED' && <XCircle className="h-5 w-5 text-red-500" />}
            {status === 'NONE' && <ShieldAlert className="h-5 w-5 text-muted-foreground" />}
            <div className="flex-1">
              <div className="font-medium text-sm">
                {status === 'APPROVED' && `Verified (Level ${kycLevel})`}
                {status === 'PENDING' && 'Under Review'}
                {status === 'REJECTED' && 'Verification Rejected'}
                {status === 'NONE' && 'Not Submitted'}
              </div>
              <div className="text-xs text-muted-foreground">
                {status === 'APPROVED' && `Approved on ${kycData?.kycReviewedAt ? formatDateTime(kycData.kycReviewedAt) : 'N/A'}`}
                {status === 'PENDING' && `Submitted on ${kycData?.kycSubmittedAt ? formatDateTime(kycData.kycSubmittedAt) : 'N/A'} · Waiting for admin review`}
                {status === 'REJECTED' && `Rejected: ${kycData?.kycRejectionReason || 'Did not meet requirements'}`}
                {status === 'NONE' && 'Submit your documents below to start verification'}
              </div>
            </div>
          </div>
        </div>

        {/* If approved, show verified state */}
        {status === 'APPROVED' ? (
          <div className="space-y-3">
            <div className="bg-card border border-border rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Full Name</span><span className="font-medium">{kycData?.kycFullName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date of Birth</span><span>{kycData?.kycDateOfBirth}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Nationality</span><span>{kycData?.kycNationality}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ID Type</span><span>{kycData?.kycIdType}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ID Number</span><span className="font-mono">{kycData?.kycIdNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span className="text-right max-w-[200px]">{kycData?.kycAddress}</span></div>
            </div>
            <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
          </div>
        ) : status === 'PENDING' ? (
          <div className="space-y-3">
            <div className="text-center py-4">
              <Clock className="h-10 w-10 mx-auto text-yellow-500 mb-2 animate-pulse" />
              <p className="text-sm font-medium">Your verification is being reviewed</p>
              <p className="text-xs text-muted-foreground mt-1">
                This usually takes 1-2 business days. You'll be notified once approved.
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
          </div>
        ) : (
          /* Show form for NONE or REJECTED status */
          <div className="space-y-3">
            {status === 'REJECTED' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded p-2 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>Your previous submission was rejected. Please review and resubmit with correct information.</span>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground">Full Legal Name</label>
              <Input
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                placeholder="As shown on your ID"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Date of Birth</label>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nationality</label>
                <Select value={form.nationality} onValueChange={(v) => setForm(f => ({ ...f, nationality: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">ID Type</label>
                <Select value={form.idType} onValueChange={(v) => setForm(f => ({ ...f, idType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {ID_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">ID Number</label>
                <Input
                  value={form.idNumber}
                  onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))}
                  placeholder="ID number"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Residential Address</label>
              <Textarea
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Street, City, State, Zip Code, Country"
                rows={2}
                className="mt-1 text-sm"
              />
            </div>

            {/* Document upload placeholder */}
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Upload ID document photo (front & back)</p>
              <Button variant="ghost" size="sm" className="mt-2 text-xs" disabled>
                <FileText className="h-3 w-3 mr-1" /> Choose File (demo)
              </Button>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-xs text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              Your verification will be reviewed by our admin team. You'll be notified once approved.
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={submit}
                disabled={loading}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
              >
                {loading ? 'Submitting...' : 'Submit for Review'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
