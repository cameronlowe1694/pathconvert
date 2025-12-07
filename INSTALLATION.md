# PathConvert - Installation Guide

This guide will walk you through setting up PathConvert for development and production deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Database Setup](#database-setup)
4. [Shopify App Configuration](#shopify-app-configuration)
5. [OpenAI API Setup](#openai-api-setup)
6. [Running the Application](#running-the-application)
7. [Deployment](#deployment)
8. [Testing](#testing)

## Prerequisites

Ensure you have the following installed:

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **PostgreSQL** 14.x or higher
- **Redis** 6.x or higher
- **Git**

Optional but recommended:
- **Docker** and **Docker Compose** (for containerized setup)
- **ngrok** (for local development with Shopify)

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd pathconvert
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

```bash
# Shopify Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=read_products,read_themes,read_content,write_script_tags
HOST=your-ngrok-url.ngrok.io  # For development
APP_URL=https://your-ngrok-url.ngrok.io

# Server Configuration
PORT=3000
NODE_ENV=development

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/pathconvert

# Redis Configuration
REDIS_URL=redis://localhost:6379

# App Settings
MAX_RECOMMENDATIONS=4
MIN_SIMILARITY_THRESHOLD=0.7
ANALYSIS_SCHEDULE=0 2 * * 0

# Session Secret
SESSION_SECRET=your-random-secret-key-here
```

## Database Setup

### Option 1: Manual PostgreSQL Setup

#### 1. Create Database

```bash
createdb pathconvert
```

#### 2. Install pgvector Extension

```bash
psql pathconvert -c "CREATE EXTENSION vector;"
```

#### 3. Run Migrations

```bash
npm run db:migrate
```

### Option 2: Docker Setup

Use the provided Docker Compose file:

```bash
docker-compose up -d postgres redis
```

Wait for PostgreSQL to start, then run migrations:

```bash
npm run db:migrate
```

## Shopify App Configuration

### 1. Create a Shopify Partner Account

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Sign up or log in
3. Navigate to "Apps" → "Create app"

### 2. Create a New App

1. Select "Custom app"
2. Fill in app details:
   - **App name**: PathConvert
   - **App URL**: `https://your-ngrok-url.ngrok.io`
   - **Allowed redirection URL(s)**:
     ```
     https://your-ngrok-url.ngrok.io/api/auth/callback
     ```

3. Under "App setup" → "App scopes", select:
   - `read_products`
   - `read_themes`
   - `read_content`
   - `write_script_tags`

4. Save the **API key** and **API secret** to your `.env` file

### 3. Set Up ngrok (for local development)

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`) and:
1. Update `HOST` and `APP_URL` in `.env`
2. Update app URLs in Shopify Partner Dashboard

## OpenAI API Setup

### 1. Get API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to "API keys"
4. Create a new secret key
5. Copy the key to `OPENAI_API_KEY` in `.env`

### 2. Set Usage Limits (Recommended)

1. In OpenAI dashboard, go to "Usage limits"
2. Set a monthly budget to control costs
3. For 100 collections, expect ~$0.50-$1.00 per analysis

## Running the Application

### 1. Start Redis (if not using Docker)

```bash
redis-server
```

### 2. Start the Development Server

```bash
npm run dev
```

The app will start on `http://localhost:3000`

### 3. Install on a Development Store

1. Create a Shopify development store in your Partner account
2. Navigate to your app in the Partner Dashboard
3. Click "Test on development store"
4. Select your store and install

### 4. Verify Installation

1. After OAuth, you should be redirected to the app dashboard
2. Check the admin dashboard at `https://your-store.myshopify.com/admin/apps/your-app`
3. Click "Re-analyze Collections" to start the initial analysis

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use production database (not local)
- [ ] Configure Redis (consider Redis Cloud or AWS ElastiCache)
- [ ] Set up proper domain (not ngrok)
- [ ] Enable HTTPS/SSL
- [ ] Set secure `SESSION_SECRET`
- [ ] Configure monitoring and logging
- [ ] Set up automated backups for PostgreSQL

### Deployment Options

#### Option 1: Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create pathconvert-production

# Add PostgreSQL
heroku addons:create heroku-postgresql:standard-0

# Add Redis
heroku addons:create heroku-redis:premium-0

# Set environment variables
heroku config:set SHOPIFY_API_KEY=your_key
heroku config:set SHOPIFY_API_SECRET=your_secret
# ... (set all env vars)

# Deploy
git push heroku main

# Run migrations
heroku run npm run db:migrate

# View logs
heroku logs --tail
```

#### Option 2: Docker + AWS/DigitalOcean

1. Build Docker image:

```bash
docker build -t pathconvert:latest .
```

2. Push to container registry:

```bash
docker tag pathconvert:latest your-registry/pathconvert:latest
docker push your-registry/pathconvert:latest
```

3. Deploy to your cloud provider using their container service

#### Option 3: Railway/Render/Fly.io

These platforms support automatic deployment from Git:

1. Connect your repository
2. Configure environment variables via dashboard
3. Platform will auto-deploy on push

## Testing

### 1. Run Manual Collection Analysis

```bash
node src/jobs/analyze-collections.js your-store.myshopify.com
```

### 2. Test Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Get related collections (replace with actual values)
curl "http://localhost:3000/api/collections/your-collection-handle/related?shop=your-store.myshopify.com"
```

### 3. Verify Theme Extension

1. Go to a collection page on your development store
2. Open browser dev tools
3. Check for PathConvert buttons appearing above the product grid
4. Verify no console errors

## Troubleshooting

### Database Connection Errors

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql pathconvert -c "SELECT 1;"

# Verify pgvector is installed
psql pathconvert -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

### OpenAI API Errors

- Verify API key is correct
- Check billing is enabled on OpenAI account
- Monitor rate limits in OpenAI dashboard

### Shopify OAuth Errors

- Ensure redirect URLs match exactly in Shopify Partner Dashboard
- Verify `HOST` environment variable is correct
- Check app scopes are granted

### No Collections Found

- Verify store has collections published
- Check sitemap.xml is accessible: `https://your-store.myshopify.com/sitemap.xml`
- Review server logs for scraping errors

## Next Steps

After successful installation:

1. Customize button styles in the admin dashboard
2. Adjust recommendation count and similarity threshold
3. Monitor analytics to see which recommendations perform best
4. Configure automated re-analysis schedule

For further assistance, refer to the main [README.md](README.md) or contact support.
