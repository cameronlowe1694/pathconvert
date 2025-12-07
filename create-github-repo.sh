#!/bin/bash

# PathConvert - GitHub Repository Setup Script

echo "🔧 PathConvert - GitHub Repository Setup"
echo "========================================"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not installed"
    echo "Installing now..."
    brew install gh
fi

# Check authentication
echo "1️⃣  Checking GitHub authentication..."
if gh auth status &>/dev/null; then
    echo "✅ Already authenticated with GitHub"
    gh auth status
else
    echo "⚠️  Not authenticated with GitHub"
    echo ""
    echo "Please run: gh auth login"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo ""
echo "2️⃣  Creating GitHub repository 'pathconvert'..."

# Check if repo already exists
if gh repo view pathconvert &>/dev/null; then
    echo "⚠️  Repository 'pathconvert' already exists!"
    echo ""
    read -p "Do you want to set it as remote anyway? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Just add remote
        git remote remove origin 2>/dev/null || true
        gh repo view pathconvert --json url -q .url | xargs -I {} git remote add origin {}
        echo "✅ Remote added"
    fi
else
    # Create new repo
    gh repo create pathconvert \
        --public \
        --description "PathConvert - AI-powered collection cross-linking app for Shopify" \
        --source=. \
        --remote=origin \
        --push

    if [ $? -eq 0 ]; then
        echo "✅ Repository created and code pushed!"
        echo ""
        echo "Your repository: https://github.com/$(gh api user -q .login)/pathconvert"
    else
        echo "❌ Failed to create repository"
        exit 1
    fi
fi

echo ""
echo "3️⃣  Verifying setup..."
git remote -v

echo ""
echo "========================================"
echo "✅ GitHub setup complete!"
echo ""
echo "Next steps:"
echo "  1. Visit: https://github.com/$(gh api user -q .login)/pathconvert"
echo "  2. Continue with Render.com and Shopify cleanup"
echo "  3. See MANUAL_CLEANUP_STEPS.md for details"
echo ""
