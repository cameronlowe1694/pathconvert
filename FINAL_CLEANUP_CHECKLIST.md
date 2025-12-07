# PathConvert - Final Cleanup Checklist

Complete guide to clean up old "plp-linker-engine" and deploy fresh "PathConvert" app.

## Progress Overview

✅ = Completed
⏳ = In Progress
⬜ = Not Started

---

## Part 1: Local Environment ✅

All completed by cleanup script!

- [✅] Removed old node_modules
- [✅] Cleared npm cache
- [✅] Installed fresh dependencies (176 packages)
- [✅] Initialized Git repository
- [✅] Verified no old code references

---

## Part 2: GitHub ✅

All completed by create-github-repo.sh!

- [✅] Installed GitHub CLI (gh)
- [✅] Authenticated with GitHub
- [✅] Created new repository: https://github.com/cameronlowe1694/pathconvert
- [✅] Pushed all code (38 files)
- [⏳] **TODO:** Delete old repository at https://github.com/cameronlowe1694/plp-linker-engine

### Delete Old GitHub Repo:

1. Go to: https://github.com/cameronlowe1694/plp-linker-engine
2. Click "Settings" (top right)
3. Scroll to bottom → "Danger Zone"
4. Click "Delete this repository"
5. Type: `cameronlowe1694/plp-linker-engine`
6. Confirm deletion

---

## Part 3: CLI Authentication ⏳

Required before automated cleanup can run.

### Render CLI:

```bash
render login
```

**Steps:**
1. Run command above
2. Go to: https://dashboard.render.com/u/settings/api
3. Click "Create API Key"
4. Name it: "PathConvert CLI"
5. Copy the token (starts with `rnd_...`)
6. Paste into terminal when prompted

**Verify:**
```bash
render services list
```

Should show your current services.

### Shopify CLI:

```bash
shopify auth login
```

**Steps:**
1. Run command above
2. Browser opens automatically
3. Login to your Shopify Partners account
4. Authorize Shopify CLI
5. Return to terminal

**Verify:**
```bash
shopify whoami
```

Should show your Partners account email.

---

## Part 4: Automated Cleanup (After CLI Auth) ⏳

Once both CLIs are authenticated, run:

```bash
cd /Users/cameronlowe/pathconvert
./automated-cleanup.sh
```

**This script will:**
- ✅ Verify CLI authentication
- ✅ List all Render services (for manual deletion)
- ✅ List all Shopify apps (for manual deletion)
- ✅ Provide exact commands for cleanup
- ✅ Optionally create new PathConvert app

**Note:** Some tasks still require manual deletion via web dashboards (CLI limitations).

---

## Part 5: Render.com Manual Cleanup ⬜

### Option A: Via CLI (After Authentication)

```bash
# List all services to find exact names
render services list

# Delete old web service
render services delete SERVICE_NAME

# Delete old database
render databases delete DATABASE_NAME

# Delete old Redis
render redis delete REDIS_NAME
```

### Option B: Via Web Dashboard

1. **Go to:** https://dashboard.render.com
2. **Delete Web Service:**
   - Click on old service (plp-linker-engine)
   - Settings → Scroll to bottom → "Delete Web Service"
   - Type service name → Confirm

3. **Delete PostgreSQL Database:**
   - Click "PostgreSQL" in sidebar
   - Click on old database
   - Settings → "Delete Database"
   - Confirm

4. **Delete Redis Instance:**
   - Click "Redis" in sidebar
   - Click on old Redis instance
   - Settings → "Delete Redis"
   - Confirm

---

## Part 6: Shopify Partners Cleanup ⬜

**⚠️ Important:** Shopify CLI **CANNOT** delete apps. Must use web interface.

### A. Delete Old App

1. **Go to:** https://partners.shopify.com/organizations
2. **Select** your organization
3. **Click:** "Apps" in sidebar
4. **Find** old app (might be named "PLP Linker Engine" or similar)
5. **Click** on the app
6. **Click:** "App setup" (left sidebar)
7. **Scroll to bottom** → "Delete app"
8. **Type app name** to confirm
9. **Click:** "Delete"

