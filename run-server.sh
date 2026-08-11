#!/bin/bash
trap '' HUP TERM INT
cd /home/z/my-project/.next/standalone
export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0
while true; do
  echo "[$(date)] Starting server..." >> /home/z/my-project/server.log
  node server.js >> /home/z/my-project/server.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..." >> /home/z/my-project/server.log
  sleep 3
done
