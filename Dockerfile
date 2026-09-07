FROM oven/bun:alpine

# Install git so the container can self-update via `git pull` without a rebuild
RUN apk add --no-cache git

WORKDIR /app

# Copy dependency definitions first for better layer caching
COPY package.json bun.lock* ./

# Install all dependencies (including devDependencies for client build)
RUN bun install

# Copy full application source
COPY . .

# Build the frontend client for production static serving
RUN cd client && bun install && bun run build

# Data directory for SQLite persistence
RUN mkdir -p /app/data

# All configuration (PORT, HOST, DB_PATH, NODE_ENV, AUTO_UPDATE, etc.)
# is read from .env at runtime via env_file in docker-compose.

# EXPOSE is documentation only; actual port is determined by PORT env var.
# The compose file uses network_mode: "host" so all ports are exposed directly.
EXPOSE 3000

# Entrypoint script: optionally pull latest code, reinstall deps, rebuild client
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["bun", "src/index.ts"]
