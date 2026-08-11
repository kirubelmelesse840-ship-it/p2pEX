#!/bin/bash
# Quick switch for local development with SQLite
# Usage: ./scripts/dev-setup.sh

set -e

echo "🔧 Switching to SQLite for local development..."

# Switch schema to sqlite
sed -i.bak 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma

# Update .env for local SQLite
cat > .env << ENVEOF
DATABASE_URL=file:/home/z/my-project/db/custom.db
VAPID_PUBLIC_KEY=BN2er8ElDeG4fnznLkMCUmAWjE6v9Z-UYGd4LhZglraEJ6AYIpZ0oAinf8m7fVKDSIwnxt3KeuQjNAfJqzVGUbU
VAPID_PRIVATE_KEY=5rZ0JxRh4WZ-JfqBDkxEeA2xz4MvknylJsEdej95AWA
VAPID_SUBJECT=mailto:support@p2pex.com
ENVEOF

# Generate client and push schema
npx prisma generate
npx prisma db push --accept-data-loss

echo ""
echo "✅ Local development environment ready!"
echo "   Database: SQLite at db/custom.db"
echo "   Run: npm run dev"
echo ""
echo "⚠️  Before deploying to Vercel, run:"
echo "   ./scripts/switch-db.sh postgres"
echo "   Then commit and push to GitHub"
