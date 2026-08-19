import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

/**
 * Resolve the SQLite database path so it works across environments.
 *
 * CRITICAL: Netlify serverless functions have a READ-ONLY filesystem
 * except for the /tmp/ directory. SQLite needs to write (WAL files,
 * journal files, session updates), so on Netlify we MUST copy the
 * bundled database to /tmp/ before Prisma opens it.
 *
 * Local dev and Vercel allow writes to the project directory, so we
 * use the DB file directly there.
 */
function resolveDatabasePath(): string {
  const envUrl = (process.env.DATABASE_URL || '').trim()
  const DB_NAME = 'custom.db'

  // Detect if we're on Netlify (Lambda) — /var/task exists only on Lambda
  const isNetlify = fs.existsSync('/var/task') || !!process.env.NETLIFY
  // /tmp is the only writable directory on Netlify Lambda
  const tmpDir = '/tmp'
  const tmpDbPath = path.join(tmpDir, DB_NAME)

  // Helper: try to find the source DB file in all known locations
  const findSourceDb = (): string | null => {
    // Extract filename from env var if specified, otherwise default
    let dbName = DB_NAME
    if (envUrl.startsWith('file:')) {
      const cleaned = envUrl.replace(/^file:/, '').replace(/^\.\//, '').replace(/^db\//, '')
      if (cleaned) dbName = cleaned
    }

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
        if (fs.existsSync(candidate)) return candidate
      } catch {}
    }
    return null
  }

  // ── LOCAL DEV / VERCEL PATH ────────────────────────────────────────────
  // These environments allow writes to the project directory, so we can
  // use the DB file directly without copying.
  if (!isNetlify) {
    // If env var is a valid absolute file: URL pointing to an existing file, use it
    if (envUrl.startsWith('file:') && !envUrl.startsWith('file:./') && !envUrl.startsWith('file:../')) {
      const candidatePath = envUrl.replace(/^file:/, '')
      try {
        if (fs.existsSync(candidatePath)) return envUrl
      } catch {}
    }

    // Otherwise, search for the DB file
    const sourceDb = findSourceDb()
    if (sourceDb) return `file:${sourceDb}`

    // Fallback — a valid file: URL so Prisma validation passes
    const fallback = `file:${path.join(process.cwd(), 'db', DB_NAME)}`
    console.warn('[db] Could not find database file. Falling back to:', fallback)
    return fallback
  }

  // ── NETLIFY PATH ───────────────────────────────────────────────────────
  // On Netlify, copy the bundled DB to /tmp/ (writable) before using it.
  // This avoids "attempt to write a readonly database" errors when Prisma
  // tries to create session records, etc.

  try {
    // Ensure /tmp/ exists
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true })
    }

    // Check if we've already copied the DB to /tmp in this Lambda container
    // (Lambda containers are reused across invocations, so the copy may persist)
    const tmpDbExists = fs.existsSync(tmpDbPath)

    if (!tmpDbExists) {
      // Find the source DB file in the bundled function
      const sourceDb = findSourceDb()

      if (sourceDb) {
        console.log('[db] Netlify detected. Copying DB from:', sourceDb, '→', tmpDbPath)
        fs.copyFileSync(sourceDb, tmpDbPath)
        // Make sure the copy is writable
        fs.chmodSync(tmpDbPath, 0o666)
      } else {
        console.warn('[db] Could not find source DB file in bundled function!')
        console.warn('[db] Tried all known locations. Creating empty DB at /tmp/ — login will fail.')
        // Create an empty file so Prisma doesn't crash; user data won't be there
        // but at least the function won't throw a "file not found" error.
        fs.writeFileSync(tmpDbPath, '')
      }
    } else {
      console.log('[db] Netlify detected. DB already copied to /tmp/ — reusing.')
    }

    return `file:${tmpDbPath}`
  } catch (err) {
    console.error('[db] Failed to set up /tmp/ database on Netlify:', err)
    // Last-resort fallback
    return `file:${tmpDbPath}`
  }
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
