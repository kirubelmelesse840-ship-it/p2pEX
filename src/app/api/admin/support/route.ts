/**
 * GET /api/admin/support - list conversations OR get messages for a user
 * POST /api/admin/support - admin replies to a user (text, image, or voice)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    const { error, status } = await requireAdmin(req as unknown as Request)
    if (error) return NextResponse.json({ error }, { status })

    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')

    if (userId) {
      const messages = await db.supportMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        take: 200,
      })
      await db.supportMessage.updateMany({
        where: { userId, sender: 'user', isRead: false },
        data: { isRead: true },
      })
      return NextResponse.json({ messages })
    }

    // Fetch all support messages, group by userId in JS
    const allMessages = await db.supportMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        user: { select: { id: true, name: true, email: true, userId: true, username: true } },
      },
    })
    // Group by userId
    const convMap = new Map()
    for (const msg of allMessages) {
      const userId = msg.userId
      if (!convMap.has(userId)) {
        convMap.set(userId, {
          userId,
          user: msg.user,
          lastMessage: msg.type === 'text' ? msg.message : msg.type === 'image' ? '[Image]' : msg.type === 'voice' ? '[Voice]' : msg.type === 'video' ? '[Video]' : '[Message]',
          lastSender: msg.sender,
          lastTime: msg.createdAt,
          messageCount: 1,
          unreadCount: 0,
        })
      } else {
        const conv = convMap.get(userId)
        conv.messageCount++
        if (msg.sender === 'user' && !msg.isRead) conv.unreadCount++
      }
    }
    const conversations = Array.from(convMap.values()).sort((a, b) => b.lastTime.getTime() - a.lastTime.getTime())
    return NextResponse.json({ conversations })

  } catch (e: any) {
    console.error('[admin route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
// AUTO-TRY-CATCH
  try {

    const { error, status } = await requireAdmin(req as unknown as Request)
    if (error) return NextResponse.json({ error }, { status })

    const body = await req.json()
    const { userId, message, type, imageData, voiceData, videoData } = body

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const msg = await db.supportMessage.create({
      data: {
        userId,
        sender: 'admin',
        message: message?.trim() || '',
        type: type || 'text',
        imageData: imageData || null,
        voiceData: voiceData || null,
        videoData: videoData || null,
      },
    })

    // Send push notification to the user (text-only messages; for media, show generic message)
    try {
      const { sendPushToUser } = await import('@/lib/push')
      const pushBody = type === 'text'
        ? (message?.trim() || 'New message')
        : type === 'image' ? '📷 Sent you an image'
        : type === 'voice' ? '🎤 Sent you a voice message'
        : type === 'video' ? '🎥 Sent you a video'
        : 'New message'
      sendPushToUser(userId, { title: '💬 Support Reply', body: pushBody, url: '/', tag: 'support' }).catch((e) => console.error('[push] support reply:', e))
    } catch (e) {
      console.error('[push] failed to load push lib:', e)
    }

    return NextResponse.json({ message: msg })

  } catch (e: any) {
    console.error('[admin route error]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
