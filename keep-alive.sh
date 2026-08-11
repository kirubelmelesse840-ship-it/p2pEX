#!/bin/bash
trap '' SIGTERM SIGINT SIGHUP
cd /home/z/my-project
while true; do
  bun run dev >> /home/z/my-project/dev.log 2>&1
  sleep 2
done
