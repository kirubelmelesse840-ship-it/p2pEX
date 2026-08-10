#!/bin/bash
# P2PEX Production Server Startup Script
# Uses start-stop-daemon for proper daemonization (survives shell exit)

cd /home/z/my-project

# Ensure static files are in place
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/ 2>/dev/null
cp -r public .next/standalone/ 2>/dev/null

# Stop any existing server
start-stop-daemon --stop --pidfile /home/z/my-project/server.pid --retry 5 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 2

# Start the server as a proper daemon
start-stop-daemon --start --background --make-pidfile --pidfile /home/z/my-project/server.pid \
  --exec /usr/bin/node -- /home/z/my-project/.next/standalone/server.js

sleep 3

# Verify it's running
if ps -p $(cat /home/z/my-project/server.pid 2>/dev/null) > /dev/null 2>&1; then
  echo "P2PEX server started successfully"
  echo "PID: $(cat /home/z/my-project/server.pid)"
  echo "Port: 3000"
  echo "Live URL: https://preview-6a7817ff.space-z.ai/"
else
  echo "Failed to start - check server.log"
  tail -20 /home/z/my-project/server.log
fi
