#!/bin/bash
# Switch Prisma database provider between SQLite (local dev) and PostgreSQL (production)
# Usage:
#   ./scripts/switch-db.sh sqlite       # for local development
#   ./scripts/switch-db.sh postgres     # for production deployment

set -e

SCHEMA_FILE="prisma/schema.prisma"
MODE="${1:-sqlite}"

if [ ! -f "$SCHEMA_FILE" ]; then
  echo "❌ Error: $SCHEMA_FILE not found"
  exit 1
fi

case "$MODE" in
  sqlite|sqlite3)
    sed -i.bak 's/provider = "postgresql"/provider = "sqlite"/' "$SCHEMA_FILE"
    echo "✅ Switched to SQLite (local development)"
    echo "   Make sure DATABASE_URL=file:./dev.db in .env"
    ;;
  postgres|postgresql|prod|production)
    sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/' "$SCHEMA_FILE"
    echo "✅ Switched to PostgreSQL (production)"
    echo "   Make sure DATABASE_URL=postgresql://... in your env vars"
    ;;
  *)
    echo "Usage: $0 [sqlite|postgres]"
    echo "  sqlite   - for local development (file:./dev.db)"
    echo "  postgres - for production (Supabase/Railway/etc.)"
    exit 1
    ;;
esac

# Regenerate Prisma client
echo "📦 Regenerating Prisma client..."
npx prisma generate

echo ""
echo "Next steps:"
if [ "$MODE" = "sqlite" ] || [ "$MODE" = "sqlite3" ]; then
  echo "  npx prisma db push   # create tables in SQLite"
else
  echo "  npx prisma db push   # create tables in PostgreSQL"
  echo "  node scripts/full-reset.ts   # seed admin user + P2P listings"
fi
