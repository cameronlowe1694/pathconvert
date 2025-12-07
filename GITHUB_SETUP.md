# GitHub CLI Setup Guide

GitHub CLI (`gh`) is now installed! Here's how to authenticate it so I can create repositories for you.

## Quick Setup (2 minutes)

### Step 1: Authenticate with GitHub

Run this command in your terminal:

```bash
gh auth login
```

You'll be prompted with:

1. **What account do you want to log into?**
   - Select: `GitHub.com`

2. **What is your preferred protocol?**
   - Select: `HTTPS` (recommended)

3. **Authenticate Git with your GitHub credentials?**
   - Select: `Yes`

4. **How would you like to authenticate?**
   - Select: `Login with a web browser` (easiest)

5. **Copy the code shown**, then press Enter

6. **Browser will open** - paste the code and authorize

7. **Done!** ✅

### Step 2: Verify Authentication

```bash
gh auth status
```

Should show:
```
✓ Logged in to github.com as YOUR_USERNAME
```

### Step 3: Let me create the repository

Once you've authenticated, I can run:

```bash
cd /Users/cameronlowe/pathconvert
gh repo create pathconvert --public --source=. --remote=origin --push
```

This will:
- ✅ Create `pathconvert` repository on GitHub
- ✅ Set it as the remote for your local repo
- ✅ Push all your code automatically

## Alternative: Manual Setup

If you prefer to do it manually:

1. Go to: https://github.com/new
2. Repository name: `pathconvert`
3. Public
4. Don't initialize with README (we already have files)
5. Create repository
6. Then run:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/pathconvert.git
   git push -u origin main
   ```

## What About Other Services?

**For Shopify Partners & Render.com:**
- These don't have CLI tools like GitHub
- You'll still need to use the web interface for those
- Follow the steps in MANUAL_CLEANUP_STEPS.md

**But I can help you:**
- Create deployment scripts
- Generate configuration files
- Automate local tasks
- Commit and push code changes

## Benefits of GitHub CLI

Once authenticated, I can:
- ✅ Create repositories
- ✅ Create pull requests
- ✅ Manage issues
- ✅ Create releases
- ✅ Push code automatically

---

**Ready to authenticate? Run:** `gh auth login`
