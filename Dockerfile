# ==============================================================================
# UMEED Backend Production Dockerfile (Fly.io Mumbai bom)
# Multi-stage build, minimal Alpine runtime, non-root execution
# ==============================================================================

# Stage 1: Build & Dependencies
FROM node:22-alpine AS builder

WORKDIR /app

# Install build essentials for native addons if needed
RUN apk add --no-cache libc6-compat python3 make g++

# Copy workspace package manifests
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/backend/package.json ./apps/backend/
COPY apps/web/package.json ./apps/web/
COPY apps/web/package.json ./apps/web/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy contracts source and compile
COPY packages/contracts ./packages/contracts
RUN npm run build --workspace=packages/contracts

# Copy backend source and compile
COPY apps/backend ./apps/backend
RUN npm run build --workspace=apps/backend

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

# Ensure security: run as non-root user 'node'
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Install curl for container health check probes
RUN apk add --no-cache curl ca-certificates

# Copy package manifests for production install
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/backend/package.json ./apps/backend/
COPY apps/web/package.json ./apps/web/

# Install production-only dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Switch to unprivileged user
USER node

# Expose HTTP port for API process group
EXPOSE 8080

# Health check probe against /health
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://127.0.0.1:8080/health || exit 1

# Default command starts the API service (Fly process groups override this for worker)
CMD ["node", "apps/backend/dist/server.js"]

