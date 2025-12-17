FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

# Copy package files and source code
COPY package*.json ./
COPY prisma ./prisma/
COPY server ./server/
COPY client ./client/

# Install and build server
WORKDIR /app/server
RUN npm install && npm cache clean --force
RUN npx prisma generate --schema=../prisma/schema.prisma
RUN npm run build

# Install and build client
WORKDIR /app/client
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm install && npm cache clean --force
RUN npm run build
RUN rm -rf node_modules

# Back to root
WORKDIR /app
ENV NODE_ENV=production

# Start command: run migrations then start server
CMD cd server && npx prisma db push --schema=../prisma/schema.prisma --accept-data-loss && npm start
