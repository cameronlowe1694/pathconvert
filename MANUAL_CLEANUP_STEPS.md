# Manual Cleanup Steps - Step-by-Step Guide

✅ **DONE:** Local environment cleaned and Git initialized

Now follow these steps to complete the cleanup:

---

## Step 1: Create GitHub Repository (2 minutes)

### Option A: Using GitHub Website (Easiest)

1. **Go to:** https://github.com/new
2. **Fill in:**
   - Repository name: `pathconvert`
   - Description: `PathConvert - AI-powered collection cross-linking app for Shopify`
   - Visibility: **Public** (or Private if preferred)
   - ❌ **DO NOT** initialize with README, .gitignore, or license (we already have these)
3. **Click:** "Create repository"

4. **Copy the commands shown and run in terminal:**

```bash
cd /Users/cameronlowe/pathconvert

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/pathconvert.git

# Push code
git branch -M main
git push -u origin main
```

**Replace YOUR_USERNAME with your actual GitHub username!**

### Option B: Using GitHub CLI (If installed)

```bash
cd /Users/cameronlowe/pathconvert

# Create repo and push
gh repo create pathconvert --public --source=. --remote=origin --push
```

---

## Step 2: Delete Old GitHub Repository (1 minute)

1. **Go to:** https://github.com/cameronlowe1694/plp-linker-engine
2. **Click:** "Settings" (top right)
3. **Scroll to bottom** → Find "Danger Zone"
4. **Click:** "Delete this repository"
5. **Type to confirm:** `cameronlowe1694/plp-linker-engine`
6. **Click:** "I understand the consequences, delete this repository"

✅ **Done!** Old repo deleted.

---

## Step 3: Clean Up Render.com (5 minutes)

### A. Delete Old Web Service

1. **Go to:** https://dashboard.render.com
2. **Find service:** `plp-linker-engine` (or similar old name)
3. **Click** on the service name
4. **Click:** "Settings" (left sidebar)
5. **Scroll to bottom** → "Delete Web Service"
6. **Type service name to confirm**
7. **Click:** "Delete"

### B. Delete Old PostgreSQL Database

1. **Still in Render Dashboard**
2. **Click:** "PostgreSQL" (left sidebar)
3. **Find database** associated with old app (might be `plp-linker-engine-db`)
4. **Click** on database name
5. **Click:** "Settings" tab
6. **Scroll to bottom** → "Delete Database"
7. **Type database name to confirm**
8. **Click:** "Delete"

⚠️ **Warning:** This will permanently delete all data!

### C. Delete Old Redis Instance

1. **Still in Render Dashboard**
2. **Click:** "Redis" (left sidebar)
3. **Find Redis** associated with old app
4. **Click** on Redis instance name
5. **Click:** "Settings" tab
6. **Scroll to bottom** → "Delete Redis"
7. **Confirm deletion**

✅ **Done!** Render.com is clean.

---

## Step 4: Clean Up Shopify Partners (3 minutes)

### A. Delete Old App

1. **Go to:** https://partners.shopify.com/4570938/apps
2. **You should see:**
   - Old app (might be "Draft" status or have old name)
   - Maybe named "PLP Linker Engine" or similar

3. **Click** on the old app name
4. **Click:** "App setup" (left sidebar)
5. **Scroll to bottom**
6. **Click:** "Delete app"
7. **Confirm** by typing app name

**⚠️ If you see "Cannot delete - app has installations":**
- First uninstall from all dev stores (see Step 5 below)
- Then come back and delete

### B. Create Fresh PathConvert App

1. **Still in:** https://partners.shopify.com/4570938/apps
2. **Click:** "Create app" (top right)
3. **Choose:** "Public app"
4. **Fill in:**
   - App name: `PathConvert`
   - App URL: `https://pathconvert.onrender.com` (or your URL)
   - Allowed redirection URL(s):
     ```
     https://pathconvert.onrender.com/api/auth/callback
     http://localhost:3000/api/auth/callback
     ```
