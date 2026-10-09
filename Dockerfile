# syntax=docker/dockerfile:1
# ==============================================================================
# Project Nexus - Unified Parameterized Multi-stage Dockerfile
# Builds any backend microservice via:
#   docker build --build-arg SERVICE_NAME=api-gateway --build-arg SERVICE_PORT=4000 -t nexus/api-gateway .
# Target: Production-ready Node.js container under 150MB with non-root security
# ==============================================================================

ARG SERVICE_NAME=api-gateway
ARG SERVICE_PORT=4000

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

ARG SERVICE_NAME
WORKDIR /app

# Copy root workspace configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Copy shared contracts and utilities
COPY shared ./shared

# Copy backend packages
COPY backend ./backend

# Install workspace dependencies
RUN pnpm install --frozen-lockfile --filter @nexus/${SERVICE_NAME}...

# Generate Prisma Client if prisma schema is present for this service
RUN if [ -f "./backend/${SERVICE_NAME}/prisma/schema.prisma" ]; then \
      (pnpm exec prisma generate --schema=./backend/${SERVICE_NAME}/prisma/schema.prisma 2>/dev/null || true); \
    fi

# Compile TypeScript into JavaScript (dist/)
RUN pnpm --filter @nexus/${SERVICE_NAME} build

# Deploy isolated production bundle with only runtime dependencies
RUN pnpm --filter @nexus/${SERVICE_NAME} deploy --prod /prod/app

# Ensure prisma schema and migrations are copied to production app directory if present
RUN if [ -d "./backend/${SERVICE_NAME}/prisma" ]; then \
      cp -r ./backend/${SERVICE_NAME}/prisma /prod/app/prisma; \
    fi

# Clean up dev artifacts, source files and build configurations from prod bundle
RUN rm -rf /prod/app/src /prod/app/tsconfig.json /prod/app/Dockerfile /prod/app/pnpm-workspace.yaml

# ------------------------------------------------------------------------------
# Stage 3: Minimal Production Runner (< 150MB)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

ARG SERVICE_NAME
ARG SERVICE_PORT=4000
WORKDIR /app

# Production environment variables
ENV NODE_ENV=production
ENV SERVICE_NAME=${SERVICE_NAME}
ENV PORT=${SERVICE_PORT}

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

# Expose microservice HTTP Port
EXPOSE ${SERVICE_PORT}

# In-container health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 4000) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the Microservice
CMD ["node", "dist/index.js"]
