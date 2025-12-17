FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

# Copy all files
COPY . .

# Install server dependencies (production only to save memory)
WORKDIR /app/server
RUN npm install --omit=dev && npm cache clean --force

# Install and build client with memory limits
WORKDIR /app/client
# Set Node memory limit to 450MB to avoid OOM
ENV NODE_OPTIONS="--max-old-space-size=450"
RUN npm install && npm cache clean --force
RUN npm run build
# Clean up to save space
RUN rm -rf node_modules && npm cache clean --force

# Back to root
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

CMD ["npm", "run", "docker-start"]
