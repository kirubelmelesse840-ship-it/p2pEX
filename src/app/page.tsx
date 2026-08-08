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

export default function Home() {
  const { view, user, setUser, theme } = useAppStore()

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
        if (data.user) setUser(data.user)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {view === 'home' && <HomeView />}
        {view === 'markets' && <MarketsView />}
        {view === 'spot' && <SpotView />}
        {view === 'p2p' && <P2PView />}
        {view === 'wallet' && <WalletView />}
      </main>
      <Footer />
    </div>
  )
}
