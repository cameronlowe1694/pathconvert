# Complete Cleanup Guide - Remove Old PathConvert Attempts

This guide will help you completely remove all traces of previous failed attempts and ensure a fresh start with PathConvert.

## ✅ Cleanup Checklist

### 1. GitHub Cleanup

#### A. Delete Old Repository (plp-linker-engine)

**Steps:**
1. Go to: https://github.com/cameronlowe1694/plp-linker-engine
2. Click **Settings** (top right)
3. Scroll to bottom → **Danger Zone**
4. Click **Delete this repository**
5. Type: `cameronlowe1694/plp-linker-engine`
6. Click **I understand the consequences, delete this repository**

**Alternative (if you want to keep history):**
- Rename it to `plp-linker-engine-archived`
- Make it private
- Add a README: "⚠️ ARCHIVED - Superseded by PathConvert"

#### B. Clean Up Local Git (if using the old repo)

If you cloned `plp-linker-engine` locally:

```bash
# Navigate away from the old directory
cd ~

# Remove old directory
rm -rf ~/plp-linker-engine

# Verify PathConvert is clean
cd ~/pathconvert
git remote -v  # Should show no remotes or your new PathConvert repo
```

#### C. Create New PathConvert Repository

```bash
cd ~/pathconvert

# Initialize fresh Git repo
git init

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
.DS_Store
*.log
npm-debug.log*
.vscode/
.idea/
dist/
build/
coverage/
.nyc_output/
EOF

# Initial commit
git add .
git commit -m "Initial commit: PathConvert - AI-powered collection cross-linking app"

# Create GitHub repo (via GitHub CLI if installed)
gh repo create cameronlowe1694/pathconvert --public --source=. --remote=origin

# Or manually:
# 1. Go to https://github.com/new
# 2. Repository name: pathconvert
# 3. Description: "PathConvert - AI-powered collection cross-linking app for Shopify"
# 4. Public
# 5. Create repository
# 6. Then run:
git remote add origin https://github.com/cameronlowe1694/pathconvert.git
git branch -M main
git push -u origin main
```

---

### 2. Render.com Cleanup

#### A. Delete Old Service (plp-linker-engine)

**Steps:**
1. Go to: https://dashboard.render.com
2. Click on **plp-linker-engine** service (if it exists)
3. Click **Settings** (left sidebar)
4. Scroll to bottom → **Delete Web Service**
5. Type service name to confirm: `plp-linker-engine`
6. Click **Delete**

**Also check for:**
- Any databases named `plp-linker-engine-db` or similar
- Any Redis instances
- Any environment groups

Delete them all.

#### B. Delete Old Postgres Database

**Steps:**
1. In Render Dashboard → **PostgreSQL** (left sidebar)
2. Find any database for old app
3. Click the database
4. **Settings** → **Delete Database**
5. Type database name to confirm
6. Click **Delete**

#### C. Delete Old Redis Instance

**Steps:**
1. In Render Dashboard → **Redis** (left sidebar)
2. Find any Redis instance for old app
3. Click the instance
4. **Settings** → **Delete Redis**
5. Confirm deletion

---

### 3. Shopify Partners Dashboard Cleanup

#### A. Delete Old App

**Steps:**
1. Go to: https://partners.shopify.com/4570938/apps
2. Find the old app (might be named "PLP Linker Engine" or similar)
3. Click on the app name
4. Click **App setup** (left sidebar)
5. Scroll to bottom → **Delete app**
6. Confirm deletion

**⚠️ Important:** If the app has any installations, you must:
1. Uninstall from all dev stores first
2. Then delete the app

#### B. Verify Deletion

After deletion, check:
- Apps list should NOT show the old app
- Only "PathConvert" should remain (or be ready to create)

---

### 4. Shopify Dev Dashboard Cleanup

#### A. Uninstall from Dev Stores

**Steps:**
1. Go to: https://dev.shopify.com/dashboard
2. Click on each dev store that has the old app installed
3. Navigate to **Apps** in admin
4. Find the old app
5. Click **Delete** or **Uninstall**
6. Confirm removal

#### B. Remove App Extension (if installed)

**Steps:**
1. In each dev store admin
2. Go to **Online Store** → **Themes**
3. Click **Customize** on active theme
4. Look for old app blocks (like "PLP Related Collections" or similar)
5. Remove all old app blocks
6. **Save**

---

### 5. Local Environment Cleanup

#### A. Clean Node Modules and Cache

```bash
cd ~/pathconvert

# Remove node_modules and reinstall fresh
rm -rf node_modules
rm package-lock.json
npm cache clean --force
npm install
```

#### B. Clean Database

If you have a local database from old attempts:

```bash
# Drop old database (if exists)
dropdb plp_linker_engine
dropdb pathconvert_old

# Create fresh PathConvert database
createdb pathconvert

# Install pgvector
psql pathconvert -c "CREATE EXTENSION vector;"

# Run migrations
npm run db:migrate
```

#### C. Clean Redis

```bash
# Connect to Redis
redis-cli

# Flush all old data
FLUSHALL

# Exit
exit
```

---

### 6. Environment Variables Cleanup

#### A. Update .env

Make sure your `.env` file has ONLY PathConvert references:

```bash
# Check for old references
grep -i "plp\|linker" .env

# Should return nothing
```

If found, replace them:

