import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

/**
 * Resolve the SQLite database path so it works across environments.
 *
 * Robust against:
 *  - Missing DATABASE_URL env var
 *  - DATABASE_URL that doesn't start with `file:` (Prisma validation error)
 *  - Different current working directories on Vercel / Netlify / local dev
 *
 * SQLite error 14 ("Unable to open the database file") and Prisma validation
 * error ("URL must start with the protocol file:") are both handled here.
 */
function resolveDatabasePath(): string {
  const envUrl = (process.env.DATABASE_URL || '').trim()
  const DB_NAME = 'custom.db'

  // 1. If env var is already a valid file: URL pointing to an absolute path, use it directly
  if (envUrl.startsWith('file:') && !envUrl.startsWith('file:./') && !envUrl.startsWith('file:../')) {
    // It's already an absolute file: URL — verify it exists, otherwise fall through
    const candidatePath = envUrl.replace(/^file:/, '')
    try {
      if (fs.existsSync(candidatePath)) return envUrl
    } catch {}
  }

  // 2. If env var is a relative file: URL (e.g. file:./db/custom.db), extract the filename
  let dbName = DB_NAME
  if (envUrl.startsWith('file:')) {
    const cleaned = envUrl.replace(/^file:/, '').replace(/^\.\//, '').replace(/^db\//, '')
    if (cleaned) dbName = cleaned
  }

  // 3. Try every plausible location across environments
  const candidates = [
    // Local dev / Vercel (cwd = project root)
    path.join(process.cwd(), 'db', dbName),
    path.join(process.cwd(), dbName),
    // Netlify Lambda root
    path.join('/var/task', 'db', dbName),
    path.join('/var/task', dbName),
    path.join('/var/task', '.next', 'server', 'db', dbName),
    // Netlify Lambda layer
    path.join('/opt', 'db', dbName),
    path.join('/opt', dbName),
    // Relative to this file (built bundle layout)
    path.join(__dirname, 'db', dbName),
    path.join(__dirname, '..', 'db', dbName),
    path.join(__dirname, '..', '..', 'db', dbName),
    path.join(__dirname, '..', '..', '..', 'db', dbName),
    path.join(__dirname, '..', '..', '..', '..', 'db', dbName),
  ]

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return `file:${candidate}`
      }
    } catch {}
  }

  // 4. Last-resort fallback: a valid `file:` URL so Prisma validation passes
  //    even if the DB file isn't found yet. Prisma will create it on first write
  //    (but our schema expects the existing file, so users won't be able to log
  //    in until we fix the path). This avoids the "URL must start with file:" error.
  const fallback = `file:${path.join(process.cwd(), 'db', dbName)}`
  console.warn('[db] Could not find database file in any candidate location.')
  console.warn('[db] Falling back to:', fallback)
  console.warn('[db] Candidate paths tried:', candidates)
  return fallback
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
