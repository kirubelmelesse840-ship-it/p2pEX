import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// Ensure this route runs in the Node.js runtime (not Edge) for full body support
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Allow large request bodies for images/voice/video (up to 50MB)
export const maxDuration = 60

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const url = new URL(req.url)
    const targetUserId = url.searchParams.get('userId')
    const markRead = url.searchParams.get('markRead') === 'true'
    if (user.isAdmin && targetUserId) {
      const messages = await db.supportMessage.findMany({ where: { userId: targetUserId }, orderBy: { createdAt: 'asc' }, take: 500 })
      await db.supportMessage.updateMany({ where: { userId: targetUserId, sender: 'user', isRead: false }, data: { isRead: true } })
      return NextResponse.json({ messages })
    }
    if (user.isAdmin) {
      const all = await db.supportMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 1000, include: { user: { select: { id: true, name: true, email: true, userId: true } } } })
      const map = new Map<string, any>()
      for (const m of all) { if (!map.has(m.userId)) map.set(m.userId, { userId: m.userId, userName: m.user.name, userEmail: m.user.email, userDisplayId: m.user.userId, lastMessage: m.type === 'text' ? m.message : `[${m.type}]`, lastTime: m.createdAt, unreadCount: 0 }); if (m.sender === 'user' && !m.isRead) map.get(m.userId).unreadCount++ }
      return NextResponse.json({ conversations: Array.from(map.values()).sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()) })
    }
    const messages = await db.supportMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' }, take: 500 })
    if (markRead) await db.supportMessage.updateMany({ where: { userId: user.id, sender: 'admin', isRead: false }, data: { isRead: true } })
    const unreadCount = messages.filter(m => m.sender === 'admin' && !m.isRead).length
    return NextResponse.json({ messages, unreadCount })
  } catch (e: any) {
    console.error('[support GET]', e)
    return NextResponse.json({ error: e.message || 'Internal error', messages: [], conversations: [], unreadCount: 0 }, { status: 500 })
  }
}
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req as unknown as Request)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    let body: any
    try {
      body = await req.json()
    } catch (parseErr: any) {
      console.error('[support POST] JSON parse error:', parseErr)
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { message, type, imageData, voiceData, videoData, userId: targetUserId } = body
    const msgType = type || 'text'
    if (msgType === 'text' && (!message || !message.trim())) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 })
    }

    if (user.isAdmin && targetUserId) {
      // Admin replying to a user
      const msg = await db.supportMessage.create({
        data: {
          userId: targetUserId,
          sender: 'admin',
          message: message?.trim() || '',
          type: msgType,
          imageData: imageData || null,
          voiceData: voiceData || null,
          videoData: videoData || null,
        },
      })
      // Send push notification to the user
      try {
        const { sendPushToUser } = await import('@/lib/push')
        sendPushToUser(targetUserId, {
          title: '💬 Support Reply',
          body: msgType === 'text' ? (message?.trim() || 'New message') : `New ${msgType}`,
          url: '/',
          tag: 'support',
        }).catch(() => {})
      } catch {}
      return NextResponse.json({ ok: true, message: msg })
    }

    // Regular user sending a message to admin
    const msg = await db.supportMessage.create({
      data: {
        userId: user.id,
        sender: 'user',
        message: message?.trim() || '',
        type: msgType,
        imageData: imageData || null,
        voiceData: voiceData || null,
        videoData: videoData || null,
      },
    })
    // Notify admin via email (best-effort)
    try {
      const m = await import('@/lib/admin-email-notifications')
      m.notifyAdminSupportMessage(user.name, user.email, user.userId, msgType === 'text' ? message.trim() : `[${msgType}]`)
    } catch {}
    return NextResponse.json({ ok: true, message: msg })
  } catch (e: any) {
    console.error('[support POST] error:', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
