'use client'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { BackButton } from '@/components/back-button'
interface Props { icon: React.ReactNode; title: string; description: string; features?: Array<{ icon: React.ReactNode; label: string }>; backTo?: 'home' | 'markets' }
export function SignupPrompt({ icon, title, description, features, backTo = 'home' }: Props) {
  const setAuthDialog = useAppStore(s => s.setAuthDialog)
  return (
    <div className="container mx-auto px-4 py-4 max-w-6xl w-full">
      <BackButton to={backTo} />
      <div className="max-w-md mx-auto py-8 text-center">
        <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white mb-4">{icon}</div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6" dangerouslySetInnerHTML={{ __html: description }} />
        <div className="space-y-2">
          <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white" onClick={() => setAuthDialog('signup')}>Create Account</Button>
          <Button variant="outline" className="w-full" onClick={() => setAuthDialog('login')}>Log In</Button>
        </div>
        {features && features.length > 0 && (
          <div className="mt-6 grid gap-2 text-xs text-muted-foreground" style={{ gridTemplateColumns: `repeat(${features.length}, minmax(0, 1fr))` }}>
            {features.map((f, i) => (<div key={i} className="p-2 bg-muted/30 rounded-lg"><div className="flex justify-center mb-1 text-primary">{f.icon}</div><p>{f.label}</p></div>))}
          </div>
        )}
      </div>
    </div>
  )
}
