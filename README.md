# PathConvert - AI-Powered Collection Recommendations for Shopify

PathConvert is a Shopify embedded app that uses AI to generate intelligent collection-to-collection recommendations, helping merchants increase cross-category discovery and sales.

## Features

- 🤖 **AI-Powered Recommendations** - OpenAI embeddings for semantic similarity
- 🎯 **Deterministic Logic** - Rule-based gender filtering and adaptive thresholds
- 🚀 **Background Processing** - Postgres-backed job queue, no blocking requests
- 💰 **Shopify Billing Integration** - Subscription enforcement via Shopify Billing API
- 📊 **Admin Dashboard** - Polaris UI for managing collections and settings
- 🎨 **Theme App Extension** - Modern Shopify 2.0 App Block (no script tags)
- 🔒 **GDPR Compliant** - Full webhook support for data requests and redaction

---

## Tech Stack

- **Framework**: Remix (React Router)
- **Database**: PostgreSQL (with Prisma ORM)
- **AI**: OpenAI Embeddings API
- **Shopify**: Admin API (GraphQL), Billing API, App Extensions
- **Deployment**: Render.com (Web + Postgres)

---

## Quick Start

See detailed setup guides:
- **[RENDER_SETUP.md](./RENDER_SETUP.md)** - Production deployment
- **[SHOPIFY_SETUP.md](./SHOPIFY_SETUP.md)** - App configuration
- **[MVP_PROGRESS.md](./MVP_PROGRESS.md)** - Implementation status

---

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SCOPES=read_products,read_content
APP_URL=https://your-app-url.com
DATABASE_URL=postgresql://user:password@localhost:5432/pathconvert
SESSION_SECRET=your_random_secret
OPENAI_API_KEY=your_openai_key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
VITE_SHOPIFY_API_KEY=your_api_key
```

### 3. Setup Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run Dev Server

```bash
npm run dev
# or
shopify app dev
```

---

## How It Works

1. **Merchant clicks "Analyse & Deploy"** → Creates background job
2. **Job worker processes**:
   - Fetches collections from Shopify
   - Generates OpenAI embeddings
   - Computes similarity scores
   - Builds recommendation graph
3. **Storefront renders** → Theme App Extension → App Proxy → JSON buttons

---

## Architecture

```
Shopify Admin → Remix App → Job Queue → AI Processing
                    ↓
            Storefront (Theme Extension)
```

---

## Key Files

- `app/services/` - Core business logic
- `app/routes/app.*.tsx` - Admin UI pages
- `app/routes/api.*.tsx` - API endpoints
- `app/routes/apps.pathconvert.buttons.tsx` - App Proxy
- `extensions/pathconvert-recommendations/` - Theme Extension
- `prisma/schema.prisma` - Database schema

---

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run setup        # Database migrations
npm run prisma       # Prisma CLI
```

---

## Support

- **Issues**: GitHub Issues
- **Docs**: See `RENDER_SETUP.md` and `SHOPIFY_SETUP.md`

---

**Built with Remix, Shopify, and OpenAI**
