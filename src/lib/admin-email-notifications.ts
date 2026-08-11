import nodemailer from 'nodemailer'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kirubelmelesse840@gmail.com'
let transporter: nodemailer.Transporter | null = null
async function getTransporter() {
  if (transporter) return transporter
  const testAccount = await nodemailer.createTestAccount()
  transporter = nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, auth: { user: testAccount.user, pass: testAccount.pass } })
  return transporter
}
async function sendEmail(subject: string, text: string) {
  try { const t = await getTransporter(); await t.sendMail({ from: 'P2PEX <noreply@p2pex.com>', to: ADMIN_EMAIL, subject, text }) } catch (e) { console.error('[email]', e) }
}
export async function notifyAdminUserSignup(name: string, email: string, userId: string) { await sendEmail('New User Signup', `Name: ${name}\nEmail: ${email}\nID: ${userId}`) }
export async function notifyAdminKycSubmission(name: string, email: string, userId: string) { await sendEmail('KYC Submission', `Name: ${name}\nEmail: ${email}\nID: ${userId}`) }
export async function notifyAdminP2POrder(name: string, email: string, asset: string, amount: number, total: number, currency: string, method: string) { await sendEmail('New P2P Order', `Buyer: ${name} (${email})\nAsset: ${amount} ${asset}\nTotal: ${total} ${currency}\nMethod: ${method}`) }
export async function notifyAdminSupportMessage(name: string, email: string, userId: string, message: string) { await sendEmail('New Support Message', `From: ${name} (${email})\nID: ${userId}\nMessage: ${message}`) }
