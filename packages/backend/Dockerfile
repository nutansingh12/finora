# Multi-stage Dockerfile for Finora Backend

# Development stage
FROM node:18-alpine AS development

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=development

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Development command
CMD ["npm", "run", "dev"]

# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S finora -u 1001

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from build stage
COPY --from=build --chown=finora:nodejs /app/dist ./dist
COPY --from=build --chown=finora:nodejs /app/src/database ./src/database

# Create necessary directories
RUN mkdir -p uploads logs && \
    chown -R finora:nodejs uploads logs

# Switch to non-root user
USER finora

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Production command
CMD ["node", "dist/server.js"]

# Testing stage
FROM development AS testing

# Copy test files
COPY tests/ ./tests/
COPY jest.config.js ./

# Run tests
RUN npm run test

# Linting stage
FROM development AS linting

# Run linting
RUN npm run lint

# Security scanning stage
FROM build AS security

# Install security scanning tools
RUN npm install -g audit-ci

# Run security audit
RUN npm audit --audit-level moderate
RUN audit-ci --moderate
