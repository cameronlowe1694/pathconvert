FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

# Copy all files first (don't set NODE_ENV=production yet, or npm install will skip devDependencies)
COPY . .

# Install server dependencies
WORKDIR /app/server
RUN npm install --omit=dev && npm cache clean --force

# Install client dependencies (including dev deps for build) and build
WORKDIR /app/client
RUN npm install && npm cache clean --force
RUN npm run build
RUN npm prune --production && npm cache clean --force

# Back to root
WORKDIR /app

# Now set NODE_ENV for runtime
ENV NODE_ENV=production

CMD ["npm", "run", "docker-start"]
