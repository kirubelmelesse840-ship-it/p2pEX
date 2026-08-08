'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore(s => s.theme)

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
  }, [theme])

  return <>{children}</>
}