```bash
# Edit .env
nano .env

# Ensure APP_NAME is correct
APP_NAME=PathConvert

# Update APP_URL if using Render
APP_URL=https://pathconvert.onrender.com  # Update when you deploy
```

---

### 7. Create Fresh PathConvert App on Shopify

#### A. Create New App in Partners Dashboard

**Steps:**
1. Go to: https://partners.shopify.com/4570938/apps
2. Click **Create app**
3. Choose **Public app**
4. App name: **PathConvert**
5. App URL: `https://pathconvert.onrender.com` (or your ngrok URL for testing)
6. Allowed redirection URL(s):
   ```
   https://pathconvert.onrender.com/api/auth/callback
   http://localhost:3000/api/auth/callback
   ```
7. Click **Create app**

#### B. Configure App Permissions

1. In app dashboard → **Configuration**
2. **App scopes:**
   - `read_products`
   - `read_themes`
   - `read_content`
   - `read_locations`
3. Save

#### C. Get App Credentials

1. Copy **API key** → Add to `.env` as `SHOPIFY_API_KEY`
2. Copy **API secret key** → Add to `.env` as `SHOPIFY_API_SECRET`

---

### 8. Deploy Fresh to Render.com

#### A. Create New Web Service

**Steps:**
1. Go to: https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect to GitHub
4. Select repository: **pathconvert**
5. **Name:** `pathconvert`
6. **Environment:** `Node`
7. **Build Command:** `npm install`
8. **Start Command:** `npm start`
9. **Plan:** Free (or Starter)

#### B. Add Environment Variables

In Render service settings → **Environment**:

```
NODE_ENV=production
SHOPIFY_API_KEY=<your-key>
SHOPIFY_API_SECRET=<your-secret>
SHOPIFY_SCOPES=read_products,read_themes,read_content,read_locations
OPENAI_API_KEY=<your-openai-key>
GPT_MODEL=gpt-3.5-turbo
OPENAI_MODEL=text-embedding-3-small
MAX_RECOMMENDATIONS=7
MIN_SIMILARITY_THRESHOLD=0.85
DATABASE_URL=<render-postgres-url>
REDIS_URL=<render-redis-url>
APP_URL=https://pathconvert.onrender.com
SESSION_SECRET=<generate-random-string>
```

#### C. Create Database and Redis

**PostgreSQL:**
1. Render Dashboard → **New +** → **PostgreSQL**
2. **Name:** `pathconvert-db`
3. **Database:** `pathconvert`
4. **User:** `pathconvert_user`
5. Create
6. Copy **Internal Database URL** → Add to service as `DATABASE_URL`

**Redis:**
1. Render Dashboard → **New +** → **Redis**
2. **Name:** `pathconvert-redis`
3. Create
4. Copy **Redis URL** → Add to service as `REDIS_URL`

#### D. Run Database Migration

After deployment:

```bash
# SSH into Render service (or use Render Shell)
npm run db:migrate
```

---

### 9. Verification Checklist

After cleanup, verify:

- [ ] Old GitHub repo deleted or archived
- [ ] No old services on Render.com
- [ ] No old app in Shopify Partners
- [ ] No old app installed on dev stores
- [ ] Fresh `pathconvert` database created
- [ ] Fresh PathConvert app created in Shopify Partners
- [ ] New Render service deployed
- [ ] Environment variables correct
- [ ] No references to "plp" or "linker" anywhere

### 10. Quick Verification Commands

Run these to confirm cleanup:

```bash
# Check for old references in code
cd ~/pathconvert
grep -r "plp-linker" . --exclude-dir=node_modules
grep -r "plplinker" . --exclude-dir=node_modules

# Should return no results

# Check Git remotes
git remote -v
# Should show pathconvert repo or nothing

# Check databases
psql -l | grep plp
# Should return nothing

# Check Redis
redis-cli KEYS "*plp*"
# Should return empty
```

---

## 🎯 Fresh Start Confirmation

Once you've completed all steps:

✅ **GitHub:** Only pathconvert repo exists
✅ **Render:** Only pathconvert service, database, and Redis
✅ **Shopify Partners:** Only PathConvert app
✅ **Local:** No old references in code or .env
✅ **Database:** Fresh pathconvert database with pgvector
✅ **Redis:** Clean slate

---

## 🚀 Next Steps After Cleanup

1. **Test Locally:**
   ```bash
   npm run dev
   ```

2. **Deploy to Render:**
   - Git push triggers auto-deploy
   - Monitor deployment logs

3. **Test Shopify OAuth:**
   - Install PathConvert on dev store
   - Verify OAuth flow works

4. **Run First Analysis:**
   ```bash
   node src/jobs/analyze-collections.js your-dev-store.myshopify.com
   ```

5. **Verify Buttons Display:**
   - Add theme app extension block
   - Check collection pages

---

## ⚠️ Troubleshooting

### "App already exists with that name"
- The old app wasn't fully deleted from Shopify Partners
- Wait 5-10 minutes and try again
- Or use "PathConvert App" as temporary name

### "Database already exists"
- Run: `dropdb pathconvert && createdb pathconvert`
- Then re-run migrations

### "Git remote already configured"
- Run: `git remote remove origin`
- Then add new remote

---

## 📞 Support

If you encounter issues during cleanup:
1. Check Shopify Partners support docs
2. Check Render.com documentation
3. GitHub repository settings help

---

**Ready for a clean start! 🎉**
