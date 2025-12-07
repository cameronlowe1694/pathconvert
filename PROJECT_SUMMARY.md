# PathConvert - Project Summary

## Overview

PathConvert is a complete Shopify app that automatically adds AI-powered related collection link buttons to collection pages. The app analyzes collection similarity using OpenAI embeddings and displays recommendations above the product grid.

## Project Structure

```
pathconvert/
├── src/
│   ├── config/
│   │   └── shopify.js                 # Shopify API configuration
│   ├── database/
│   │   ├── db.js                      # PostgreSQL connection pool
│   │   ├── migrate.js                 # Migration runner
│   │   └── schema.sql                 # Database schema with pgvector
│   ├── jobs/
│   │   └── analyze-collections.js     # Main analysis job
│   ├── middleware/
│   │   └── auth.js                    # Authentication middleware
│   ├── routes/
│   │   ├── api.js                     # Admin and public API endpoints
│   │   ├── auth.js                    # OAuth flow handlers
│   │   └── webhooks.js                # Shopify webhook handlers
│   ├── services/
│   │   ├── collection-scraper.js      # Collection data extraction
│   │   ├── openai-service.js          # OpenAI embeddings integration
│   │   ├── similarity-engine.js       # Cosine similarity calculations
│   │   ├── sitemap-parser.js          # Sitemap discovery
│   │   └── theme-service.js           # Theme style detection
│   └── index.js                       # Main Express server
├── extensions/
│   └── pathconvert-buttons/
│       ├── shopify.extension.toml     # Theme app extension config
│       └── blocks/
│           └── related-collections.liquid  # Liquid template for buttons
├── public/
│   ├── admin/
│   │   └── index.html                 # Admin dashboard
│   └── storefront-script.js           # Alternative script tag implementation
├── scripts/
│   └── setup.sh                       # Automated setup script
├── .env.example                       # Environment variable template
├── .gitignore
├── API.md                             # Complete API documentation
├── docker-compose.yml                 # Docker setup
├── Dockerfile                         # Container definition
├── INSTALLATION.md                    # Detailed installation guide
├── package.json
├── README.md                          # Main documentation
├── shopify.app.toml                   # Shopify app configuration
└── PROJECT_SUMMARY.md                 # This file
```

## Key Components

### 1. Backend Architecture

**Tech Stack:**
- Node.js 18+ with ES modules
- Express.js for HTTP server
- PostgreSQL 14+ with pgvector for vector storage
- Redis for caching
- Shopify API SDK
- OpenAI SDK

**Core Services:**

1. **SitemapParser** ([src/services/sitemap-parser.js](src/services/sitemap-parser.js))
   - Discovers all collections from sitemap.xml
   - Handles paginated collection sitemaps
   - Extracts collection URLs and handles

2. **CollectionScraper** ([src/services/collection-scraper.js](src/services/collection-scraper.js))
   - Scrapes collection pages for title, description, products
   - Falls back to Shopify JSON endpoints
   - Handles multiple theme structures

3. **OpenAIService** ([src/services/openai-service.js](src/services/openai-service.js))
   - Generates embeddings using text-embedding-3-small
   - Batch processing with retry logic
   - Weighted text preparation (title emphasized 3x)

4. **SimilarityEngine** ([src/services/similarity-engine.js](src/services/similarity-engine.js))
   - Calculates cosine similarity using pgvector
   - Pre-computes and caches similarities
   - Filters by minimum threshold

5. **ThemeService** ([src/services/theme-service.js](src/services/theme-service.js))
   - Detects theme button styles via Theme API
   - Scrapes homepage for rendered styles
   - Generates adaptive CSS

### 2. Database Schema

**Tables:**
- `collections` - Stores collection data with vector embeddings
- `related_collections` - Pre-computed similarity relationships
- `shop_settings` - Per-shop configuration
- `shop_sessions` - OAuth session storage
- `button_clicks` - Analytics tracking
- `job_queue` - Background job management

**Key Features:**
- pgvector extension for efficient similarity search
- Indexes for fast lookups
- JSONB for flexible settings storage

### 3. Frontend Components

**Theme App Extension:**
- Liquid template with customizable settings
- Automatic injection into collection pages
- Theme-adaptive styling
- Async button loading

**Script Tag Fallback:**
- Works with all themes
- DOM-based injection above product grid
- Detects and matches theme styles
- Minimal performance impact

**Admin Dashboard:**
- Clean HTML/CSS/JS interface
- Collection overview
- Settings management
- Analytics display
- Re-analysis trigger

### 4. API Endpoints

**Public:**
- `GET /api/collections/:handle/related` - Fetch recommendations
- `POST /api/analytics/click` - Track clicks

**Admin (Authenticated):**
- `GET /api/admin/collections` - List collections
- `GET /api/admin/settings` - Get settings
- `PUT /api/admin/settings` - Update settings
- `POST /api/admin/analyze` - Trigger analysis
- `GET /api/admin/analytics` - View analytics

