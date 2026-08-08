'use client'

import { useState, useEffect, useRef } from 'react'
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
import {
  Shield, ShieldCheck, ShieldAlert, Clock, XCircle, CheckCircle2, FileText, Upload, AlertCircle, ImageIcon, X,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { compressImageToBase64, formatFileSize } from '@/lib/image-compression'

interface KycDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

const ID_TYPES = ['Passport', 'National ID', 'Driver License', 'Residence Permit']
import { COUNTRIES } from '@/lib/countries'

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
  })
  const [documentFront, setDocumentFront] = useState<{ data: string; name: string; originalSize: number; compressedSize: number } | null>(null)
  const [documentBack, setDocumentBack] = useState<{ data: string; name: string; originalSize: number; compressedSize: number } | null>(null)
  const [compressing, setCompressing] = useState(false)
  const fileFrontRef = useRef<HTMLInputElement>(null)
  const fileBackRef = useRef<HTMLInputElement>(null)

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
        })
      }
    } catch {}
  }

  useEffect(() => {
    if (open) loadKyc()
  }, [open])

  // Handle image upload with client-side compression
  const handleImageUpload = async (file: File, side: 'front' | 'back') => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file (JPG, PNG, etc.)', variant: 'destructive' })
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 20MB', variant: 'destructive' })
      return
    }
    setCompressing(true)
    try {
      const originalSize = file.size
      // Compress: max 1600px, JPEG quality 0.8 (good balance for documents)
      const compressed = await compressImageToBase64(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.8,
        mimeType: 'image/jpeg',
      })
      // Calculate compressed size (base64 string length * 0.75 ≈ byte size)
      const compressedSize = Math.round((compressed.length - 'data:image/jpeg;base64,'.length) * 0.75)
      const docData = {
        data: compressed,
        name: file.name,
        originalSize,
        compressedSize,
      }
      if (side === 'front') {
        setDocumentFront(docData)
      } else {
        setDocumentBack(docData)
      }
      const savings = Math.round((1 - compressedSize / originalSize) * 100)
      toast({
        title: 'Image compressed',
        description: `${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${savings}% smaller)`,
      })
    } catch (e: any) {
      toast({ title: 'Compression failed', description: e.message, variant: 'destructive' })
    } finally {
      setCompressing(false)
    }
  }

  const submit = async () => {
    if (!form.fullName || !form.dateOfBirth || !form.nationality || !form.idType) {
      toast({ title: 'All fields are required', variant: 'destructive' })
      return
    }
    if (!documentFront) {
      toast({ title: 'Document photo required', description: 'Please upload the front of your ID document', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          documentFront: documentFront.data,
          documentBack: documentBack?.data,
        }),
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
                <label className="text-xs font-medium text-muted-foreground">Nationality / Country</label>
                <Select value={form.nationality} onValueChange={(v) => setForm(f => ({ ...f, nationality: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select your country" /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">ID Type</label>
              <Select value={form.idType} onValueChange={(v) => setForm(f => ({ ...f, idType: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select your document type" /></SelectTrigger>
                <SelectContent>
                  {ID_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Document upload with client-side compression */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                ID Document Photos (will be compressed before upload)
              </label>

              {/* Front of document */}
              <input
                ref={fileFrontRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], 'front') }}
              />
              {documentFront ? (
                <div className="relative border border-border rounded-lg overflow-hidden">
                  <img src={documentFront.data} alt="Document front" className="w-full h-32 object-cover" />
                  <button
                    onClick={() => setDocumentFront(null)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                    Front · {formatFileSize(documentFront.compressedSize)}
                    <span className="text-green-400 ml-1">({Math.round((1 - documentFront.compressedSize / documentFront.originalSize) * 100)}% smaller)</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileFrontRef.current?.click()}
                  disabled={compressing}
                  className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition disabled:opacity-50"
                >
                  {compressing ? (
                    <>
                      <div className="animate-spin h-5 w-5 mx-auto border-2 border-primary border-t-transparent rounded-full mb-1" />
                      <p className="text-xs text-muted-foreground">Compressing...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs font-medium">Upload Front of ID</p>
                      <p className="text-xs text-muted-foreground">JPG/PNG · auto-compressed</p>
                    </>
                  )}
                </button>
              )}

              {/* Back of document (optional) */}
              <input
                ref={fileBackRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], 'back') }}
              />
              {documentBack ? (
                <div className="relative border border-border rounded-lg overflow-hidden">
                  <img src={documentBack.data} alt="Document back" className="w-full h-32 object-cover" />
                  <button
                    onClick={() => setDocumentBack(null)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                    Back · {formatFileSize(documentBack.compressedSize)}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileBackRef.current?.click()}
                  disabled={compressing}
                  className="w-full border-2 border-dashed border-border rounded-lg p-3 text-center hover:border-primary/50 transition disabled:opacity-50"
                >
                  <ImageIcon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Upload Back of ID (optional)</p>
                </button>
              )}
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
