# Render.com Configuration for PathConvert

## ⚠️ CRITICAL: Manual Configuration Required

The app has been migrated from **Python/FastAPI** to **Remix/Node.js**. You MUST update Render.com settings manually.

---

## 1. Web Service Configuration

### Build & Deploy Settings

Navigate to: **Render Dashboard → pathconvert (Web Service) → Settings**

#### Update Build Command:
```bash
npm run setup && npm run build
```

#### Update Start Command:
```bash
npm run start
```

#### Environment:
- **Runtime**: `Node`
- **Region**: `Oregon (US West)`
- **Instance Type**: `Starter` ($7/month minimum)

---

## 2. Environment Variables

Navigate to: **Settings → Environment**

### Required Variables:

```bash
# Shopify App Credentials
SHOPIFY_API_KEY=fae7538a6fc12ec615cdfc413f17638f
SHOPIFY_API_SECRET=<get from Shopify Partners dashboard>
SCOPES=read_products,read_content

# App URL (must match this exactly)
APP_URL=https://plp-linker-engine.onrender.com

# Database (Postgres - from Render)
DATABASE_URL=<copy from Render Postgres connection string>

# Session Secret (generate a random 32+ character string)
SESSION_SECRET=<generate random string>

# OpenAI API Key
OPENAI_API_KEY=<your OpenAI API key>
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Cache TTL (optional)
CACHE_TTL=3600

# Vite Build Variable
VITE_SHOPIFY_API_KEY=fae7538a6fc12ec615cdfc413f17638f
```

### How to Get Values:

**SHOPIFY_API_SECRET:**
1. Go to [Shopify Partners Dashboard](https://partners.shopify.com/4570938/apps)
2. Click on PathConvert app
3. Go to "API credentials"
4. Copy "Client secret"

**DATABASE_URL:**
1. In Render Dashboard, go to "pathconvert-shopify" (Postgres)
2. Copy "Internal Database URL"
3. Format: `postgresql://user:password@host/database`

**SESSION_SECRET:**
Generate a random string:
```bash
openssl rand -base64 32
```

**OPENAI_API_KEY:**
Get from [OpenAI Platform](https://platform.openai.com/api-keys)

---

## 3. Postgres Database Configuration

Navigate to: **Render Dashboard → pathconvert-shopify (PostgreSQL)**

### Settings:
- **Name**: `pathconvert-shopify` (or rename to `pathconvert`)
- **Region**: `Oregon (US West)` (same as web service)
- **Plan**: `Starter` ($7/month minimum)

### After First Deploy:

The database schema will be automatically created by Prisma migrations on first deployment via the `npm run setup` command.

---

## 4. Deployment Process

### Initial Deploy:
1. Update all settings above in Render dashboard
2. Save environment variables
3. Go to "Manual Deploy" → "Deploy latest commit"
4. Wait 3-5 minutes for build + deploy
5. Check logs for errors

### Build Script Runs Automatically:
```bash
npm run setup    # Runs: prisma generate && prisma migrate deploy
npm run build    # Builds Remix app
npm run start    # Starts production server
```

---

## 5. Health Check

After deployment, verify:

```bash
# Test app is responding
curl https://plp-linker-engine.onrender.com/

# Should return Shopify auth redirect or app interface
```

---

## 6. Common Issues

### Issue: "Module not found" errors
**Solution**: Ensure `npm run setup` runs before `npm run build` in build command

### Issue: Database connection errors
**Solution**:
- Verify DATABASE_URL is the **Internal Database URL** from Postgres service
- Ensure Postgres and Web Service are in the same region

### Issue: Port binding errors
**Solution**: App automatically uses `process.env.PORT` (Render provides this)

### Issue: Build times out
**Solution**: Upgrade to paid Render plan (Starter minimum)

---

## 7. Monitoring

### View Logs:
- Render Dashboard → pathconvert → Logs
- Watch for:
  - `Prisma migration complete`
  - `Server listening on port XXX`
  - Any error messages

### Database Monitoring:
- Render Dashboard → pathconvert-shopify → Metrics
- Watch connections, queries, storage

---

## 8. Next Steps After Render is Configured

1. Update Shopify Partners app settings (see [SHOPIFY_SETUP.md](./SHOPIFY_SETUP.md))
2. Test OAuth flow on dev store
3. Deploy full MVP features

---

**🚨 DO NOT PROCEED until Render configuration is complete and deployment succeeds!**
