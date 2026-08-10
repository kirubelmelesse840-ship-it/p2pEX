#!/bin/bash
cd /home/z/my-project
export NODE_ENV=development
# Use bun to run next dev for better memory management
exec bun run dev >> dev.log 2>&1
