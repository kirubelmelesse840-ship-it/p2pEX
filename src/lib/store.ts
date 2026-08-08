/**
 * Zustand store for global exchange state:
 * - current user
 * - active trading pair (symbol)
 * - active view (markets | spot | p2p | wallet)
 * - theme
 * - favorites
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type View = 'home' | 'markets' | 'spot' | 'p2p' | 'wallet'

interface User {
  id: string
  email: string
  name: string
  kycVerified: boolean
  kycLevel: number
  fiatCurrency: string
}

interface AppState {
  // Auth
  user: User | null
  setUser: (user: User | null) => void

  // Navigation
  view: View
  setView: (v: View) => void

  // Active trading pair
  symbol: string
  setSymbol: (s: string) => void

  // Theme
  theme: 'light' | 'dark'
  toggleTheme: () => void

  // Favorites
  favorites: string[]
  toggleFavorite: (symbol: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),

      view: 'home',
      setView: (view) => set({ view }),

      symbol: 'BTCUSDT',
      setSymbol: (symbol) => set({ symbol }),

      theme: 'dark',
      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark'
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', newTheme === 'dark')
        }
        set({ theme: newTheme })
      },

      favorites: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
      toggleFavorite: (symbol) => {
        const favs = get().favorites
        set({
          favorites: favs.includes(symbol)
            ? favs.filter(s => s !== symbol)
            : [...favs, symbol],
        })
      },
    }),
    {
      name: 'crypex-store',
      partialize: (state) => ({
        symbol: state.symbol,
        theme: state.theme,
        favorites: state.favorites,
      }),
    }
  )
)
