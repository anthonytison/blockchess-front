# Multi-stage build for production-ready Next.js application
FROM node:22.16.0-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

# Copy package files
COPY app/package.json app/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY app/ .

# Set build-time environment variables
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUI_NETWORK_TYPE
ARG NEXT_PUBLIC_SUI_NETWORK_LOCALNET_PACKAGE_ID
ARG NEXT_PUBLIC_SUI_NETWORK_TESTNET_PACKAGE_ID
ARG NEXT_PUBLIC_SUI_NETWORK_MAINNET_PACKAGE_ID
ARG NEXT_PUBLIC_HAL_ID

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/scripts ./scripts

# Create data directory for SQLite
RUN mkdir -p ./data && chown nextjs:nodejs ./data

USER nextjs

EXPOSE 3050

ENV PORT=3050
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3050/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
