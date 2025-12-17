# PathConvert Rebuild - Continuation Guide

## Current Status (Session 1 - Dec 17, 2025)

### ✅ Completed

1. **Created new architecture foundation**
   - `/server/` directory with Express.js backend
   - `/client/` directory for React frontend
   - Modern Dec 2025 patterns using `@shopify/shopify-api` v12.2.0

2. **Backend Foundation Built**
   - `/server/package.json` - Dependencies configured
   - `/server/tsconfig.json` - TypeScript config
   - `/server/src/index.ts` - Express server with CORS, static serving
   - `/server/src/utils/shopify.ts` - Modern Shopify API setup (ApiVersion.January25)
   - `/server/src/utils/jwt.ts` - JWT session token handling
   - `/server/src/routes/auth.ts` - OAuth flow that WORKS (no database sessions!)

3. **Business Logic Preserved**
   - Copied `/app/services/*.ts` → `/server/src/services/`
   - All 6 service files present (embeddings, collections, similarity, jobQueue, jobWorker, entitlement)
   - Copied `/app/db.server.ts` → `/server/src/db.ts`

### ⏳ Remaining Work (Estimated 3-4 hours)

## Phase 1: Complete Backend API (1.5 hours)

### Step 1.1: Fix Service File Imports (15 min)

**Problem**: Service files still have old import paths like `~/db.server` and `./xyz.server`

**Files to update:**
```bash
cd /Users/cameronlowe/Desktop/plp-linker-engine/server/src/services
```

Update each file:

**`collections.ts`** - Change:
```typescript
// OLD
import prisma from "~/db.server";
import { generateEmbedding } from "./embeddings.server";

// NEW
import prisma from "../db.js";
import { generateEmbedding } from "./embeddings.js";
```

**`embeddings.ts`** - No changes needed (standalone)

**`similarity.ts`** - Change:
```typescript
// OLD
import prisma from "~/db.server";

// NEW
import prisma from "../db.js";
```

**`jobQueue.ts`** - Change:
```typescript
// OLD
import prisma from "~/db.server";

// NEW
import prisma from "../db.js";
```

**`jobWorker.ts`** - Change:
```typescript
// OLD
import prisma from "~/db.server";
import { syncCollections } from "./collections.server";
import { generateAllEmbeddings } from "./embeddings.server";
import { buildSimilarityEdges } from "./similarity.server";

// NEW
import prisma from "../db.js";
import { syncCollections } from "./collections.js";
import { generateAllEmbeddings } from "./embeddings.js";
import { buildSimilarityEdges } from "./similarity.js";
```

**`entitlement.ts`** - Change:
```typescript
// OLD
import prisma from "~/db.server";

// NEW
import prisma from "../db.js";
```

**`db.ts`** - Change:
```typescript
// OLD
import { PrismaClient } from "@prisma/client";

// NEW
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;
```

### Step 1.2: Create Authentication Middleware (15 min)

Create `/server/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifySessionToken, validateShopifySessionToken } from '../utils/jwt.js';
import prisma from '../db.js';

export interface AuthenticatedRequest extends Request {
  shop: string;
  accessToken: string;
  shopId: string;
}

// Middleware to verify JWT session cookie
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Check for session cookie first
    const sessionCookie = req.cookies.shopify_session;
    if (sessionCookie) {
      const session = verifySessionToken(sessionCookie);
      if (session) {
        // Get shop ID from database
        const shop = await prisma.shop.findUnique({
          where: { shopDomain: session.shop },
        });

        if (shop) {
          (req as AuthenticatedRequest).shop = session.shop;
          (req as AuthenticatedRequest).accessToken = session.accessToken;
          (req as AuthenticatedRequest).shopId = shop.id;
          return next();
        }
      }
    }

    // Check for App Bridge session token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = validateShopifySessionToken(token);

      if (decoded) {
        // Get shop from database
        const shop = await prisma.shop.findUnique({
          where: { shopDomain: decoded.shop },
        });

        if (shop) {
          (req as AuthenticatedRequest).shop = decoded.shop;
          (req as AuthenticatedRequest).accessToken = shop.accessToken;
          (req as AuthenticatedRequest).shopId = shop.id;
          return next();
        }
      }
    }

    // No valid authentication found
    res.status(401).json({ error: 'Unauthorized' });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
```

