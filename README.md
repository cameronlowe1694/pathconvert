# PathConvert - AI-Powered Collection Cross-Links for Shopify

PathConvert automatically adds related collection link buttons to all your Shopify collection pages using AI-powered similarity analysis. A one-click solution that requires minimal configuration.

## Features

- **AI-Powered Recommendations**: Uses OpenAI embeddings to analyze collection similarity
- **Automatic Discovery**: Parses sitemaps to find all collections
- **Theme Adaptive**: Automatically matches your theme's button styles
- **One-Click Setup**: Install and activate with minimal configuration
- **Real-time Updates**: Webhooks keep recommendations fresh
- **Analytics**: Track which recommendations perform best

## Architecture

- **Backend**: Node.js + Express
- **Database**: PostgreSQL with pgvector extension
- **AI**: OpenAI Embeddings API
- **Cache**: Redis
- **Frontend**: Theme App Extension + Script Tag fallback

## Installation

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ with pgvector extension
- Redis
- Shopify Partner account
- OpenAI API key

### 1. Clone and Install Dependencies

```bash
cd pathconvert
npm install
```

### 2. Set Up Database

```bash
# Create PostgreSQL database
createdb pathconvert

# Install pgvector extension
psql pathconvert -c "CREATE EXTENSION vector;"

# Run migrations
npm run db:migrate
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `SHOPIFY_API_KEY`: Your Shopify app API key
- `SHOPIFY_API_SECRET`: Your Shopify app secret
- `OPENAI_API_KEY`: Your OpenAI API key
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `APP_URL`: Your app's public URL

### 4. Start the Server

```bash
# Development
npm run dev

# Production
npm start
```

## Usage

### For Store Owners

1. Install PathConvert from the Shopify App Store
2. Grant required permissions
3. Wait for initial analysis (2-5 minutes depending on collection count)
4. Related collection buttons will automatically appear on collection pages

### Customization

Access the PathConvert dashboard in your Shopify admin to:
- Toggle buttons on/off
- Adjust number of recommendations (2-6)
- Change minimum similarity threshold
- View analytics

## How It Works

1. **Discovery**: Parses your sitemap to find all collections
2. **Analysis**: Scrapes collection titles, descriptions, and product names
3. **Embedding**: Generates AI embeddings using OpenAI
4. **Similarity**: Calculates cosine similarity between collections
5. **Display**: Injects buttons using theme app extension or script tag
6. **Adaptation**: Matches your theme's button styles automatically

## Button Placement

Buttons are strategically placed **above the product grid** and **below filters** on collection pages for maximum visibility without disrupting the shopping experience.

## API Endpoints

### Public Endpoints

- `GET /api/collections/:handle/related?shop={shop}` - Get related collections
- `POST /api/analytics/click` - Track button click

### Admin Endpoints (Authenticated)

- `GET /admin/collections` - List all collections
- `GET /admin/collections/:id` - Get collection with related
- `GET /admin/settings` - Get shop settings
- `PUT /admin/settings` - Update shop settings
- `POST /admin/analyze` - Trigger collection analysis
- `GET /admin/analytics` - Get analytics data

## Development

### Project Structure

```
pathconvert/
├── src/
│   ├── config/          # App configuration
│   ├── database/        # Database schema and migrations
│   ├── jobs/            # Background jobs
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── index.js         # Main server
├── extensions/          # Theme app extension
├── public/              # Static files (storefront script)
└── package.json
```

### Running Analysis Manually

```bash
node src/jobs/analyze-collections.js your-store.myshopify.com
```

### Scheduled Re-Analysis

By default, collections are re-analyzed weekly (Sundays at 2 AM). Configure via `ANALYSIS_SCHEDULE` env variable (cron format).

## Performance

- Embeddings are cached in database
- Similarity calculations pre-computed
- Button loading is async (~100ms)
- Minimal impact on page load time (<200ms)

## Cost Considerations

### OpenAI API Costs

- text-embedding-3-small: ~$0.00002 per 1K tokens
- Average collection: ~200 tokens
- 100 collections: ~$0.40 one-time + re-analysis costs

### Optimization Tips

- Limit re-analysis frequency
- Use Redis caching
- Batch API requests
- Consider self-hosted embedding models for high-volume stores

## Troubleshooting

### Buttons Not Appearing

1. Check if collections have been analyzed: `GET /admin/collections`
2. Verify theme app extension is installed
3. Check browser console for errors
4. Ensure app is active: `GET /admin/settings`

### Low Quality Recommendations

1. Increase `MIN_SIMILARITY_THRESHOLD` (default: 0.7)
2. Add more descriptive collection descriptions
3. Re-run analysis after updating collection data

### Performance Issues

1. Enable Redis caching
2. Reduce `MAX_RECOMMENDATIONS`
3. Optimize database with indexes (already included)

## Security

- OAuth 2.0 for Shopify authentication
- Webhook verification using HMAC
- Environment variables for secrets
- Helmet.js for security headers
- Input validation and sanitization

## Compliance

- GDPR: Data deletion on app uninstall
- Store data encrypted at rest
- Access tokens securely stored
- No PII collection

## Roadmap

- [ ] A/B testing for button styles
- [ ] Machine learning for click-through optimization
- [ ] Multi-language support
- [ ] Custom button templates
- [ ] Advanced analytics dashboard
- [ ] Integration with other recommendation engines

## Support

For issues and feature requests, please contact support or file an issue in the repository.

## License

MIT License - See LICENSE file for details

## Credits

Built with:
- [Shopify App Bridge](https://shopify.dev/apps/tools/app-bridge)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [pgvector](https://github.com/pgvector/pgvector)
- [Express](https://expressjs.com/)