5. **Click:** "Create app"

### C. Configure App Scopes

1. **Click:** "Configuration" (left sidebar)
2. **Scroll to:** "App scopes"
3. **Select:**
   - ✅ `read_products`
   - ✅ `read_themes`
   - ✅ `read_content`
   - ✅ `read_locations`
4. **Click:** "Save"

### D. Copy Credentials

1. **On same page**, find "App credentials"
2. **Copy** these values to a safe place:
   - **API key:** (starts with something like `1a2b3c...`)
   - **API secret key:** (Click "Show" to reveal)

**You'll need these for your .env file later!**

✅ **Done!** Fresh PathConvert app created.

---

## Step 5: Clean Up Shopify Dev Stores (2 minutes per store)

### A. Uninstall Old App

For **each dev store** that has the old app:

1. **Go to:** Your dev store admin (e.g., `your-store.myshopify.com/admin`)
2. **Click:** "Apps" (left sidebar)
3. **Find** the old app in the list
4. **Click** on it
5. **Click:** "Delete" or "Uninstall app"
6. **Confirm** deletion

### B. Remove Old Theme Extension Blocks

1. **Go to:** "Online Store" → "Themes"
2. **Click:** "Customize" on your active theme
3. **Navigate to** a collection page in the theme editor
4. **Look for** old app blocks (might be named "PLP Related Collections" or similar)
5. **Click** the block → **Delete**
6. **Repeat** for all collection templates that have it
7. **Click:** "Save"

✅ **Done!** Dev stores are clean.

---

## Step 6: Local Environment - Already Done! ✅

**Good news:** The cleanup script already did these for you:

- ✅ Cleaned node_modules
- ✅ Reinstalled fresh dependencies (176 packages)
- ✅ No old database references

**You don't need to do anything for this step!**

---

## Step 7: Verify Everything is Clean

Run this verification script:

```bash
cd /Users/cameronlowe/pathconvert

# Check for old references
echo "Checking for old references..."
grep -r "plp-linker\|plplinker" . --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" --exclude="*.sh" 2>/dev/null || echo "✅ No old references found!"

# Check Git remote
echo ""
echo "Git remote:"
git remote -v || echo "No remote configured yet"

# Check if files are ready
echo ""
echo "Project files:"
ls -1 | head -10
```

---

## Checklist - Mark as Complete

Use this to track your progress:

- [ ] **GitHub:** Created new pathconvert repository
- [ ] **GitHub:** Deleted old plp-linker-engine repository
- [ ] **Render.com:** Deleted old web service
- [ ] **Render.com:** Deleted old PostgreSQL database
- [ ] **Render.com:** Deleted old Redis instance
- [ ] **Shopify Partners:** Deleted old app
- [ ] **Shopify Partners:** Created fresh PathConvert app
- [ ] **Shopify Partners:** Saved API key and secret
- [ ] **Shopify Dev Stores:** Uninstalled old app from all stores
- [ ] **Shopify Dev Stores:** Removed old theme extension blocks
- [x] **Local Environment:** Cleaned and ready (done by script!)

---

## Next Steps After Cleanup

Once you've completed all the above:

1. **Create .env file:**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your credentials
   ```

2. **Add your Shopify credentials** (from Step 4.D):
   ```
   SHOPIFY_API_KEY=your_key_here
   SHOPIFY_API_SECRET=your_secret_here
   ```

3. **Add your OpenAI key:**
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```

4. **Deploy to Render.com** (fresh deployment)

5. **Install PathConvert** on your dev store

---

## Need Help?

If you get stuck on any step:

1. **Shopify Partners:** Check the [Shopify Partners docs](https://partners.shopify.com/docs)
2. **Render.com:** Check [Render docs](https://render.com/docs)
3. **GitHub:** Check [GitHub docs](https://docs.github.com)

---

**You're almost there! Just a few manual clicks and you'll have a completely clean slate! 🎉**
