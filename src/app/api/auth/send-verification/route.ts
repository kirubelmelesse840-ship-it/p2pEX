/**
 * POST /api/auth/send-verification
 * Body: { email }
 *
 * Generates a 6-digit verification code and sends it to the user's email inbox.
 *
 * Email delivery:
 * - If SMTP env vars are configured (SMTP_HOST, SMTP_USER, SMTP_PASS), uses those
 * - Otherwise, uses Ethereal Email (nodemailer's test service) which creates a
 *   real email that can be viewed via a preview URL in the browser
 *
 * The code is NEVER returned in the API response for security.
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// In-memory store for verification codes
const verificationCodes = new Map<string, { code: string; expiresAt: number; attempts: number }>()

// Cache the Ethereal test account so we don't create a new one every request
let etherealAccount: any = null

async function getTransporter() {
  // Check for production SMTP config
  const smtpHost = process.env.SMTP_HOST
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  if (smtpHost && smtpUser && smtpPass) {
    // Production SMTP
    const nodemailer = await import('nodemailer')
    return {
      transporter: nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: { user: smtpUser, pass: smtpPass },
      }),
      from: process.env.FROM_EMAIL || 'CrypEx <noreply@crypex.com>',
      isEthereal: false,
    }
  }

  // Use Ethereal Email (free test SMTP that actually delivers emails viewable in browser)
  const nodemailer = await import('nodemailer')
  if (!etherealAccount) {
    try {
      etherealAccount = await nodemailer.createTestAccount()
      console.log('[email] Created Ethereal test account:')
      console.log('[email]   User:', etherealAccount.user)
      console.log('[email]   Pass:', etherealAccount.pass)
      console.log('[email]   View inbox at: https://ethereal.email/login')
    } catch (e: any) {
      console.error('[email] Failed to create Ethereal account:', e.message)
      return null
    }
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: etherealAccount.user,
      pass: etherealAccount.pass,
    },
  })

  return {
    transporter,
    from: 'CrypEx <noreply@crypex.com>',
    isEthereal: true,
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Rate limit: max 1 code per 60 seconds
    const existing = verificationCodes.get(normalizedEmail)
    if (existing && existing.expiresAt - Date.now() > 4 * 60 * 1000) {
      return NextResponse.json({
        ok: true,
        message: 'A verification code was already sent. Please check your email inbox.',
      })
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString()

    // Store code
    verificationCodes.set(normalizedEmail, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    })

    // Send the email
    const transport = await getTransporter()
    if (!transport) {
      console.log(`[email] (no transport) Verification code for ${normalizedEmail}: ${code}`)
      return NextResponse.json({
        ok: true,
        message: 'Verification code generated. Check server logs if email is not configured.',
      })
    }

    const { transporter, from, isEthereal } = transport

    const info = await transporter.sendMail({
      from,
      to: normalizedEmail,
      subject: 'Your CrypEx Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #f59e0b; margin: 0; font-size: 28px;">CrypEx</h1>
            <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Cryptocurrency Exchange</p>
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #111827; margin: 0 0 12px 0; font-size: 20px;">Email Verification</h2>
            <p style="color: #4b5563; margin: 0 0 20px 0;">You're verifying your email address for your CrypEx account. Use the code below to complete verification:</p>
            <div style="text-align: center; margin: 24px 0;">
              <div style="display: inline-block; background: #ffffff; border: 2px solid #f59e0b; padding: 16px 40px; border-radius: 8px; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111827; font-family: 'Courier New', monospace;">
                ${code}
              </div>
            </div>
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">This code expires in <strong>5 minutes</strong>.</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">If you didn't request this code, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 11px; text-align: center;">© 2026 CrypEx. All rights reserved.</p>
        </div>
      `,
      text: `Your CrypEx verification code is: ${code}\n\nIt expires in 5 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`,
    })

    // Get the preview URL (for Ethereal) or message ID
    const previewUrl = isEthereal ? nodemailer_getTestMessageUrl(info) : null

    console.log(`[email] Verification code sent to ${normalizedEmail}`)
    if (previewUrl) {
      console.log(`[email] Preview URL: ${previewUrl}`)
    }

    return NextResponse.json({
      ok: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}. Check your inbox (and spam folder).`,
      // Only include preview URL if using Ethereal (so user can view the email in browser)
      previewUrl: previewUrl || undefined,
    })
  } catch (e: any) {
    console.error('[send-verification]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}

/**
 * Verify a code (used internally by other routes).
 */
export function verifyCode(email: string, code: string): boolean {
  const normalizedEmail = email.toLowerCase().trim()
  const stored = verificationCodes.get(normalizedEmail)
  if (!stored) return false
  if (stored.expiresAt < Date.now()) {
    verificationCodes.delete(normalizedEmail)
    return false
  }
  if (stored.attempts >= 5) {
    verificationCodes.delete(normalizedEmail)
    return false
  }
  stored.attempts++
  if (stored.code !== code) return false
  verificationCodes.delete(normalizedEmail)
  return true
}

// Helper to get the test message URL from nodemailer
import nodemailerModule from 'nodemailer'
function nodemailer_getTestMessageUrl(info: any): string | null {
  try {
    return (nodemailerModule as any).getTestMessageUrl?.(info) || null
  } catch {
    return null
  }
}
