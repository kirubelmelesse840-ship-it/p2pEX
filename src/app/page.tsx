'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { HomeView } from '@/components/views/home-view'
import { MarketsView } from '@/components/views/markets-view'
import { SpotView } from '@/components/views/spot-view'
import { P2PView } from '@/components/views/p2p-view'
import { WalletView } from '@/components/views/wallet-view'
import { AdminView } from '@/components/views/admin-view'
import { AnnouncementBanner } from '@/components/announcement-banner'
import { PushNotificationProvider } from '@/components/push-notification-provider'

export default function Home() {
  const { view, user, setUser, theme, setView } = useAppStore()

  // Restore session on mount
  useEffect(() => {
    // Set initial theme
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
    // Try to restore session
    fetch('/api/auth', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
          // If admin logs in, force them to the admin panel
          if (data.user.isAdmin) {
            setView('admin')
          }
        }
      })
      .catch(() => {})
  }, [])

  // If the user is an admin, always show the admin panel regardless of view
  const isAdmin = user?.isAdmin
  const effectiveView = isAdmin ? 'admin' : view

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AnnouncementBanner />
      <Navbar />
      <main className={`flex-1 ${isAdmin ? '' : 'pb-16 md:pb-0'}`}>
        {effectiveView === 'home' && <HomeView />}
        {effectiveView === 'markets' && <MarketsView />}
        {effectiveView === 'spot' && <SpotView />}
        {effectiveView === 'p2p' && <P2PView />}
        {effectiveView === 'wallet' && <WalletView />}
        {effectiveView === 'admin' && <AdminView />}
      </main>
      <Footer />
      {!isAdmin && <PushNotificationProvider />}
    </div>
  )
}
