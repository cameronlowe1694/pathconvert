# PathConvert Deployment Guide

## Quick Deploy to Render

### 1. Build Frontend

```bash
cd frontend
npm install
npm run build
```

This creates `/public/app` with the production React build.

### 2. Commit and Push

```bash
git add .
git commit -m "Add Polaris React UI"
git push
```

### 3. Access URLs

After deployment:

**New Polaris UI:**
```
https://pathconvert.onrender.com/app?shop=YOUR_SHOP.myshopify.com
```

**Legacy Simple UI:**
```
https://pathconvert.onrender.com/?shop=YOUR_SHOP.myshopify.com
```

## Local Development

### Backend (Terminal 1)
```bash
npm start
```

### Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

Access at: http://localhost:5173

## Build Scripts

Add to root `package.json`:

```json
{
  "scripts": {
    "build:frontend": "cd frontend && npm install && npm run build",
    "postinstall": "npm run build:frontend"
  }
}
```

## Environment Variables (Render)

All existing env vars remain the same. No changes needed!

## Features

### New UI Features:
- ✅ Dashboard with stats
- ✅ Buttons list view
- ✅ Collection detail pages
- ✅ AI settings management
- ✅ Sync & refresh controls
- ✅ **Plans & billing page** (for upsells!)

### Preserved Features:
- ✅ All existing backend logic
- ✅ OpenAI integration
- ✅ Gender detection
- ✅ Adaptive thresholds
- ✅ Storefront buttons
- ✅ Analytics tracking
