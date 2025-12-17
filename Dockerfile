FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Copy Prisma schema
COPY prisma ./prisma/

# Install server dependencies (including Prisma CLI)
WORKDIR /app/server
RUN npm ci && npm cache clean --force

# Generate Prisma client
WORKDIR /app
RUN cd server && npx prisma generate --schema=../prisma/schema.prisma

# Install and build client with reasonable memory limit
WORKDIR /app/client
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm ci && npm cache clean --force

# Copy source files
WORKDIR /app
COPY server ./server/
COPY client ./client/

# Build client
WORKDIR /app/client
RUN npm run build

# Clean up client node_modules after build to save space
RUN rm -rf node_modules

# Back to root
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Start command: run migrations then start server
CMD cd server && npx prisma db push --schema=../prisma/schema.prisma --accept-data-loss && npm start
