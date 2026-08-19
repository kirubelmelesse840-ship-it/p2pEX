import { PrismaClient } from '@prisma/client'

/**
 * Database client for P2PEX.
 *
 * Production setup:
 *   - DATABASE_URL env var is set on Vercel/Netlify pointing to Supabase Postgres
 *   - The URL looks like: postgresql://postgres.XXXX:password@aws-0-region.pooler.supabase.com:6543/postgres
 *
 * Local dev setup:
 *   - .env file contains DATABASE_URL=file:./db/custom.db (local SQLite for testing)
 *
 * We no longer use any SQLite-specific workarounds — Supabase is a managed
 * Postgres database that handles reads AND writes properly across serverless
 * function invocations (unlike a bundled SQLite file).
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
