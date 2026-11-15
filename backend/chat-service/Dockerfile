# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@12.9.1 --activate
WORKDIR /app

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY shared ./shared
COPY backend/chat-service ./backend/chat-service
RUN pnpm install --frozen-lockfile --filter @nexus/chat-service...
RUN pnpm --filter @nexus/chat-service build
RUN pnpm --filter @nexus/chat-service deploy --prod /prod/app

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nexus
COPY --from=builder --chown=nexus:nodejs /prod/app ./
USER nexus
EXPOSE 4008
CMD ["node", "dist/index.js"]
