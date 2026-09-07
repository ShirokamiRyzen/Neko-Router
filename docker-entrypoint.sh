#!/bin/sh
set -e

# -----------------------------------------------------------
# Neko-Router Docker Entrypoint
# -----------------------------------------------------------
# Set AUTO_UPDATE=true in your .env or docker-compose environment
# to pull the latest code and rebuild the client on every container start.
#
# Manual update from host:
#   docker exec -it neko-router sh -c "cd /app && git pull && bun install && cd client && bun run build"
#   docker restart neko-router
# -----------------------------------------------------------

if [ "${AUTO_UPDATE}" = "true" ]; then
  echo "[neko-router] AUTO_UPDATE enabled -- pulling latest code..."
  
  if [ -d ".git" ]; then
    git config --global --add safe.directory /app
    git pull --ff-only || echo "[neko-router] git pull failed, continuing with current code"
    
    echo "[neko-router] Reinstalling dependencies..."
    bun install
    
    echo "[neko-router] Rebuilding frontend client..."
    cd client && bun install && bun run build && cd ..
    
    echo "[neko-router] Update complete."
  else
    echo "[neko-router] No .git directory found, skipping update."
  fi
fi

echo "[neko-router] Starting server (HOST=${HOST:-0.0.0.0}, PORT=${PORT:-3000})..."

# Hand off to CMD (default: bun src/index.ts)
exec "$@"
