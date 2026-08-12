'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Download, X, Smartphone, Bell } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true)
      return
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show the install banner after 3 seconds
      setTimeout(() => {
        if (!sessionStorage.getItem('p2pex-install-dismissed')) {
          setShowBanner(true)
        }
      }, 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowBanner(false)
      toast({
        title: 'App Installed! 🎉',
        description: 'P2PEX has been added to your home screen.',
      })
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [toast])

  const handleInstall = async () => {
    // If the browser supports beforeinstallprompt, use it (Chrome Android, Edge)
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        toast({
          title: 'Installing... 📲',
          description: 'P2PEX is being added to your home screen.',
        })
      }
      setDeferredPrompt(null)
      setShowBanner(false)
      setShowDialog(false)
      return
    }

    // Detect platform and show appropriate instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isAndroid = /Android/i.test(navigator.userAgent)
    const isChrome = /Chrome/i.test(navigator.userAgent) && !/Edg/i.test(navigator.userAgent)
    const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent)
    const isEdge = /Edg/i.test(navigator.userAgent)

    if (isIOS && isSafari) {
      toast({
        title: 'Install on iPhone/iPad 📱',
        description: 'Tap the Share button (square with arrow) at the bottom → scroll down → tap "Add to Home Screen" → tap "Add".',
        duration: 10000,
      })
    } else if (isAndroid && isChrome) {
      toast({
        title: 'Install on Android 📱',
        description: 'Tap the 3-dot menu (⋮) at the top right → tap "Add to Home screen" → tap "Add".',
        duration: 10000,
      })
    } else if (isAndroid && isEdge) {
      toast({
        title: 'Install on Edge Android 📱',
        description: 'Tap the 3-dot menu → tap "Add to phone" → tap "Install".',
        duration: 10000,
      })
    } else if (isChrome || isEdge) {
      toast({
        title: 'Install on Desktop 💻',
        description: 'Look for the install icon (⊕) in the address bar, or click the 3-dot menu → "Install P2PEX".',
        duration: 10000,
      })
    } else {
      toast({
        title: 'Install P2PEX 📲',
        description: 'Open your browser menu and look for "Add to Home Screen" or "Install app".',
        duration: 10000,
      })
    }
    setShowDialog(false)
  }

  const dismissBanner = () => {
    setShowBanner(false)
    sessionStorage.setItem('p2pex-install-dismissed', '1')
  }

  if (isInstalled) return null

  return (
    <>
      {/* Floating banner — large and prominent */}
      {showBanner && (
        <div className="fixed bottom-20 md:bottom-4 left-2 right-2 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white flex-shrink-0">
                <Smartphone className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-base">📲 Install P2PEX App</p>
                <p className="text-xs text-white/90 mt-0.5">
                  Get the app on your phone — faster access, works offline, push notifications!
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="h-9 text-sm bg-white text-orange-600 hover:bg-white/90 font-semibold" onClick={handleInstall}>
                    <Download className="h-4 w-4 mr-1.5" /> Install Now
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 text-sm text-white hover:bg-white/20" onClick={dismissBanner}>
                    Not now
                  </Button>
                </div>
              </div>
              <button onClick={dismissBanner} className="text-white/70 hover:text-white flex-shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install button (for navbar) — prominent with gradient */}
      <Button
        variant="default"
        size="sm"
        className="gap-1.5 text-xs bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold"
        onClick={() => setShowDialog(true)}
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">App</span>
      </Button>

      {/* Install dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Install P2PEX App
            </DialogTitle>
            <DialogDescription>
              Get the full app experience on your device
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium text-sm">P2PEX - Cryptocurrency Exchange</p>
                <p className="text-xs text-muted-foreground">Free • Works offline • Push notifications</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Download className="h-4 w-4 text-green-500" />
                <span>Install on your home screen for quick access</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Bell className="h-4 w-4 text-green-500" />
                <span>Get push notifications for trades and messages</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Smartphone className="h-4 w-4 text-green-500" />
                <span>Works in fullscreen — feels like a native app</span>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400">
              <p className="font-medium mb-1">How to install:</p>
              <ul className="space-y-0.5 text-muted-foreground">
                <li>• Click "Install" below (Chrome/Edge on Android)</li>
                <li>• Or use browser menu → "Add to Home Screen" (iPhone/Safari)</li>
                <li>• Or browser menu → "Install app" (Chrome desktop)</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
              onClick={handleInstall}
            >
              <Download className="h-4 w-4 mr-1.5" /> Install Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
