/**
 * GET /api/support/messages - get the current user's chat with admin
 * POST /api/support/messages - user sends a message to admin (text, image, or voice)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req as unknown as Request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const messages = await db.supportMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })

  // Mark admin messages as read
  await db.supportMessage.updateMany({
    where: { userId: user.id, sender: 'admin', isRead: false },
    data: { isRead: true },
  })

  return NextResponse.json({ messages })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req as unknown as Request)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json()
  const { message, type, imageData, voiceData, videoData } = body

  if (type === 'text') {
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
  } else if (type === 'image') {
    if (!imageData) return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
  } else if (type === 'voice') {
    if (!voiceData) return NextResponse.json({ error: 'Voice data is required' }, { status: 400 })
  } else if (type === 'video') {
    if (!videoData) return NextResponse.json({ error: 'Video data is required' }, { status: 400 })
  } else {
    return NextResponse.json({ error: 'Invalid message type' }, { status: 400 })
  }

  const msg = await db.supportMessage.create({
    data: {
      userId: user.id,
      sender: 'user',
      message: message?.trim() || '',
      type: type || 'text',
      imageData: imageData || null,
      voiceData: voiceData || null,
      videoData: videoData || null,
    },
  })

  // Send email notification to admin about new support message (only for text messages)
  if (type === 'text' && message?.trim()) {
    import('@/lib/admin-email-notifications').then(m => {
      m.notifyAdminSupportMessage(user.name, user.email, user.userId, message.trim())
    }).catch(() => {})
  }

  return NextResponse.json({ message: msg })
}
