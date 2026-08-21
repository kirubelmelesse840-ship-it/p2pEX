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

    const conversations = await db.supportMessage.groupBy({
      by: ['userId'],
      _max: { createdAt: true },
      _count: true,
    })

    const result = []
    for (const conv of conversations) {
      const u = await db.user.findUnique({
        where: { id: conv.userId },
        select: { id: true, userId: true, name: true, email: true, username: true },
      })
      const lastMsg = await db.supportMessage.findFirst({
        where: { userId: conv.userId },
        orderBy: { createdAt: 'desc' },
      })
      const unreadCount = await db.supportMessage.count({
        where: { userId: conv.userId, sender: 'user', isRead: false },
      })
      if (u) {
        result.push({
          user: u,
          lastMessage: lastMsg?.type === 'image' ? '[Image]' : lastMsg?.type === 'voice' ? '[Voice]' : lastMsg?.type === 'video' ? '[Video]' : lastMsg?.message || '',
          lastSender: lastMsg?.sender || '',
          lastTime: lastMsg?.createdAt || new Date(),
          messageCount: conv._count,
          unreadCount,
        })
      }
    }

    result.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime())
    return NextResponse.json({ conversations: result })

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
