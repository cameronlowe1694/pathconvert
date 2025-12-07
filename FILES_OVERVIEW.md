# PathConvert - Files Overview

Complete description of every file in the project.

## Documentation Files

### README.md
Main documentation with features, architecture, usage instructions, and troubleshooting.

### INSTALLATION.md
Step-by-step installation guide covering local development and production deployment.

### API.md
Complete API reference for all endpoints (public, admin, webhooks) with request/response examples.

### QUICK_START.md
10-minute getting started guide for developers.

### PROJECT_SUMMARY.md
High-level project overview, architecture decisions, and technical details.

### FILES_OVERVIEW.md
This file - describes every file in the project.

## Configuration Files

### package.json
Node.js project configuration with dependencies and scripts:
- `npm run dev` - Development server with nodemon
- `npm start` - Production server
- `npm run db:migrate` - Run database migrations
- `npm run analyze` - Manual collection analysis

### .env.example
Template for environment variables (copy to `.env` and fill in values).

### .gitignore
Specifies files to exclude from Git (node_modules, .env, logs, etc.).

### shopify.app.toml
Shopify app configuration for CLI deployment.

### Dockerfile
Container definition for building Docker image:
- Node.js 18 Alpine base
- Non-root user for security
- Health check endpoint
- Production-optimized

### docker-compose.yml
Multi-container setup for local development:
- PostgreSQL with pgvector
- Redis for caching
- PathConvert app
- Automated health checks

## Source Code - Configuration

### src/config/shopify.js
Initializes Shopify API SDK with:
- API credentials
- OAuth scopes
- API version
- Embedded app settings

## Source Code - Database

### src/database/schema.sql
Complete database schema:
- `collections` - Collection data with vector embeddings
- `related_collections` - Pre-computed similarities
- `shop_settings` - Per-shop configuration
- `shop_sessions` - OAuth sessions
- `button_clicks` - Analytics
- `job_queue` - Background jobs

### src/database/db.js
PostgreSQL connection pool with error handling and configuration.

### src/database/migrate.js
Migration runner that executes schema.sql on database.

## Source Code - Services

### src/services/sitemap-parser.js
**SitemapParser class** - Collection discovery:
- Fetches store sitemap.xml
- Parses XML to find collection sitemaps
- Extracts collection URLs
- Handles pagination
- Filters for collection-only URLs

### src/services/collection-scraper.js
**CollectionScraper class** - Data extraction:
- Scrapes collection pages with Cheerio
- Extracts title, description, products
- Falls back to Shopify JSON endpoint
- Handles multiple theme structures
- Supports various CSS selectors

### src/services/openai-service.js
**OpenAIService class** - Embedding generation:
- Generates embeddings via OpenAI API
- Uses text-embedding-3-small model
- Batch processing for efficiency
- Retry logic for reliability
- Weighted text preparation (title emphasized)
- Rate limit management

### src/services/similarity-engine.js
**SimilarityEngine class** - Similarity calculations:
- Cosine similarity algorithm
- pgvector integration for fast search
- Pre-computes and caches similarities
- Filters by minimum threshold
- Stores top N recommendations per collection

### src/services/theme-service.js
**ThemeService class** - Style adaptation:
- Detects active theme via Theme API
- Extracts button styles from settings
- Scrapes homepage for rendered styles
- Generates adaptive CSS
- Installs script tags for non-extension themes

## Source Code - Jobs

### src/jobs/analyze-collections.js
**CollectionAnalyzer class** - Main analysis job:
1. Discovers collections from sitemap
2. Scrapes collection data
3. Generates embeddings via OpenAI
4. Stores in database
5. Calculates similarities
6. Updates shop settings

Can be run manually: `node src/jobs/analyze-collections.js shop.myshopify.com`

## Source Code - Middleware

### src/middleware/auth.js
Authentication middleware:
- `verifyRequest` - Validates Shopify session
- `validateShopDomain` - Validates shop parameter format
- Session verification with database

## Source Code - Routes

### src/routes/auth.js
OAuth flow handlers:
- `GET /api/auth` - Start OAuth flow
- `GET /api/auth/callback` - OAuth callback
- Registers webhooks on install
- Queues initial analysis job

### src/routes/api.js
Admin and public API endpoints:

**Public:**
- `GET /api/collections/:handle/related` - Get recommendations
- `POST /api/analytics/click` - Track clicks

**Admin (authenticated):**
- `GET /api/admin/collections` - List collections
- `GET /api/admin/collections/:id` - Collection details
- `GET /api/admin/settings` - Get settings
- `PUT /api/admin/settings` - Update settings
- `POST /api/admin/analyze` - Trigger analysis
- `GET /api/admin/analytics` - View analytics

