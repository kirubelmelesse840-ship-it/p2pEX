#!/bin/bash
# Start the market-service for the crypto exchange platform.
# Run this from the project root: ./scripts/start-market-service.sh
# Or it will be auto-started by the Next.js server on first API call.

cd "$(dirname "$0")/.."

# Kill any existing market-service
pkill -f "bun index.ts" 2>/dev/null
sleep 1

# Start fresh
cd mini-services/market-service
nohup setsid bun index.ts > /tmp/market-service.log 2>&1 < /dev/null &
disown $!

# Wait for it to start
sleep 3

# Verify
if curl -s "http://127.0.0.1:3003/socket.io/?EIO=4&transport=polling" 2>&1 | grep -q "sid"; then
  echo "✓ Market service is running on port 3003"
  echo "  Pairs: 16 (BTC, ETH, BNB, SOL, XRP, ADA, DOGE, AVAX, LINK, DOT, MATIC, LTC)"
  echo "  Log: /tmp/market-service.log"
else
  echo "✗ Market service failed to start - check /tmp/market-service.log"
  exit 1
fi
