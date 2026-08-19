import { PrismaClient } from '@prisma/client'

/**
 * Database client for P2PEX.
 *
 * Production setup:
 *   - DATABASE_URL env var points to Supabase Postgres pooler URL
 *   - URL format: postgresql://postgres.XXXX:password@aws-0-region.pooler.supabase.com:6543/postgres
 *
 * IMPORTANT: When using Supabase's PgBouncer connection pooler (port 6543),
 * Prisma can throw "prepared statement already exists" errors (42P05).
 * Fix: append `?pgbouncer=true&statement_cache_size=0` to the DATABASE_URL.
 *
 * This code automatically adds those params if they're missing, so the user
 * doesn't need to manually edit the env var on Netlify/Vercel.
 */
function normalizeDatabaseUrl(url: string): string {
  if (!url) return url
  // Don't modify SQLite URLs (local dev)
  if (url.startsWith('file:')) return url

  // Already has params — check if pgbouncer is set
  if (url.includes('?')) {
    const hasPgBouncer = url.includes('pgbouncer=true')
    const hasStatementCache = url.includes('statement_cache_size=0')
    let normalized = url
    if (!hasPgBouncer) {
      normalized += (normalized.includes('&') ? '&' : '') + 'pgbouncer=true'
    }
    if (!hasStatementCache) {
      normalized += '&statement_cache_size=0'
    }
    // Also add connect_timeout for slow cold starts
    if (!normalized.includes('connect_timeout=')) {
      normalized += '&connect_timeout=15'
    }
    return normalized
  }

  // No query params yet — add them
  return `${url}?pgbouncer=true&statement_cache_size=0&connect_timeout=15`
}

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL || '')

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __normalizedDatabaseUrl?: string
}

if (!globalForPrisma.__normalizedDatabaseUrl) {
  globalForPrisma.__normalizedDatabaseUrl = databaseUrl
  console.log('[db] Using database URL (params normalized):', databaseUrl.replace(/:[^:@]+@/, ':****@'))
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
