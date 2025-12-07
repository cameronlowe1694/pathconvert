# PathConvert - Getting Started Guide

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ with pgvector extension
- Redis server running
- OpenAI API key
- Shopify Partner account

### 1. Install Dependencies

```bash
cd pathconvert
npm install
```

✅ **Done!** All 202 packages installed successfully.

### 2. Set Up Database

```bash
# Create database
createdb pathconvert

# Install pgvector extension
psql pathconvert -c "CREATE EXTENSION vector;"

# Run migrations
npm run db:migrate
```

Expected output:
```
✓ Database migration completed successfully!
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```bash
# Required
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
OPENAI_API_KEY=sk-your-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/pathconvert
REDIS_URL=redis://localhost:6379
APP_URL=https://your-ngrok-url.ngrok.io

# Optional (defaults are optimized)
MAX_RECOMMENDATIONS=7
MIN_SIMILARITY_THRESHOLD=0.85
GPT_MODEL=gpt-3.5-turbo
```

### 4. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will start on `http://localhost:3000`

### 5. Test with a Shopify Store

```bash
# Run analysis for a specific store
node src/jobs/analyze-collections.js your-store.myshopify.com
```

Watch the progress output:
```
Starting collection analysis for your-store.myshopify.com
Progress: 0%
Progress: 20%
Analyzing collection 1/50: womens-shoes
...
Progress: 100%
✓ Analysis complete
```

## Features Checklist

### ✅ Core Features Implemented
- [x] H1 tag extraction from collection pages
- [x] AI-generated anchor text using GPT-3.5-turbo
- [x] Top 7 recommendations per collection (Colab workflow)
- [x] 0.85 minimum similarity threshold (Colab workflow)
- [x] Child collection detection (prevents parent-child linking)
- [x] Real-time progress tracking (0-100%)
- [x] MVP dashboard with Launch Analysis CTA
- [x] Horizontal scrollable button layout
- [x] Strategic button placement documentation

### ✅ API Endpoints
- [x] `GET /api/collections/:handle/related` - Get related collections
- [x] `POST /api/analytics/click` - Track button clicks
- [x] `GET /api/admin/collections` - List all collections
- [x] `GET /api/admin/settings` - Get shop settings
- [x] `PUT /api/admin/settings` - Update settings
- [x] `POST /api/admin/analyze` - Trigger analysis
- [x] `GET /api/admin/progress` - Get analysis progress
- [x] `GET /api/admin/analytics` - View analytics

## Usage Examples

### 1. Analyze Collections Manually

```bash
node src/jobs/analyze-collections.js your-store.myshopify.com
```

**What it does:**
1. Parses sitemap.xml to find collections
2. Scrapes each collection page for H1, title, description, products
3. Generates AI embeddings using OpenAI
4. Calculates cosine similarity between collections
5. Generates AI-powered anchor text for each link
6. Stores everything in the database

**Expected time:** 4-6 minutes for 100 collections

### 2. Fetch Related Collections (API)

```bash
curl "http://localhost:3000/api/collections/womens-shoes/related?shop=your-store.myshopify.com"
```

**Response:**
```json
{
  "success": true,
  "related": [
    {
      "handle": "running-shoes",
      "title": "Running Shoes",
      "url": "/collections/running-shoes",
      "similarity_score": 0.92,
      "anchor_text": "Shop Women's Running Shoes",
      "anchor_text_source": "ai_generated",
      "position": 1
    },
    {
      "handle": "athletic-footwear",
      "title": "Athletic Footwear",
      "url": "/collections/athletic-footwear",
      "similarity_score": 0.88,
      "anchor_text": "Explore Athletic Footwear",
      "anchor_text_source": "ai_generated",
      "position": 2
    }
  ]
}
```

### 3. Check Analysis Progress

```bash
curl "http://localhost:3000/api/admin/progress?shop=your-store.myshopify.com"
```

**Response:**
```json
{
  "success": true,
  "progress": 75,
  "status": "running"
}
```

**Status values:**
- `idle`: No analysis running (progress = 0)
- `running`: Analysis in progress (0 < progress < 100)
- `complete`: Analysis finished (progress = 100)

## Theme Integration

### Option 1: Theme App Extension (Recommended)

1. **Enable the Extension:**
   - Go to Shopify admin
   - Navigate to Online Store → Themes → Customize
   - Add app block "Related Collections" to your collection template
   - Position it **after collection description, before filters**

2. **Configure Settings:**
   - Show/hide buttons toggle
   - Maximum buttons (2-8, default: 7)
   - Button style (primary/secondary/outline)
   - Heading text (default: "You might also like")

