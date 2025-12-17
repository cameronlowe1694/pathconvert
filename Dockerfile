FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

# Copy root package files
COPY package.json package-lock.json* ./

# Install root dependencies (only concurrently for dev)
RUN npm install --production=false

# Copy server and client
COPY server ./server
COPY client ./client
COPY prisma ./prisma

# Install server dependencies
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Install client dependencies and build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci && npm cache clean --force
RUN npm run build

# Back to root
WORKDIR /app

CMD ["npm", "run", "docker-start"]