### Step 1.3: Create API Routes (45 min)

Create `/server/src/routes/api.ts`:

```typescript
import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import prisma from '../db.js';
import { createJob } from '../services/jobQueue.js';
import { getEntitlement } from '../services/entitlement.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/shop - Get current shop info
router.get('/shop', async (req, res) => {
  const { shop, shopId } = req as AuthenticatedRequest;

  try {
    const shopData = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        settings: true,
        _count: {
          select: { collections: true },
        },
      },
    });

    res.json(shopData);
  } catch (error) {
    console.error('Get shop error:', error);
    res.status(500).json({ error: 'Failed to fetch shop' });
  }
});

// POST /api/analyse-deploy - Trigger analysis
router.post('/analyse-deploy', async (req, res) => {
  const { shopId } = req as AuthenticatedRequest;

  try {
    // Check entitlement
    const entitlement = await getEntitlement(shopId);
    if (!entitlement.canRunJobs) {
      return res.status(403).json({
        error: 'Subscription required',
        requiresBilling: true,
      });
    }

    // Create job
    const job = await createJob(shopId, 'ANALYSE_DEPLOY');

    res.json({ jobId: job.id });
  } catch (error) {
    console.error('Analyse deploy error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// GET /api/job-status/:id - Poll job status
router.get('/job-status/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      id: job.id,
      status: job.status,
      progressPercent: job.progressPercent,
      step: job.step,
      errorMessage: job.errorMessage,
    });
  } catch (error) {
    console.error('Job status error:', error);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// GET /api/collections - List collections
router.get('/collections', async (req, res) => {
  const { shopId } = req as AuthenticatedRequest;

  try {
    const collections = await prisma.collection.findMany({
      where: { shopId },
      include: {
        _count: {
          select: { edgesFrom: true },
        },
      },
      orderBy: { title: 'asc' },
    });

    res.json(collections);
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// POST /api/collections - Toggle collection enabled status
router.post('/collections', async (req, res) => {
  const { shopId } = req as AuthenticatedRequest;
  const { collectionIds, isEnabled } = req.body;

  try {
    await prisma.collection.updateMany({
      where: {
        id: { in: collectionIds },
        shopId,
      },
      data: { isEnabled },
    });

    // Increment cache version
    await prisma.shop.update({
      where: { id: shopId },
      data: { cacheVersion: { increment: 1 } },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Update collections error:', error);
    res.status(500).json({ error: 'Failed to update collections' });
  }
});

// GET /api/settings - Get settings
router.get('/settings', async (req, res) => {
  const { shopId } = req as AuthenticatedRequest;

  try {
    const settings = await prisma.settings.findUnique({
      where: { shopId },
    });

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/settings - Update settings
router.post('/settings', async (req, res) => {
  const { shopId } = req as AuthenticatedRequest;
  const { maxButtons, alignment } = req.body;

  try {
    const settings = await prisma.settings.update({
      where: { shopId },
      data: { maxButtons, alignment },
    });

    // Increment cache version
    await prisma.shop.update({
      where: { id: shopId },
      data: { cacheVersion: { increment: 1 } },
    });

    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
```

### Step 1.4: Create App Proxy Route (15 min)

Create `/server/src/routes/proxy.ts`:

