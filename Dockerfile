FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

# Copy all files
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

CMD ["npm", "run", "docker-start"]
