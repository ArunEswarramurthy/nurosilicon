# ============================================================================
# CRACKFLOW SERVER - Production Dockerfile
# Multi-stage build for optimized production image
# ============================================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Run linting (optional, can be removed if CI handles this)
RUN npm run lint || true

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S crackflow -u 1001 -G nodejs

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/index.js ./
COPY --from=builder /app/package.json ./

# Create uploads directory
RUN mkdir -p uploads/reference-images && chown -R crackflow:nodejs uploads

# Environment
ENV NODE_ENV=production
ENV PORT=5000

# Switch to non-root user
USER crackflow

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

EXPOSE 5000

CMD ["node", "index.js"]