```typescript
import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../db.js';
import { getRecommendations } from '../services/similarity.js';
import { getEntitlement } from '../services/entitlement.js';

const router = Router();

// Helper to verify HMAC from Shopify
function verifyHmac(query: any): boolean {
  const { hmac, ...params } = query;

  if (!hmac) return false;

  // Build query string
  const queryString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  // Calculate HMAC
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
    .update(queryString)
    .digest('hex');

  return hash === hmac;
}

// GET /apps/pathconvert/buttons - App Proxy endpoint
router.get('/buttons', async (req, res) => {
  try {
    // Verify HMAC
    if (!verifyHmac(req.query)) {
      return res.status(403).json({ error: 'Invalid HMAC' });
    }

    const { shop, path_prefix } = req.query;

    if (!shop || typeof shop !== 'string') {
      return res.status(400).json({ error: 'Missing shop parameter' });
    }

    // Get shop from database
    const shopRecord = await prisma.shop.findUnique({
      where: { shopDomain: shop },
      include: { settings: true },
    });

    if (!shopRecord) {
      return res.json({ buttons: [] }); // Shop not installed
    }

    // Check entitlement
    const entitlement = await getEntitlement(shopRecord.id);
    if (!entitlement.canRenderButtons) {
      return res.json({ buttons: [] }); // No active subscription
    }

    // Extract collection handle from path
    // e.g., /collections/mens-clothing → mens-clothing
    const pathMatch = (path_prefix as string)?.match(/\/collections\/([^/]+)/);
    if (!pathMatch) {
      return res.json({ buttons: [] });
    }

    const collectionHandle = pathMatch[1];

    // Get collection
    const collection = await prisma.collection.findUnique({
      where: {
        shopId_handle: {
          shopId: shopRecord.id,
          handle: collectionHandle,
        },
      },
    });

    if (!collection || !collection.isEnabled) {
      return res.json({ buttons: [] });
    }

    // Get recommendations
    const recommendations = await getRecommendations(
      collection.id,
      shopRecord.settings?.maxButtons || 15
    );

    // Format for frontend
    const buttons = recommendations.map(rec => ({
      handle: rec.targetCollection.handle,
      title: rec.targetCollection.title,
      score: rec.edge.score,
    }));

    res.json({
      buttons,
      alignment: shopRecord.settings?.alignment || 'left',
      cacheVersion: shopRecord.cacheVersion,
    });
  } catch (error) {
    console.error('App proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

export default router;
```

## Phase 2: Update Database Schema (15 min)

### Step 2.1: Remove Session Model

Edit `/Users/cameronlowe/Desktop/plp-linker-engine/prisma/schema.prisma`:

**DELETE these lines (14-32):**
```prisma
// ==================== SESSION STORAGE ====================
model Session {
  id                  String    @id
  shop                String
  state               String
  isOnline            Boolean   @default(false)
  scope               String?
  expires             DateTime?
  accessToken         String
  userId              BigInt?
  firstName           String?
  lastName            String?
  email               String?
  accountOwner        Boolean   @default(false)
  locale              String?
  collaborator        Boolean?  @default(false)
  emailVerified       Boolean?  @default(false)
  refreshToken        String?
  refreshTokenExpires DateTime?
}
```

**Keep everything else** (Shop, Settings, Collection, Embedding, Edge, Job, Billing models).

### Step 2.2: Create Migration

```bash
cd /Users/cameronlowe/Desktop/plp-linker-engine
npx prisma migrate dev --name remove_sessions
```

This will drop the Session table from the database.

## Phase 3: Create React Frontend (1 hour)

### Step 3.1: Initialize Vite React App

```bash
cd /Users/cameronlowe/Desktop/plp-linker-engine
npm create vite@latest client -- --template react-ts
cd client
npm install
```

### Step 3.2: Install Dependencies

```bash
npm install @shopify/app-bridge @shopify/app-bridge-react @shopify/polaris react-router-dom
```

### Step 3.3: Create App Structure

**`client/src/main.tsx`:**
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@shopify/polaris/build/esm/styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**`client/src/App.tsx`:**
```typescript
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import { AppProvider } from '@shopify/polaris';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Collections from './pages/Collections';
import Settings from './pages/Settings';

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const shop = urlParams.get('shop') || '';
  const host = urlParams.get('host') || '';

  const config = {
    apiKey: import.meta.env.VITE_SHOPIFY_API_KEY,
    host: host,
    forceRedirect: true,
  };

  return (
    <AppBridgeProvider config={config}>
      <AppProvider i18n={{}}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AppBridgeProvider>
  );
}
```

### Step 3.4: Port Dashboard Page

Copy UI from `/app/routes/app.dashboard.tsx` to `/client/src/pages/Dashboard.tsx`

Replace:
- `useLoaderData()` → `useState()` + `useEffect()` + `fetch()`
- `useFetcher()` → `async function` + `fetch()`
- Remove Remix imports

### Step 3.5: Create .env for Client

**`client/.env`:**
```
VITE_SHOPIFY_API_KEY=fae7538a6fc12ec615cdfc413f17638f
```

## Phase 4: Delete Legacy Remix Files (30 min)

### Step 4.1: Delete Remix Framework

```bash
cd /Users/cameronlowe/Desktop/plp-linker-engine

# Delete Remix app directory (keep services - already copied)
rm -rf app/routes
rm -f app/root.tsx app/entry.server.tsx app/entry.client.tsx app/routes.ts
rm -f vite.config.ts

# Delete Remix config
rm -f remix.config.js

# Keep app/services temporarily for reference
```