### src/routes/webhooks.js
Shopify webhook handlers:
- `POST /api/webhooks/collections/create` - New collection
- `POST /api/webhooks/collections/update` - Updated collection
- `POST /api/webhooks/collections/delete` - Deleted collection
- `POST /api/webhooks/app/uninstalled` - App removed

All webhooks include HMAC verification.

## Source Code - Main Server

### src/index.js
Express.js server setup:
- Middleware (helmet, CORS, compression)
- Route registration
- Static file serving
- Error handling
- Scheduled jobs (weekly re-analysis via cron)
- Graceful shutdown handlers

## Frontend - Theme Extension

### extensions/pathconvert-buttons/shopify.extension.toml
Theme app extension configuration:
- Extension metadata
- Settings schema (show/hide, max buttons, style, heading)

### extensions/pathconvert-buttons/blocks/related-collections.liquid
Liquid template for button block:
- Renders container with heading
- JavaScript fetches related collections
- Displays buttons with theme styles
- Tracks analytics
- Adaptive styling based on theme

## Frontend - Script Tag

### public/storefront-script.js
Alternative implementation via script injection:
- Auto-detects collection pages
- Finds product grid insertion point
- Fetches recommendations from API
- Renders buttons dynamically
- Matches theme styles automatically
- Analytics tracking

Target selectors for insertion:
- `.product-grid`
- `#product-grid`
- `.collection-products`
- And 7+ more common patterns

## Frontend - Admin Dashboard

### public/admin/index.html
Admin interface (vanilla HTML/CSS/JS):
- Dashboard with stats (collections, recommendations, clicks)
- Settings form (toggle, max recommendations, threshold)
- Collections table
- Re-analyze trigger button
- Responsive design
- No framework dependencies

## Scripts

### scripts/setup.sh
Automated setup script (bash):
- Checks Node.js version
- Verifies PostgreSQL/Redis installed
- Installs npm dependencies
- Creates .env from template
- Sets up database
- Installs pgvector extension
- Runs migrations
- Provides next steps

Make executable with: `chmod +x scripts/setup.sh`

## File Count Summary

```
Documentation:     6 files
Configuration:     6 files
Source Code:      15 files
Frontend:          3 files
Scripts:           1 file
─────────────────────────
Total:            31 files
```

## Key Technologies by File

### Backend (Node.js)
- **Express.js**: src/index.js, src/routes/*
- **PostgreSQL**: src/database/*
- **Redis**: (referenced in src/index.js)
- **Shopify API**: src/config/shopify.js, src/routes/auth.js
- **OpenAI API**: src/services/openai-service.js

### Frontend
- **Liquid**: extensions/pathconvert-buttons/blocks/related-collections.liquid
- **Vanilla JS**: public/admin/index.html, public/storefront-script.js
- **HTML/CSS**: public/admin/index.html

### Data Processing
- **XML Parsing**: src/services/sitemap-parser.js (xml2js)
- **HTML Scraping**: src/services/collection-scraper.js (cheerio)
- **Vector Search**: src/services/similarity-engine.js (pgvector)

### DevOps
- **Docker**: Dockerfile, docker-compose.yml
- **Shell Scripts**: scripts/setup.sh

## Development Workflow Files

When developing, you'll primarily work with:

1. **Adding Features**: src/routes/api.js, src/services/*
2. **Fixing Bugs**: Check relevant service in src/services/
3. **UI Changes**: public/admin/index.html, extensions/*
4. **Database Changes**: src/database/schema.sql + migration
5. **Configuration**: .env, package.json

## Production Files

For deployment, you need:

1. **Required**: All src/* files, package.json, .env (configured)
2. **Optional**: Docker files (if using containers)
3. **Not needed**: Documentation files (*.md), scripts/

## Testing Checklist

Files to verify during testing:

- [ ] src/routes/auth.js - OAuth flow
- [ ] src/services/sitemap-parser.js - Collection discovery
- [ ] src/services/collection-scraper.js - Data extraction
- [ ] src/services/openai-service.js - Embedding generation
- [ ] src/services/similarity-engine.js - Calculations
- [ ] extensions/pathconvert-buttons/blocks/related-collections.liquid - Button display
- [ ] public/storefront-script.js - Script tag injection
- [ ] src/routes/webhooks.js - Webhook handling
- [ ] public/admin/index.html - Dashboard functionality

---

**All 31 files documented! Ready for development. 🚀**
