# PathConvert MVP - Implementation Progress

## ✅ Completed (Phase 1 - Core Foundation)

### Infrastructure
- ✅ Clean Remix app initialized from Shopify template
- ✅ Prisma schema designed (Shop, Collection, Embedding, Edge, Job, Billing, Settings)
- ✅ Database client configured
- ✅ Shopify app server configured
- ✅ GitHub repository cleaned and updated
- ✅ Configuration documentation created

### Core Services (`app/services/`)
- ✅ **entitlement.server.ts** - Billing gate enforcement
- ✅ **jobQueue.server.ts** - Postgres-backed job queue
- ✅ **collections.server.ts** - Shopify API fetching, gender classification, sale detection
- ✅ **embeddings.server.ts** - OpenAI embeddings generation
- ✅ **similarity.server.ts** - Cosine similarity, adaptive thresholding, gender filtering
- ✅ **jobWorker.server.ts** - Background job orchestration

### API Routes (`app/routes/`)
- ✅ `api.analyse-deploy.tsx` - Trigger full analysis workflow
- ✅ `api.job-status.$jobId.tsx` - Poll job progress
- ✅ `api.settings.tsx` - Get/update maxButtons and alignment
- ✅ `api.collections.tsx` - List collections, bulk enable/disable

---

## 🔄 In Progress / Remaining

### API Routes (Still Needed)
- ⏳ App Proxy endpoint (`/apps/pathconvert/buttons`)
- ⏳ Billing routes (create subscription, check status)
- ⏳ Compliance webhooks (customers/data_request, customers/redact, shop/redact)

### Admin UI Pages (`app/routes/app.*.tsx`)
- ⏳ Dashboard - Show stats, Analyse & Deploy button, job progress
- ⏳ Settings - Max buttons, alignment
- ⏳ Manage Collections - Table with bulk actions
- ⏳ Billing - Subscribe to monthly/annual plans

### Theme App Extension (`extensions/pathconvert-recommendations/`)
- ⏳ App Block implementation
- ⏳ Liquid template for button rendering
- ⏳ JavaScript for fetching recommendations via App Proxy
- ⏳ CSS styling

### Production Configuration
- ⏳ Dockerfile update for Node.js
- ⏳ Job worker process management
- ⏳ Environment variable validation
- ⏳ Error handling and logging

---

## Next Steps (Priority Order)

1. **Complete App Proxy** - Critical for storefront rendering
2. **Build Admin Dashboard** - User entry point
3. **Create Billing Page** - Revenue gate
4. **Build Theme App Extension** - Storefront integration
5. **Add Compliance Webhooks** - GDPR requirement
6. **Update Dockerfile** - Production deployment
7. **End-to-end testing**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Shopify Admin                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Remix App (Embedded)                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Dashboard → Analyse & Deploy → Creates Job      │   │
│  │  Settings → Update maxButtons, alignment         │   │
│  │  Manage → Enable/disable collections             │   │
│  │  Billing → Subscribe via Shopify Billing API     │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Postgres-Backed Job Queue                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Job Worker polls queue:                         │   │
│  │    1. Fetch collections from Shopify             │   │
│  │    2. Generate embeddings (OpenAI)               │   │
│  │    3. Build similarity edges                     │   │
│  │    4. Increment cacheVersion                     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Storefront (Online Store)              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Theme App Extension (App Block)                 │   │
│  │    → Fetches buttons via App Proxy               │   │
│  │    → Renders horizontal button row               │   │
│  │    → Respects alignment & maxButtons             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Postgres-Backed Job Queue
- No Redis dependency
- Uses `Job` model with status polling
- Worker process queries `pending` jobs
- Simple and deterministic

### 2. Deterministic Relevance
- No AI "decides" - rule-based gender filtering
- Adaptive threshold (75th percentile * 0.7)
- Cosine similarity for ranking
- Clamped between 0.20 and 0.85

### 3. No Heavy Work in HTTP Requests
- All analysis runs in background jobs
- API returns immediately with `jobId`
- UI polls `/api/job-status/{jobId}` for progress

### 4. Cache Busting
- `Shop.cacheVersion` incremented on:
  - Analyse & Deploy complete
  - Settings change
  - Collection enable/disable
- App Proxy cache key: `shopDomain + handle + cacheVersion`

---

## Files Created

```
app/
├── services/
│   ├── entitlement.server.ts       ✅
│   ├── jobQueue.server.ts          ✅
│   ├── collections.server.ts       ✅
│   ├── embeddings.server.ts        ✅
│   ├── similarity.server.ts        ✅
│   └── jobWorker.server.ts         ✅
├── routes/
│   ├── api.analyse-deploy.tsx      ✅
│   ├── api.job-status.$jobId.tsx   ✅
│   ├── api.settings.tsx            ✅
│   └── api.collections.tsx         ✅
└── shopify.server.ts (updated)     ✅
```

---

**Estimated Completion**: 60% complete
**Remaining Work**: ~15-20 files (UI pages, app proxy, webhooks, theme extension)
