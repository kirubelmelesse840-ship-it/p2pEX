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
import { AutoPushRegister } from '@/components/auto-push-register'

export default function Home() {
  const { view, user, setUser, theme, setView } = useAppStore()

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
    if (typeof window !== 'undefined') {
      const preventInstall = (e: Event) => { e.preventDefault() }
      window.addEventListener('beforeinstallprompt', preventInstall)
    }
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
    }
    fetch('/api/auth', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
          if (data.user.isAdmin) setView('admin')
        }
      })
      .catch(() => {})
  }, [])

  const isAdmin = user?.isAdmin
  const effectiveView = isAdmin ? 'admin' : view

  // Keep all views mounted — just hide with CSS. This prevents re-fetching
  // when switching tabs, making navigation instant.
  const showHome = effectiveView === 'home'
  const showMarkets = effectiveView === 'markets'
  const showSpot = effectiveView === 'spot'
  const showP2P = effectiveView === 'p2p'
  const showWallet = effectiveView === 'wallet'
  const showAdmin = effectiveView === 'admin'

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AnnouncementBanner />
      <Navbar />
      <main className={`flex-1 flex flex-col ${isAdmin ? '' : 'pb-16 md:pb-0'}`}>
        <div className="flex-1 flex flex-col">
          <div style={{ display: showHome ? 'flex' : 'none' }} className="flex-1 flex flex-col">
            <HomeView />
          </div>
          <div style={{ display: showMarkets ? 'flex' : 'none' }} className="flex-1 flex flex-col">
            <MarketsView />
          </div>
          <div style={{ display: showSpot ? 'flex' : 'none' }} className="flex-1 flex flex-col">
            <SpotView />
          </div>
          <div style={{ display: showP2P ? 'flex' : 'none' }} className="flex-1 flex flex-col">
            <P2PView />
          </div>
          <div style={{ display: showWallet ? 'flex' : 'none' }} className="flex-1 flex flex-col">
            <WalletView />
          </div>
          <div style={{ display: showAdmin ? 'flex' : 'none' }} className="flex-1 flex flex-col">
            <AdminView />
          </div>
        </div>
      </main>
      <Footer />
      {!isAdmin && <PushNotificationProvider />}
      <AutoPushRegister />
    </div>
  )
}
