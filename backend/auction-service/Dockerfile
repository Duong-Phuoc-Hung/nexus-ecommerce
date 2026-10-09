# syntax=docker/dockerfile:1
# ==============================================================================
# Project Nexus - Real-Time Auction & Bidding Bounded Context (SRS 3.5)
# Multi-stage Dockerfile optimized for image size < 150MB, security & non-root user
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base Node.js & pnpm Setup
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Enable corepack and activate pnpm matching repository packageManager
RUN corepack enable && corepack prepare pnpm@12.9.1 --activate

WORKDIR /app

# ------------------------------------------------------------------------------
# Stage 2: Build & Production Bundle Isolation
# ------------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

# Copy monorepo configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy shared contracts and utilities
COPY shared ./shared

# Copy service source code and prisma schema
COPY backend/auction-service ./backend/auction-service

# Install dependencies for target service and workspace dependencies
RUN pnpm install --frozen-lockfile --filter @nexus/auction-service...

# Generate Prisma Client if prisma schema is present and prisma CLI is available
RUN if [ -f "./backend/auction-service/prisma/schema.prisma" ]; then \
      (pnpm exec prisma generate --schema=./backend/auction-service/prisma/schema.prisma 2>/dev/null || true); \
    fi

# Compile TypeScript into JavaScript (dist/)
RUN pnpm --filter @nexus/auction-service build

# Deploy isolated production bundle with only runtime dependencies
RUN pnpm --filter @nexus/auction-service deploy --prod /prod/app

# Ensure prisma schema and migrations are copied to production app directory
RUN if [ -d "./backend/auction-service/prisma" ]; then \
      cp -r ./backend/auction-service/prisma /prod/app/prisma; \
    fi

# ------------------------------------------------------------------------------
# Stage 3: Minimal Production Runner (< 150MB)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Production environment variables
ENV NODE_ENV=production
ENV PORT=4004
ENV AUCTION_SERVICE_PORT=4004

# Harden image: Remove npm, yarn and corepack to reduce CVE exposure & image size
RUN rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/bin/npm \
           /usr/local/bin/npx \
           /usr/local/bin/corepack \
           /opt/yarn*

# Execute as non-root user (built-in alpine node user UID 1000)
USER node

# Copy deployment bundle from builder stage
COPY --chown=node:node --from=builder /prod/app ./

# Expose Auction Service HTTP Port
EXPOSE 4004

# In-container health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 4004) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the Auction Service
CMD ["node", "dist/index.js"]
