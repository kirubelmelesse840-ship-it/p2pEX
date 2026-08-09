'use client'

import { useAppStore, View } from '@/lib/store'
import { Bitcoin, TrendingUp, Users, Wallet, Home } from 'lucide-react'

const FOOTER_NAV: Array<{ id: View; label: string; icon: any }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'markets', label: 'Markets', icon: TrendingUp },
  { id: 'spot', label: 'Trade', icon: Bitcoin },
  { id: 'p2p', label: 'P2P', icon: Users },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
]

export function Footer() {
  const { view, setView, user } = useAppStore()
  const isAdmin = user?.isAdmin

  return (
    <>
      {/* Desktop footer — hidden for admins */}
      {!isAdmin && (
      <footer className="hidden md:block mt-auto border-t border-border bg-card">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
                  <Bitcoin className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold">P2PEX</span>
              </div>
              <p className="text-xs text-muted-foreground">
                The world's leading cryptocurrency exchange. Trade Bitcoin, Ethereum, USDT and 100+ digital assets with confidence.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Trade</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li><button onClick={() => { setView('spot'); }} className="hover:text-primary">Spot Trading</button></li>
                <li><button onClick={() => { setView('markets'); }} className="hover:text-primary">Markets</button></li>
                <li><button onClick={() => { setView('p2p'); }} className="hover:text-primary">P2P Marketplace</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Service</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li><button onClick={() => { setView('wallet'); }} className="hover:text-primary">Wallet</button></li>
                <li><button className="hover:text-primary">Deposit Crypto</button></li>
                <li><button className="hover:text-primary">Withdraw</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Support</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li><button className="hover:text-primary">Help Center</button></li>
                <li><button className="hover:text-primary">Trading Rules</button></li>
                <li><button className="hover:text-primary">Fees</button></li>
                <li><button className="hover:text-primary">API Docs</button></li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
            <p>© 2026 P2PEX. All rights reserved.</p>
            <div className="flex gap-3">
              <span className="hover:text-primary cursor-pointer">Terms</span>
              <span className="hover:text-primary cursor-pointer">Privacy</span>
              <span className="hover:text-primary cursor-pointer">Risk Disclosure</span>
            </div>
          </div>
        </div>
      </footer>
      )}

      {/* Mobile bottom navigation — hidden for admins */}
      {!isAdmin && (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-bottom">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
          {FOOTER_NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition ${
                view === item.id ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      )}
    </>
  )
}
