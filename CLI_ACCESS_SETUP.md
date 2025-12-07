# CLI Access Setup - Complete Automation

Now we have CLIs for all services! Here's how to give me access to automate everything.

## ✅ Already Installed:
- **GitHub CLI** (`gh`) - ✅ Authenticated
- **Shopify CLI** (`shopify`) - Ready to authenticate
- **Render CLI** (`render`) - Ready to authenticate

---

## 1. Render CLI Setup (2 minutes)

### Step 1: Get API Token

1. **Go to:** https://dashboard.render.com/u/settings/api
2. **Click:** "Create API Key"
3. **Name it:** "PathConvert CLI"
4. **Copy the token** (starts with `rnd_...`)

### Step 2: Authenticate

Run this command and paste your token:

```bash
render login
```

Or set it as environment variable:

```bash
export RENDER_API_KEY="rnd_your_token_here"
```

### Step 3: Test Authentication

```bash
render services list
```

Should show your current services (including old plp-linker-engine).

---

## 2. Shopify CLI Setup (3 minutes)

### Step 1: Authenticate with Partners Account

```bash
shopify auth login
```

Follow the prompts:
1. Browser opens
2. Login to your Partners account
3. Grant access to Shopify CLI

### Step 2: Verify Authentication

```bash
shopify whoami
```

Should show your Partners account email.

---

## What I Can Do With CLI Access

### ✅ GitHub (Already Done!)
- ✅ Created repository
- ✅ Pushed code
- Can manage releases, issues, PRs

### ✅ Render.com (After Authentication)
- List all services
- Delete old `plp-linker-engine` service
- Delete old PostgreSQL database
- Delete old Redis instance
- Create new PathConvert service
- Deploy automatically

### ✅ Shopify (After Authentication)
- List all apps in Partners account
- Create new apps
- Configure app settings
- Deploy theme extensions
- Manage app versions

---

## Automated Cleanup Script

Once you authenticate both Render and Shopify, I can run this:

```bash
#!/bin/bash
# Full automated cleanup

# 1. Render - Delete old services
render services delete plp-linker-engine --yes
render databases delete plp-linker-engine-db --yes
render redis delete plp-linker-engine-redis --yes

# 2. Shopify - Create new app
shopify app create --name=PathConvert --type=public

# 3. Deploy extension
cd extensions/pathconvert-buttons
shopify app deploy
```

---

## Important Limitations

### Shopify CLI Limitations:
- **Cannot delete apps** via CLI (must use web interface)
- **Cannot manage Partners account settings** (web only)
- **CAN:** Create apps, deploy extensions, manage app configuration

### Render CLI Limitations:
- **CAN:** Delete services, databases, Redis
- **CAN:** Create new services
- **CAN:** Deploy applications
- **Full API access:** Most features available

---

## Quick Setup Commands

Run these in order:

```bash
# 1. Render
render login
# Paste your API token from https://dashboard.render.com/u/settings/api

# 2. Shopify
shopify auth login
# Browser opens → Login → Authorize

# 3. Verify both
render services list
shopify whoami
```

---

## What Still Needs Manual Steps

Even with CLI access:

### ❌ Must use web interface:
1. **Shopify Partners:** Delete old app (no CLI command)
2. **Shopify Dev Stores:** Uninstall apps (no CLI for this)
3. **Theme Editor:** Remove old app blocks (no CLI for theme editor)

### ✅ Can automate with CLI:
1. **Render:** Everything (delete old, create new, deploy)
2. **Shopify:** Create new app, deploy extensions
3. **GitHub:** Everything (already done!)

---

## Next Steps

1. **Authenticate Render:**
   ```bash
   render login
   ```

2. **Authenticate Shopify:**
   ```bash
   shopify auth login
   ```

3. **Let me know when done** - I'll run automated cleanup scripts!

---

## Security Notes

- API tokens are stored locally (like GitHub CLI)
- Tokens can be revoked anytime from web dashboards
- CLI uses official APIs (same as web interface)
- No passwords are stored, only API tokens

---

**Ready?** Run the authentication commands above and I'll automate the rest!
