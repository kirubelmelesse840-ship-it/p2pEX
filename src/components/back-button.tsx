'use client'

import { Button } from '@/components/ui/button'
import { useAppStore, View } from '@/lib/store'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  /** Where to go back to. Defaults to 'home'. */
  to?: View
  /** Optional custom label. If omitted, shows "Back to {destination}". */
  label?: string
  /** Optional className override */
  className?: string
}

const VIEW_LABELS: Record<View, string> = {
  home: 'Home',
  markets: 'Markets',
  spot: 'Trade',
  p2p: 'P2P',
  wallet: 'Wallet',
}

/**
 * A reusable back button shown at the top of secondary screens.
 * Clicking it switches the active view via the Zustand store.
 */
export function BackButton({ to = 'home', label, className = '' }: BackButtonProps) {
  const setView = useAppStore(s => s.setView)
  const text = label || `Back to ${VIEW_LABELS[to]}`
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setView(to)}
      className={`gap-1.5 -ml-2 text-muted-foreground hover:text-foreground ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {text}
    </Button>
  )
}
