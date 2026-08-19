import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

/**
 * Resolve the SQLite database path so it works across environments:
 *  - Local dev:        process.cwd() = project root → ./db/custom.db
 *  - Netlify functions: process.cwd() = /var/task/ (Lambda root)
 *  - Vercel functions:  process.cwd() = project root
 *
 * We try several candidate paths and pick the first one that exists.
 * This avoids SQLite "Error code 14: Unable to open the database file"
 * when the relative path doesn't resolve correctly.
 */
function resolveDatabasePath(): string {
  // If DATABASE_URL is already set to an absolute path, just use it
  const envUrl = process.env.DATABASE_URL || ''
  if (envUrl.startsWith('file:') && !envUrl.startsWith('file:./') && !envUrl.startsWith('file:../')) {
    return envUrl
  }

  // The file name from the env var (default: custom.db)
  const dbName = envUrl.replace(/^file:/, '').replace(/^\.\//, '').replace(/^db\//, '') || 'custom.db'

  // Candidate locations (in order of preference)
  const candidates = [
    path.join(process.cwd(), 'db', dbName),           // project root (dev / Vercel)
    path.join(process.cwd(), dbName),                  // cwd root
    path.join('/var/task', 'db', dbName),              // Netlify Lambda root
    path.join('/var/task', dbName),                    // Netlify Lambda alt
    path.join('/opt', 'db', dbName),                   // Netlify Lambda layer
    path.join(__dirname, 'db', dbName),                // relative to this file (build time)
    path.join(__dirname, '..', '..', 'db', dbName),    // up 2 dirs from src/lib
    path.join(__dirname, '..', '..', '..', 'db', dbName), // up 3 dirs (Netlify bundle)
  ]

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return `file:${candidate}`
      }
    } catch {}
  }

  // Fallback: use the env var as-is (will likely fail, but at least we tried)
  console.warn('[db] Could not find database file in any candidate location, using env var as-is:', envUrl)
  return envUrl || `file:./db/${dbName}`
}

const databaseUrl = resolveDatabasePath()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __resolvedDatabaseUrl?: string
}

// Log resolved path once for debugging (visible in Netlify function logs)
if (!globalForPrisma.__resolvedDatabaseUrl) {
  globalForPrisma.__resolvedDatabaseUrl = databaseUrl
  console.log('[db] Using database at:', databaseUrl)
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db