# Multi-stage build for production
FROM node:22.16.0-alpine3.20 AS builder

WORKDIR /usr/src/app

COPY package*.json ./

# Install all dependencies (including dev dependencies needed for build)
RUN npm ci && npm cache clean --force

COPY . .

RUN npm run build

# Production stage
FROM node:22.16.0-alpine3.20

WORKDIR /usr/src/app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder
COPY --from=builder --chown=nestjs:nodejs /usr/src/app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4002

USER nestjs

EXPOSE 4002

# Start the application
CMD ["node", "dist/main.js"]