**If app has installations:**
- First uninstall from all dev stores (see Part 7)
- Then come back and delete

### B. Create New PathConvert App

**Option 1: Via CLI (Recommended)**

```bash
cd /Users/cameronlowe/pathconvert
shopify app init
```

Follow the prompts:
- App name: `PathConvert`
- Template: Use existing code
- Organization: Select your Partners org

**Option 2: Via Web Dashboard**

1. **Go to:** https://partners.shopify.com/organizations
2. **Click:** "Create app"
3. **Choose:** "Public app"
4. **Fill in:**
   - App name: `PathConvert`
   - App URL: `https://pathconvert.onrender.com` (update after deployment)
   - Allowed redirection URLs:
     ```
     https://pathconvert.onrender.com/api/auth/callback
     http://localhost:3000/api/auth/callback
     ```

### C. Configure App Scopes

1. Click "Configuration" in left sidebar
2. Scroll to "App scopes"
3. Select:
   - ✅ `read_products`
   - ✅ `read_themes`
   - ✅ `read_content`
   - ✅ `read_locations`
4. Click "Save"

### D. Save API Credentials

1. On Configuration page, find "App credentials"
2. Copy these to a safe place:
   - **API key:** `_____________________`
   - **API secret:** (click "Show" to reveal) `_____________________`

**You'll need these for your .env file!**

---

## Part 7: Shopify Dev Stores Cleanup ⬜

Do this for **each dev store** that has the old app installed.

### A. Uninstall Old App

1. **Go to:** Your dev store admin (e.g., `your-store.myshopify.com/admin`)
2. **Click:** "Apps" in sidebar
3. **Find** old app in list
4. **Click** on it
5. **Click:** "Delete" or "Uninstall"
6. **Confirm** deletion

### B. Remove Old Theme Blocks

1. **Go to:** "Online Store" → "Themes"
2. **Click:** "Customize" on your active theme
3. **Navigate** to a collection page
4. **Look for** old app blocks (might be "PLP Related Collections")
5. **Click** block → **Delete**
6. **Repeat** for all collection templates
7. **Click:** "Save"

---

## Part 8: Environment Configuration ⬜

### A. Create .env File

```bash
cd /Users/cameronlowe/pathconvert
cp .env.example .env
```

### B. Edit .env File

```bash
nano .env
```

**Add these values** (from Part 6.D):

```env
# Shopify App Credentials (from Partners dashboard)
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here

# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-key-here

# Database (after Render deployment)
DATABASE_URL=postgresql://user:pass@host:port/db

# Redis (after Render deployment)
REDIS_URL=redis://user:pass@host:port

# App URL (after Render deployment)
APP_URL=https://pathconvert.onrender.com

# GPT Model
GPT_MODEL=gpt-3.5-turbo

# Analysis Settings (matching Colab workflow)
MAX_RECOMMENDATIONS=7
MIN_SIMILARITY_THRESHOLD=0.85
```

**Save and exit:** `Ctrl+X`, `Y`, `Enter`

---

## Part 9: Deploy to Render.com ⬜

### Option A: Via CLI

```bash
# Create new web service
render services create web \
  --name pathconvert \
  --env node \
  --buildCommand "npm install" \
  --startCommand "npm start" \
  --repo https://github.com/cameronlowe1694/pathconvert

# Create PostgreSQL database
render databases create postgresql \
  --name pathconvert-db \
  --plan free

# Create Redis instance
render redis create \
  --name pathconvert-redis \
  --plan free
```

### Option B: Via Web Dashboard

1. **Go to:** https://dashboard.render.com
2. **Click:** "New +"
3. **Choose:** "Web Service"
4. **Connect GitHub repository:**
   - Find `pathconvert` repo
   - Click "Connect"
5. **Configure:**
   - Name: `pathconvert`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: `Free`
6. **Add Environment Variables:**
   - Click "Environment" tab
   - Add all variables from .env file
7. **Click:** "Create Web Service"