3. **Verify Placement:**
   ```
   ✅ Collection H1 ("Women's Shoes")
   ✅ Collection Description
   ✅ [Related Collections Block] ← Should be here
   ❌ Faceted Navigation/Filters
   ❌ Product Grid
   ```

### Option 2: Script Tag Injection

If theme app extensions aren't supported:

```javascript
// public/storefront-script.js will be auto-injected
// No manual setup required
```

The script automatically:
- Detects collection pages
- Finds the correct insertion point (before filters/grid)
- Fetches related collections from API
- Renders buttons with theme-adaptive styles
- Tracks clicks for analytics

## Dashboard Usage

### First-Time Setup

1. **Visit Admin Dashboard:**
   ```
   http://localhost:3000/admin?shop=your-store.myshopify.com
   ```

2. **Click "Launch Analysis":**
   - Large prominent button appears when no collections exist
   - Starts the analysis process

3. **Watch Progress:**
   - Progress bar shows 0-100% completion
   - Phase text updates:
     - "Discovering collections from sitemap"
     - "Extracting collection data"
     - "Generating AI embeddings"
     - "Storing data"
     - "Calculating similarities"

4. **Analysis Complete:**
   - Collections table appears
   - Shows all analyzed collections with metadata
   - "Re-analyze" button available for updates

### Ongoing Management

**View Collections:**
- See all analyzed collections
- Check last analyzed timestamp
- View product counts

**Update Settings:**
- Toggle app on/off
- Adjust max recommendations (2-7)
- Change similarity threshold (0-1)

**Re-analyze:**
- Click "Re-analyze Collections"
- Progress bar tracks update
- New AI anchor text generated
- Updated similarities calculated

## Troubleshooting

### Common Issues

#### 1. "Failed to generate embedding"
**Cause:** Invalid OpenAI API key or quota exceeded
**Fix:**
```bash
# Verify API key
echo $OPENAI_API_KEY

# Test OpenAI connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

#### 2. "pgvector extension not found"
**Cause:** pgvector not installed
**Fix:**
```bash
# Install pgvector (macOS with Homebrew)
brew install pgvector

# Or build from source
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
make install

# Enable in database
psql pathconvert -c "CREATE EXTENSION vector;"
```

#### 3. "Redis connection refused"
**Cause:** Redis not running
**Fix:**
```bash
# Start Redis (macOS)
brew services start redis

# Or run manually
redis-server
```

#### 4. Progress Stuck at 0%
**Cause:** Analysis job not started or crashed
**Fix:**
```bash
# Check if job is running
ps aux | grep analyze-collections

# Restart analysis manually
node src/jobs/analyze-collections.js your-store.myshopify.com
```

#### 5. Buttons Not Appearing
**Cause:** Theme app extension not installed or API unreachable
**Fix:**
1. Check theme customizer for "Related Collections" block
2. Verify APP_URL in .env matches your server
3. Check browser console for errors
4. Test API endpoint manually:
   ```bash
   curl "http://localhost:3000/api/collections/test/related?shop=your-store.myshopify.com"
   ```

## Performance Tips

### Optimize Analysis Speed
```bash
# Increase batch size for embeddings
# Edit src/services/openai-service.js
const batchSize = 20; // Increase from 10
```

### Reduce API Costs
```bash
# Use cached embeddings (automatic)
# Only re-analyze when collections change

# Disable AI anchor text (use H1 tags only)
# Set GPT_MODEL to empty in .env
GPT_MODEL=
```

### Scale for Large Stores
```bash
# Use background job queue
# Edit src/routes/api.js - set immediate to false
if (req.body.immediate) { // Remove this condition
  const analyzer = new CollectionAnalyzer(shopDomain);
  await analyzer.analyze();
}
```

## Next Steps

1. **Review Documentation:**
   - [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Technical details
   - [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Architecture overview
   - [API.md](API.md) - Complete API reference
   - [README.md](README.md) - General usage

2. **Deploy to Production:**
   - Set up hosting (Heroku, Railway, DigitalOcean)
   - Configure production database
   - Set up monitoring and alerts
   - Submit to Shopify App Store

3. **Customize for Your Store:**
   - Adjust similarity threshold
   - Tweak button styles
   - Customize anchor text prompts
   - Add analytics tracking

## Support

**Issues?** Check [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) troubleshooting section

**Questions?** Review the [Colab workflow](https://colab.research.google.com/drive/1_RT6jj515W_MgVBGVBaBludQ9bmooyPh) for algorithm details

---

🎉 **Congratulations!** Your PathConvert installation is ready to improve your store's internal linking and boost conversions.