**Webhooks:**
- Collections create/update/delete
- App uninstalled

## Workflow

### Installation Flow

1. Store owner installs app from partner dashboard
2. OAuth flow redirects to Shopify for authorization
3. App receives access token and stores in database
4. Webhooks are registered automatically
5. Initial analysis job is queued
6. Admin dashboard opens showing progress

### Analysis Process

1. **Discovery**: Parse sitemap.xml to find all collections
2. **Extraction**: Scrape or fetch collection data (title, description, products)
3. **Embedding**: Send to OpenAI to generate 1536-dim vectors
4. **Storage**: Save collections and embeddings to PostgreSQL
5. **Similarity**: Calculate cosine similarity for all pairs using pgvector
6. **Caching**: Pre-compute top N recommendations per collection

### Button Display

**Theme App Extension Method:**
1. Merchant adds app block to collection template
2. Liquid template renders on collection page
3. JavaScript fetches related collections from API
4. Buttons rendered with theme-adaptive styles

**Script Tag Method:**
1. Script auto-injected via ScriptTag API
2. Detects collection page from URL
3. Finds product grid container
4. Inserts buttons before grid
5. Matches theme button styles dynamically

## Configuration

### Environment Variables

Critical:
- `SHOPIFY_API_KEY` - Shopify app credentials
- `SHOPIFY_API_SECRET` - Shopify app credentials
- `OPENAI_API_KEY` - OpenAI API key
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection

Optional:
- `MAX_RECOMMENDATIONS` - Default button count (4)
- `MIN_SIMILARITY_THRESHOLD` - Minimum similarity (0.7)
- `ANALYSIS_SCHEDULE` - Cron schedule for re-analysis

### Customization Options

**Via Admin Dashboard:**
- Toggle app on/off
- Adjust recommendation count (2-6)
- Set similarity threshold (0-1)
- View analytics

**Via Theme Extension Settings:**
- Show/hide buttons
- Button style (primary/secondary/outline)
- Heading text
- Maximum buttons to display

## Performance Considerations

**Optimization Techniques:**
- Embeddings cached in database
- Similarities pre-computed
- Redis for API response caching
- Async button loading (non-blocking)
- Batch OpenAI requests
- Database indexes on hot paths

**Expected Performance:**
- Initial analysis: 2-5 minutes for 100 collections
- Button load time: ~100-200ms
- Page load impact: <200ms
- Re-analysis: Weekly (configurable)

## Cost Estimates

**OpenAI API:**
- text-embedding-3-small: $0.00002 / 1K tokens
- ~200 tokens per collection
- 100 collections = ~$0.40 one-time
- Weekly re-analysis = ~$1.60/month

**Infrastructure:**
- Heroku: ~$50/month (Standard-0 Postgres + Premium-0 Redis)
- AWS: ~$30-40/month (RDS + ElastiCache)
- DigitalOcean: ~$25/month (Managed DB + Droplet)

## Deployment Options

1. **Heroku** - Easiest, good for small-medium scale
2. **Docker + Cloud** - Most flexible, scalable
3. **Railway/Render** - Simple, auto-deploy from Git
4. **Self-hosted** - VPS with Docker Compose

## Testing Checklist

- [x] OAuth flow works
- [x] Sitemap parsing handles pagination
- [x] Collection scraping works on multiple themes
- [x] Embeddings generate successfully
- [x] Similarity calculations are accurate
- [x] Buttons display on collection pages
- [x] Theme styles are matched
- [x] Mobile responsive
- [x] Webhooks trigger updates
- [x] Analytics track clicks
- [x] Admin dashboard functions

## Security Features

- OAuth 2.0 for authentication
- Webhook HMAC verification
- Environment variable secrets
- Helmet.js security headers
- Input validation
- GDPR compliance (data deletion on uninstall)
- Non-root Docker user
- Rate limiting awareness

## Future Enhancements

Potential features for v2:
- A/B testing for button styles
- Machine learning for click-through optimization
- Multi-language support
- Custom button templates
- Advanced analytics dashboard
- Product-level recommendations
- Integration with other recommendation engines
- GraphQL API
- Shopify Plus features (Scripts, Flow)

## Troubleshooting

Common issues and solutions documented in:
- [INSTALLATION.md](INSTALLATION.md) - Setup issues
- [API.md](API.md) - API errors
- [README.md](README.md) - General troubleshooting

## Monitoring

Recommended monitoring:
- Server uptime (UptimeRobot, Pingdom)
- Error tracking (Sentry, Rollbar)
- Performance monitoring (New Relic, Datadog)
- Database metrics (pganalyze)
- OpenAI API usage dashboard

## Support

- Documentation: This repository
- Issues: GitHub Issues
- Email: support@pathconvert.com

## License

MIT License - See LICENSE file

---

**Built with ❤️ for Shopify merchants**
