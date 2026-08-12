'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Download, X, Smartphone, Bell, Share } from 'lucide-react'
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
  const [platform, setPlatform] = useState<'android-chrome' | 'ios-safari' | 'android-edge' | 'desktop' | 'other'>('other')
  const { toast } = useToast()

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true)
      return
    }

    // Detect platform
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isAndroid = /Android/i.test(ua)
    const isChrome = /Chrome/i.test(ua) && !/Edg/i.test(ua) && !/OPR/i.test(ua)
    const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua) && !/CriOS/i.test(ua)
    const isEdge = /Edg/i.test(ua)
    const isCriOS = /CriOS/i.test(ua) // Chrome on iOS

    if (isIOS && (isSafari || isCriOS)) setPlatform('ios-safari')
    else if (isAndroid && isChrome) setPlatform('android-chrome')
    else if (isAndroid && isEdge) setPlatform('android-edge')
    else if (!isIOS && !isAndroid) setPlatform('desktop')
    else setPlatform('other')

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show the install banner after 2 seconds
      setTimeout(() => {
        if (!sessionStorage.getItem('p2pex-install-dismissed')) {
          setShowBanner(true)
        }
      }, 2000)
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
    // If the browser supports beforeinstallprompt, use it immediately
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === 'accepted') {
          toast({
            title: 'Installing... 📲',
            description: 'P2PEX is being added to your home screen.',
          })
        }
      } catch {}
      setDeferredPrompt(null)
      setShowBanner(false)
      setShowDialog(false)
      return
    }

    // No beforeinstallprompt — show platform-specific instructions
    setShowDialog(true)
  }

  const dismissBanner = () => {
    setShowBanner(false)
    sessionStorage.setItem('p2pex-install-dismissed', '1')
  }

  if (isInstalled) return null

  const platformInstructions = {
    'android-chrome': {
      title: 'Install on Android (Chrome)',
      steps: [
        'Tap the 3-dot menu (⋮) at the top right',
        'Tap "Add to Home screen"',
        'Tap "Add" to confirm',
      ],
    },
    'android-edge': {
      title: 'Install on Android (Edge)',
      steps: [
        'Tap the 3-dot menu at the bottom right',
        'Tap "Add to phone"',
        'Tap "Install"',
      ],
    },
    'ios-safari': {
      title: 'Install on iPhone/iPad',
      steps: [
        'Tap the Share button (square with up arrow) at the bottom',
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" to confirm',
      ],
    },
    'desktop': {
      title: 'Install on Desktop',
      steps: [
        'Look for the install icon (⊕) in the address bar',
        'Click it and select "Install"',
        'Or click the 3-dot menu → "Install P2PEX"',
      ],
    },
    'other': {
      title: 'Install P2PEX',
      steps: [
        'Open your browser menu',
        'Look for "Add to Home Screen" or "Install app"',
        'Follow the prompts to install',
      ],
    },
  }

  const instructions = platformInstructions[platform]

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
        onClick={handleInstall}
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">App</span>
      </Button>

      {/* Install dialog — shows platform-specific instructions */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              {instructions.title}
            </DialogTitle>
            <DialogDescription>
              Follow these steps to install P2PEX on your device
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

            {/* Platform-specific instructions */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                How to install:
              </p>
              <ol className="space-y-2">
                {instructions.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* For iOS — show Share icon hint */}
            {platform === 'ios-safari' && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs">
                <p className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-medium">
                  <Share className="h-4 w-4" />
                  Look for the Share button at the bottom of Safari
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Close</Button>
            {deferredPrompt && (
              <Button
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                onClick={async () => {
                  try {
                    await deferredPrompt.prompt()
                    await deferredPrompt.userChoice
                  } catch {}
                  setDeferredPrompt(null)
                  setShowDialog(false)
                  setShowBanner(false)
                }}
              >
                <Download className="h-4 w-4 mr-1.5" /> Install Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
