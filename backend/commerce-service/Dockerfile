# syntax=docker/dockerfile:1
# ==============================================================================
# Project Nexus - Cart, Orders & Payments Bounded Context (SRS 3.4)
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
COPY backend/commerce-service ./backend/commerce-service

# Install dependencies for target service and workspace dependencies
RUN pnpm install --frozen-lockfile --filter @nexus/commerce-service...

# Generate Prisma Client if prisma schema is present and prisma CLI is available
RUN if [ -f "./backend/commerce-service/prisma/schema.prisma" ]; then \
      (pnpm exec prisma generate --schema=./backend/commerce-service/prisma/schema.prisma 2>/dev/null || true); \
    fi

# Compile TypeScript into JavaScript (dist/)
RUN pnpm --filter @nexus/commerce-service build

# Deploy isolated production bundle with only runtime dependencies
RUN pnpm --filter @nexus/commerce-service deploy --prod /prod/app

# Ensure prisma schema and migrations are copied to production app directory
RUN if [ -d "./backend/commerce-service/prisma" ]; then \
      cp -r ./backend/commerce-service/prisma /prod/app/prisma; \
    fi

# Clean up dev artifacts, source files and build configurations from prod bundle
RUN rm -rf /prod/app/src /prod/app/tsconfig.json /prod/app/Dockerfile /prod/app/pnpm-workspace.yaml

# ------------------------------------------------------------------------------
# Stage 3: Minimal Production Runner (< 150MB)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Production environment variables
ENV NODE_ENV=production
ENV PORT=4003
ENV COMMERCE_SERVICE_PORT=4003

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

# Expose Commerce Service HTTP Port
EXPOSE 4003

# In-container health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 4003) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the Commerce Service
CMD ["node", "dist/index.js"]