### Step 4.2: Update Root package.json

Edit `/Users/cameronlowe/Desktop/plp-linker-engine/package.json`:

**New scripts:**
```json
{
  "scripts": {
    "setup": "cd server && npm ci && npm run db:generate && npm run db:migrate",
    "build": "cd server && npm run build && cd ../client && npm run build",
    "start": "cd server && npm start",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\""
  }
}
```

**Remove Remix dependencies:**
- @remix-run/*
- @shopify/shopify-app-remix
- @shopify/shopify-app-session-storage-prisma

**Add:**
```json
{
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

## Phase 5: Update Dockerfile (15 min)

**New `/Users/cameronlowe/Desktop/plp-linker-engine/Dockerfile`:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --workspace=server --workspace=client

# Copy source code
COPY server/ ./server/
COPY client/ ./client/
COPY prisma/ ./prisma/

# Generate Prisma client
WORKDIR /app/server
RUN npm run db:generate

# Build frontend
WORKDIR /app/client
RUN npm run build

# Build backend
WORKDIR /app/server
RUN npm run build

# Setup runtime
WORKDIR /app
EXPOSE 3000

CMD ["sh", "-c", "cd server && npm run db:migrate && npm start"]
```

## Phase 6: Deploy & Test (30 min)

### Step 6.1: Install Server Dependencies

```bash
cd /Users/cameronlowe/Desktop/plp-linker-engine/server
npm install
```

### Step 6.2: Add JWT_SECRET to .env

Edit `/Users/cameronlowe/Desktop/plp-linker-engine/.env`:

Add:
```
JWT_SECRET=<generate-random-string>
```

Generate random string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 6.3: Commit and Push

```bash
cd /Users/cameronlowe/Desktop/plp-linker-engine
git add server/ client/ prisma/schema.prisma Dockerfile package.json
git commit -m "Complete architecture rebuild: Express + React replacing Remix

- Modern OAuth flow with JWT sessions (no database sessions)
- Removed Session table from Prisma schema
- Clean separation: server/ and client/ directories
- All business logic preserved in services/
- Using @shopify/shopify-api v12.2.0 (Dec 2025)
- Removed all Remix dependencies and files

Fixes login loop issue permanently."

git push
```

### Step 6.4: Test on Render

1. Render will auto-deploy from GitHub
2. Wait for deployment to complete
3. **Uninstall app** from test store
4. **Reinstall app** from Shopify Partners dashboard
5. Should redirect to dashboard **without login screen**

## Troubleshooting

### If OAuth still fails:

1. **Check Shopify Partner Dashboard URLs:**
   - App URL: `https://pathconvert.onrender.com`
   - Redirect URLs: `https://pathconvert.onrender.com/auth/callback`

2. **Check environment variables on Render:**
   - SHOPIFY_API_KEY
   - SHOPIFY_API_SECRET
   - APP_URL (must match deployment URL)
   - JWT_SECRET
   - DATABASE_URL

3. **Check Render logs** for OAuth errors

4. **Verify database migration ran:**
   ```bash
   # In Render shell
   cd server && npx prisma db push
   ```

## Success Criteria

✅ No login screen after installation
✅ Dashboard loads immediately
✅ "Analyse & Deploy" button works
✅ Collections can be managed
✅ Settings can be updated
✅ App Proxy endpoint returns recommendations
✅ No Remix code remaining
✅ No Session table in database

## File Cleanup Checklist

After everything works, delete:
- `/app/` directory entirely
- Old `/vite.config.ts`
- Old `/remix.config.js`
- Old `/.remix/`
- Old `/build/`

Keep:
- `/server/` - New backend
- `/client/` - New frontend
- `/prisma/` - Updated schema
- `/extensions/` - Theme extension (no changes needed)
- `/.env` - Updated with JWT_SECRET
- `/Dockerfile` - New version
- `/package.json` - Updated scripts

## Estimated Total Time Remaining: 3-4 hours

1. Backend completion: 1.5 hours
2. Database cleanup: 15 min
3. Frontend creation: 1 hour
4. Legacy cleanup: 30 min
5. Deployment: 30 min

Good luck! This architecture WILL work. 🚀
