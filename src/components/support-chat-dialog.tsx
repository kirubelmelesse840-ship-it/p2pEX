'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Send, Image as ImageIcon, Mic, Video, X, Play, Pause, Headphones, Square } from 'lucide-react'
interface Props { open: boolean; onClose: () => void }
export function SupportChatDialog({ open, onClose }: Props) {
  const { user } = useAppStore()
  const { toast } = useToast()
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [viewer, setViewer] = useState<string | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [recTime, setRecTime] = useState(0)
  const mr = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const fImg = useRef<HTMLInputElement>(null)
  const fVid = useRef<HTMLInputElement>(null)
  const load = useCallback(async () => { if (!user) return; try { const r = await fetch('/api/support?markRead=true'); const text = await r.text(); if (!text) return; const d = JSON.parse(text); if (!d.error) setMessages(d.messages || []) } catch {} }, [user])
  useEffect(() => { if (open && user) { load(); const t = setInterval(load, 8000); return () => clearInterval(t) } }, [open, user, load])
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight }, [messages])
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); if (stream.current) stream.current.getTracks().forEach(t => t.stop()); if (audio.current) audio.current.pause() }, [])
  const send = async (type: string, data?: any) => {
    if (type === 'text' && !text.trim()) return
    setBusy(true)
    try {
      const body: any = { type, message: type === 'text' ? text.trim() : (data?.message || '') }
      if (data?.imageData) body.imageData = data.imageData
      if (data?.voiceData) body.voiceData = data.voiceData
      if (data?.videoData) body.videoData = data.videoData
      const r = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const rt = await r.text(); if (!rt) throw new Error('Server returned empty response'); const d = JSON.parse(rt); if (d.error) throw new Error(d.error)
      if (type === 'text') setText('')
      await load()
    } catch (e: any) { toast({ title: 'Send failed', description: e.message, variant: 'destructive' }) } finally { setBusy(false) }
  }
  const startRec = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.current = s; chunks.current = []
      let mt = 'audio/webm'; if (!MediaRecorder.isTypeSupported(mt)) { mt = 'audio/mp4'; if (!MediaRecorder.isTypeSupported(mt)) mt = '' }
      const r = mt ? new MediaRecorder(s, { mimeType: mt }) : new MediaRecorder(s); mr.current = r
      r.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data) }
      r.onstop = async () => { const b = new Blob(chunks.current, { type: mt || 'audio/webm' }); if (b.size > 5e6) { toast({ title: 'Too long', description: 'Keep under 1 min', variant: 'destructive' }); return } const rd = new FileReader(); rd.onload = async () => await send('voice', { voiceData: rd.result as string, message: 'Voice' }); rd.readAsDataURL(b); if (stream.current) { stream.current.getTracks().forEach(t => t.stop()); stream.current = null } }
      r.start(1000); setRecording(true); setRecTime(0)
      timer.current = setInterval(() => setRecTime(p => { if (p >= 60) { stopRec(); return 60 }; return p + 1 }), 1000)
    } catch { toast({ title: 'Mic denied', description: 'Allow microphone access', variant: 'destructive' }) }
  }
  const stopRec = () => { if (mr.current?.state === 'recording') mr.current.stop(); setRecording(false); if (timer.current) { clearInterval(timer.current); timer.current = null } }
  const cancelRec = () => { if (mr.current?.state === 'recording') { mr.current.onstop = null; mr.current.stop() } setRecording(false); setRecTime(0); if (timer.current) { clearInterval(timer.current); timer.current = null }; if (stream.current) { stream.current.getTracks().forEach(t => t.stop()); stream.current = null } }
  const onImg = (f: File) => { const r = new FileReader(); r.onload = () => { const b = r.result as string; const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); const m = 600; let { width: w, height: h } = img; if (w > h && w > m) { h = h * m / w; w = m } else if (h > m) { w = w * m / h; h = m }; c.width = w; c.height = h; c.getContext('2d')?.drawImage(img, 0, 0, w, h); send('image', { imageData: c.toDataURL('image/jpeg', 0.6), message: f.name }) }; img.src = b }; r.readAsDataURL(f) }
  const onVid = (f: File) => { if (f.size > 3e6) { toast({ title: 'Too large', description: 'Under 3MB', variant: 'destructive' }); return } const r = new FileReader(); r.onload = () => send('video', { videoData: r.result as string, message: f.name }); r.readAsDataURL(f) }
  const play = (d: string, id: string) => { if (playing === id) { audio.current?.pause(); setPlaying(null); return } if (audio.current) audio.current.pause(); try { const b = d.includes(',') ? d.split(',')[1] : d; const m = d.match(/data:(.*?);/)?.[1] || 'audio/webm'; const bs = atob(b); const ab = new ArrayBuffer(bs.length); const ia = new Uint8Array(ab); for (let i = 0; i < bs.length; i++) ia[i] = bs.charCodeAt(i); audio.current = new Audio(URL.createObjectURL(new Blob([ab], { type: m }))); audio.current.onended = () => setPlaying(null); audio.current.onerror = () => setPlaying(null); audio.current.play().catch(() => setPlaying(null)); setPlaying(id) } catch {} }
  if (!open) return null
  const ft = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const fd = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent 
          className="sm:max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col border-2 border-amber-500/50" 
          style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.50), rgba(245,158,11,0.22))', boxShadow: '0 0 0 1px rgba(245,158,11,0.60), 0 4px 12px -4px rgba(0,0,0,0.4), 0 0 12px -2px rgba(245,158,11,0.45)' }}
        >
          <DialogTitle className="sr-only">Support Chat</DialogTitle>
          <div className="flex items-center gap-2 p-3 border-b border-border bg-gradient-to-r from-yellow-500/10 to-orange-500/10 flex-shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white"><Headphones className="h-5 w-5" /></div>
            <div className="flex-1"><p className="font-medium text-base">P2PEX Support</p><p className="text-xs text-green-500">● Online</p></div>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
          </div>
          <div ref={scroll} className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0" style={{ minHeight: '400px', maxHeight: '65vh' }}>
            {messages.length === 0 ? (<div className="text-center py-8 text-muted-foreground"><Headphones className="h-12 w-12 mx-auto mb-2 opacity-30" /><p className="text-sm font-medium">No messages yet</p><p className="text-xs">Send a message, image, voice, or video</p></div>) : messages.map(m => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl p-3 ${m.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {m.type === 'text' && <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{m.message}</p>}
                  {m.type === 'image' && m.imageData && <img src={m.imageData} alt="img" className="rounded-lg max-w-full max-h-48 cursor-pointer" onClick={() => setViewer(m.imageData)} />}
                  {m.type === 'voice' && m.voiceData && <button onClick={() => play(m.voiceData, m.id)} className="flex items-center gap-2 p-1.5 w-full">{playing === m.id ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}<span className="text-xs">Voice</span></button>}
                  {m.type === 'video' && m.videoData && <video src={m.videoData} controls className="rounded-lg max-w-full max-h-48" />}
                  <p className={`text-[10px] mt-1 ${m.sender === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{fd(m.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          {recording && (<div className="flex items-center gap-2 p-2 bg-red-500/10 border-t border-red-500/30 flex-shrink-0"><span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" /><span className="text-sm text-red-500 font-medium flex-1">Recording {ft(recTime)}</span><button onClick={cancelRec} className="text-xs px-2 py-1 rounded text-muted-foreground hover:bg-muted">Cancel</button><button onClick={stopRec} className="text-xs px-3 py-1 rounded bg-red-500 text-white font-medium">Send</button></div>)}
          <div className="border-t border-border p-2 flex-shrink-0 bg-card">
            <div className="flex items-center gap-1">
              <input ref={fImg} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) onImg(e.target.files[0]); e.target.value = '' }} />
              <input ref={fVid} type="file" accept="video/*" className="hidden" onChange={e => { if (e.target.files?.[0]) onVid(e.target.files[0]); e.target.value = '' }} />
              <button onClick={() => fImg.current?.click()} disabled={busy || recording} className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 flex-shrink-0"><ImageIcon className="h-5 w-5" /></button>
              <button onClick={recording ? stopRec : startRec} disabled={busy} className={`p-2 rounded-lg hover:bg-muted flex-shrink-0 ${recording ? 'text-red-500' : ''}`}>{recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</button>
              <button onClick={() => fVid.current?.click()} disabled={busy || recording} className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 flex-shrink-0"><Video className="h-5 w-5" /></button>
              <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !busy && !recording) send('text') }} placeholder={recording ? 'Recording...' : 'Type a message...'} className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-border bg-background text-sm" disabled={busy || recording} />
              <button onClick={() => send('text')} disabled={busy || recording || !text.trim()} className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 flex-shrink-0"><Send className="h-5 w-5" /></button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {viewer && (<div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={() => setViewer(null)}><button className="absolute top-4 right-4 text-white p-2 z-10" onClick={() => setViewer(null)}><X className="h-8 w-8" /></button><img src={viewer} alt="Full" className="max-w-full max-h-full object-contain" /></div>)}
    </>
  )
}
