# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Add non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy built application
COPY --from=builder --chown=backend:nodejs /app/dist ./dist

# Set user
USER backend

# Expose port
EXPOSE 8080

# Set environment
ENV NODE_ENV production

# Start the application
CMD ["node", "dist/index.js"]