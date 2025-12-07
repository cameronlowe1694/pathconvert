# PathConvert - Quick Start Guide

Get PathConvert up and running in 10 minutes!

## Prerequisites

Install these first:
- Node.js 18+
- PostgreSQL 14+
- Redis

## 1. Clone and Install (2 min)

```bash
git clone <repository-url>
cd pathconvert
npm install
```

## 2. Setup Database (2 min)

```bash
# Create database
createdb pathconvert

# Install pgvector
psql pathconvert -c "CREATE EXTENSION vector;"

# Run migrations
npm run db:migrate
```

## 3. Configure Environment (2 min)

```bash
cp .env.example .env
```

Edit `.env` and add:
```bash
SHOPIFY_API_KEY=your_key
SHOPIFY_API_SECRET=your_secret
OPENAI_API_KEY=sk-your_key
DATABASE_URL=postgresql://localhost/pathconvert
REDIS_URL=redis://localhost:6379
HOST=your-ngrok-url.ngrok.io
APP_URL=https://your-ngrok-url.ngrok.io
```

## 4. Start Development Server (1 min)

```bash
# Terminal 1: Start app
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000
```

## 5. Configure Shopify App (3 min)

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Create new app → Custom app
3. Set App URL to your ngrok URL
4. Set Redirect URL to `https://your-ngrok-url.ngrok.io/api/auth/callback`
5. Add scopes: `read_products`, `read_themes`, `read_content`, `write_script_tags`
6. Copy API Key and Secret to `.env`

## 6. Install on Development Store (1 min)

1. In Partner Dashboard, click "Test on development store"
2. Select your store
3. Approve permissions
4. Click "Re-analyze Collections" in dashboard
5. Wait 2-3 minutes for analysis

## 7. Verify Installation

Visit a collection page on your store:
- Should see related collection buttons above product grid
- Check browser console for errors
- Click buttons to test analytics

## Common Commands

```bash
# Development
npm run dev

# Production
npm start

# Database migration
npm run db:migrate

# Manual analysis
node src/jobs/analyze-collections.js your-store.myshopify.com
```

## Docker Quick Start (Alternative)

```bash
# Copy .env
cp .env.example .env
# Edit .env with your keys

# Start everything
docker-compose up -d

# Run migrations
docker-compose exec app npm run db:migrate

# View logs
docker-compose logs -f app
```

## Troubleshooting

**Database connection error:**
```bash
# Check PostgreSQL is running
pg_isready
```

**Redis connection error:**
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG
```

**Buttons not appearing:**
1. Check if collections analyzed: `GET /api/admin/collections?shop=your-store.myshopify.com`
2. Check browser console for errors
3. Verify app is active in settings

**OpenAI API error:**
- Verify API key is correct
- Check billing is enabled
- View usage in OpenAI dashboard

## Next Steps

- Read [README.md](README.md) for full documentation
- Check [INSTALLATION.md](INSTALLATION.md) for detailed setup
- Review [API.md](API.md) for API reference
- See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for architecture

## Need Help?

- GitHub Issues: Report bugs
- Documentation: Check README and guides
- Shopify Docs: [shopify.dev](https://shopify.dev/)

---

**You're ready to go! 🚀**
