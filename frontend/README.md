# PathConvert Frontend

Polaris-compliant React UI for PathConvert Shopify app.

## Development

```bash
# Install dependencies
npm install

# Run dev server (with API proxy)
npm run dev

# Build for production
npm run build
```

## Production Build

The build outputs to `../public/app` which is served by the Express backend.

Access the new UI at:
- Development: http://localhost:5173
- Production: https://pathconvert.onrender.com/app?shop=YOUR_SHOP.myshopify.com

## Architecture

- **Framework:** React 18 + TypeScript
- **UI Library:** Shopify Polaris
- **Routing:** React Router v6
- **Build Tool:** Vite
- **Backend:** Express API (existing)
