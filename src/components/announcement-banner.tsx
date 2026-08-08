'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Megaphone, X, AlertTriangle } from 'lucide-react'

/**
 * Public announcement banner shown at the very top of the page.
 * Fetches from /api/admin/announcement (no auth required).
 * If maintenance mode is on, shows a red banner that blocks the page.
 */
export function AnnouncementBanner() {
  const [data, setData] = useState<{ announcement: string; maintenanceMode: boolean } | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const { user, setView } = useAppStore()

  useEffect(() => {
    fetch('/api/admin/announcement')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data) return null

  // Maintenance mode: full-screen block (admins can still access)
  if (data.maintenanceMode && !user?.isAdmin) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-red-500/15 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Under Maintenance</h1>
          <p className="text-sm text-muted-foreground mb-6">
            CrypEx is undergoing scheduled maintenance to improve your trading experience.
            We'll be back online shortly. Thank you for your patience.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Announcement banner (dismissible)
  if (data.announcement && !dismissed) {
    return (
      <div className="bg-gradient-to-r from-yellow-500/15 via-orange-500/15 to-yellow-500/15 border-b border-yellow-500/30 px-3 py-2">
        <div className="container mx-auto max-w-7xl flex items-center justify-center gap-2 text-sm">
          <Megaphone className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
          <span className="text-foreground/90">{data.announcement}</span>
          <button
            onClick={() => setDismissed(true)}
            className="ml-2 text-muted-foreground hover:text-foreground flex-shrink-0"
            aria-label="Dismiss announcement"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return null
}
