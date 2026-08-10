#!/bin/bash
trap '' HUP TERM
while true; do
  cd /home/z/my-project/.next/standalone
  node server.js >> /home/z/my-project/server.log 2>&1
  echo "[$(date)] Server exited, restarting in 2s..." >> /home/z/my-project/server.log
  sleep 2
done