### Create Database & Redis:

1. **PostgreSQL:**
   - Click "New +" → "PostgreSQL"
   - Name: `pathconvert-db`
   - Plan: Free
   - Create
   - Copy `Internal Database URL`
   - Add to web service environment variables as `DATABASE_URL`

2. **Redis:**
   - Click "New +" → "Redis"
   - Name: `pathconvert-redis`
   - Plan: Free
   - Create
   - Copy `Internal Redis URL`
   - Add to web service environment variables as `REDIS_URL`

---

## Part 10: Deploy Theme Extension ⬜

```bash
cd /Users/cameronlowe/pathconvert
cd extensions/pathconvert-buttons

# Deploy extension
shopify app deploy
```

**Follow prompts:**
- Select your PathConvert app
- Confirm deployment
- Extension goes live immediately

---

## Part 11: Install & Test ⬜

### A. Install on Dev Store

1. **In Partners Dashboard:**
   - Go to your PathConvert app
   - Click "Test on development store"
   - Select your dev store
   - Click "Install"

2. **Grant permissions** when prompted

### B. Add Theme Block

1. **Go to:** Dev store → Online Store → Themes
2. **Click:** "Customize"
3. **Navigate** to a collection page
4. **Click:** "Add block" or "Add section"
5. **Find:** "PathConvert Related Collections"
6. **Add it** after collection description, before filters
7. **Click:** "Save"

### C. Run Analysis

1. **Go to:** `https://your-app-url.onrender.com/admin`
2. **Click:** "Launch Analysis"
3. **Watch** progress bar (0-100%)
4. **Wait** for completion (~2-5 minutes)

### D. Verify Results

1. **Visit** a collection page on your dev store
2. **Check** for PathConvert buttons (horizontal scrollable)
3. **Verify:**
   - Top 7 recommendations shown
   - AI-generated anchor text (or H1 fallback)
   - Buttons are clickable and navigate correctly
   - Horizontal scroll works on mobile

---

## Verification Commands

Run these to verify everything is clean:

```bash
# Check Git remote
git remote -v
# Should show: https://github.com/cameronlowe1694/pathconvert

# Check dependencies
npm list --depth=0
# Should show 176 packages

# Check for old references
grep -r "plp-linker\|plp_linker" . --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" --exclude="*.sh" 2>/dev/null
# Should return nothing

# Check CLI authentication
gh auth status
render services list
shopify whoami
# All should show authenticated
```

---

## Completion Checklist

### Essential Steps (Must Complete):

- [ ] Delete old GitHub repository
- [ ] Authenticate Render CLI
- [ ] Authenticate Shopify CLI
- [ ] Delete old Render services
- [ ] Delete old Shopify app
- [ ] Create new PathConvert app
- [ ] Configure app scopes
- [ ] Save API credentials
- [ ] Create .env file
- [ ] Deploy to Render.com
- [ ] Deploy theme extension

### Optional Steps (Recommended):

- [ ] Uninstall old app from dev stores
- [ ] Remove old theme blocks
- [ ] Install PathConvert on dev store
- [ ] Run analysis
- [ ] Test on live collection pages

---

## Troubleshooting

### "CLI not authenticated"

```bash
# Render
render login

# Shopify
shopify auth login

# GitHub
gh auth login
```

### "Cannot delete app - has installations"

1. Uninstall from all dev stores first
2. Then delete app via Partners dashboard

### "Environment variables not set"

1. Check Render dashboard → Service → Environment tab
2. Verify all variables from .env are added
3. Redeploy if needed

### "Extension not showing in theme"

1. Verify deployment: `shopify app deploy`
2. Check theme editor → Add block
3. Clear browser cache
4. Try different collection page

---

## Support

- **PathConvert Issues:** Check README.md
- **Shopify Partners:** https://partners.shopify.com/docs
- **Render.com:** https://render.com/docs
- **GitHub:** https://docs.github.com

---

**You're ready to launch PathConvert! 🚀**

Complete the checklist above and you'll have a completely clean, freshly deployed app.
