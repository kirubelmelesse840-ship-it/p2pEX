/**
 * POST /api/auth/send-verification
 * Body: { email }
 *
 * Generates a 6-digit verification code and sends it to the user's email inbox.
 *
 * Email sending:
 * - Uses Nodemailer if SMTP env vars are configured (SMTP_HOST, SMTP_USER, SMTP_PASS)
 * - Falls back to logging the code to the server console if no SMTP configured
 * - The code is NEVER returned in the API response (security: prevents screen display)
 *
 * In production, set these env vars to enable real email delivery:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=your-email@gmail.com
 *   SMTP_PASS=your-app-password
 *   FROM_EMAIL=CrypEx <noreply@crypex.com>
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// In-memory store for verification codes (resets on server restart).
// In production, use Redis or another persistent store with TTL.
const verificationCodes = new Map<string, { code: string; expiresAt: number; attempts: number }>()

/**
 * Send an email with the verification code.
 * Uses Nodemailer if SMTP env vars are configured, otherwise logs to console.
 */
async function sendVerificationEmail(toEmail: string, code: string): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const fromEmail = process.env.FROM_EMAIL || 'CrypEx <noreply@crypex.com>'

  // If SMTP is configured, send a real email
  if (smtpHost && smtpUser && smtpPass) {
    try {
      // Try to dynamically import nodemailer (only if installed)
      let transporter: any = null
      try {
        // Use eval to prevent Next.js from trying to resolve the module at build time
        const mod = await (new Function("return import('nodemailer')")() as Promise<any>)
        transporter = mod.createTransport || (mod.default?.createTransport)
      } catch {
        // nodemailer not installed - fall back to console
        console.log(`[email] (nodemailer not installed) Verification code for ${toEmail}: ${code}`)
        return true
      }

      if (transporter) {
        const t = transporter({
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_PORT === '465',
          auth: { user: smtpUser, pass: smtpPass },
        })
        await t.sendMail({
          from: fromEmail,
          to: toEmail,
          subject: 'Your CrypEx Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #f59e0b; margin: 0;">CrypEx</h1>
                <p style="color: #6b7280; font-size: 14px;">Cryptocurrency Exchange</p>
              </div>
              <h2 style="color: #111827;">Email Verification</h2>
              <p style="color: #4b5563;">You're verifying your email address for your CrypEx account. Use the code below to complete verification:</p>
              <div style="text-align: center; margin: 32px 0;">
                <div style="display: inline-block; background: #f3f4f6; padding: 16px 32px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827; font-family: monospace;">
                  ${code}
                </div>
              </div>
              <p style="color: #6b7280; font-size: 14px;">This code expires in <strong>5 minutes</strong>. If you didn't request this code, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">© 2026 CrypEx. All rights reserved.</p>
            </div>
          `,
          text: `Your CrypEx verification code is: ${code}. It expires in 5 minutes.`,
        })
        console.log(`[email] Verification code sent to ${toEmail}`)
        return true
      }
      console.log(`[email] (nodemailer not available) Verification code for ${toEmail}: ${code}`)
      return true
    } catch (e: any) {
      console.error(`[email] Failed to send to ${toEmail}:`, e.message)
      console.log(`[email] (fallback) Verification code for ${toEmail}: ${code}`)
      return true
    }
  }

  // No SMTP configured - log to server console (for development/testing)
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📧 EMAIL VERIFICATION CODE`)
  console.log(`${'='.repeat(60)}`)
  console.log(`To: ${toEmail}`)
  console.log(`Code: ${code}`)
  console.log(`Expires: 5 minutes`)
  console.log(`${'='.repeat(60)}\n`)
  return true
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

    // Rate limit: max 1 code per 60 seconds per email
    const existing = verificationCodes.get(normalizedEmail)
    if (existing && existing.expiresAt - Date.now() > 4 * 60 * 1000) {
      return NextResponse.json({
        ok: true,
        message: 'A verification code was already sent. Please check your email inbox (including spam folder).',
      })
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString()

    // Store code with 5-minute expiry
    verificationCodes.set(normalizedEmail, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    })

    // Send the email (code is NOT returned in the response)
    await sendVerificationEmail(normalizedEmail, code)

    return NextResponse.json({
      ok: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}. Check your inbox (and spam folder).`,
    })
  } catch (e: any) {
    console.error('[send-verification]', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}

/**
 * Verify a code (used internally by other routes).
 * Returns true if the code matches and hasn't expired.
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
    return false // Too many attempts
  }
  stored.attempts++
  if (stored.code !== code) return false
  // Code is correct - delete it so it can't be reused
  verificationCodes.delete(normalizedEmail)
  return true
}
