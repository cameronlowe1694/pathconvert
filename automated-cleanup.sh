#!/bin/bash

# PathConvert - Automated Cleanup Script
# Removes old plp-linker-engine services from Render.com and Shopify

echo "🧹 PathConvert - Automated Cleanup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if CLIs are authenticated
echo "1️⃣  Checking CLI authentication..."
echo ""

# Check Render CLI
echo "📦 Render CLI:"
if render services list &>/dev/null; then
    echo -e "${GREEN}✅ Authenticated${NC}"
    RENDER_AUTH=true
else
    echo -e "${RED}❌ Not authenticated${NC}"
    echo "   Please run: render login"
    RENDER_AUTH=false
fi

echo ""

# Check Shopify CLI
echo "🛍️  Shopify CLI:"
if shopify whoami &>/dev/null; then
    echo -e "${GREEN}✅ Authenticated${NC}"
    SHOPIFY_AUTH=true
else
    echo -e "${RED}❌ Not authenticated${NC}"
    echo "   Please run: shopify auth login"
    SHOPIFY_AUTH=false
fi

echo ""
echo "=================================="
echo ""

# Exit if not authenticated
if [ "$RENDER_AUTH" = false ] || [ "$SHOPIFY_AUTH" = false ]; then
    echo -e "${RED}⚠️  Cannot proceed without authentication${NC}"
    echo ""
    echo "Please authenticate and run this script again:"
    echo "  1. render login"
    echo "  2. shopify auth login"
    echo ""
    exit 1
fi

# Proceed with cleanup
echo "2️⃣  Starting automated cleanup..."
echo ""

# ============================================
# RENDER.COM CLEANUP
# ============================================

echo "📦 Render.com Cleanup"
echo "--------------------"
echo ""

# List all services first
echo "Current services:"
render services list

echo ""
echo -e "${YELLOW}Searching for old plp-linker-engine services...${NC}"
echo ""

# Get service names that contain "plp-linker" or "plp_linker"
OLD_SERVICES=$(render services list 2>/dev/null | grep -i "plp" || echo "")

if [ -z "$OLD_SERVICES" ]; then
    echo -e "${GREEN}✅ No old services found${NC}"
else
    echo "Found old services:"
    echo "$OLD_SERVICES"
    echo ""

    read -p "Delete these services? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Note: Render CLI service deletion requires exact service ID or name
        # List services and let user confirm specific ones to delete
        echo -e "${YELLOW}⚠️  Please delete services manually via:${NC}"
        echo "   render services delete SERVICE_NAME"
        echo ""
        echo "   Or use Render Dashboard:"
        echo "   https://dashboard.render.com"
    fi
fi

echo ""

# ============================================
# SHOPIFY CLEANUP
# ============================================

echo "🛍️  Shopify Cleanup"
echo "------------------"
echo ""

# List all apps
echo "Listing your Shopify apps..."
shopify app list 2>/dev/null || echo "No apps found or error listing apps"

echo ""
echo -e "${YELLOW}⚠️  Important: Shopify CLI Limitations${NC}"
echo ""
echo "The Shopify CLI CANNOT delete apps."
echo "You must delete old apps via the web interface:"
echo ""
echo "  1. Go to: https://partners.shopify.com/organizations"
echo "  2. Select your organization"
echo "  3. Click 'Apps' in the sidebar"
echo "  4. Find old 'PLP Linker' or similar app"
echo "  5. Click app → App setup → Delete app"
echo ""

read -p "Have you deleted the old app via web interface? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}✅ Old Shopify app cleanup confirmed${NC}"
else
    echo -e "${YELLOW}⏳ Please delete old app manually and re-run this script${NC}"
fi

echo ""

# ============================================
# CREATE NEW SHOPIFY APP (Optional)
# ============================================

echo "3️⃣  Create New PathConvert App"
echo "------------------------------"
echo ""

read -p "Create new PathConvert app via CLI? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Creating PathConvert app..."

    # Note: This creates app in current directory
    # May need to specify org/partner account
    shopify app create

    echo ""
    echo -e "${GREEN}✅ App creation initiated${NC}"
    echo "   Follow the prompts above to complete setup"
else
    echo ""
    echo "Skipping app creation. You can create manually at:"
    echo "https://partners.shopify.com/organizations"
fi

echo ""

# ============================================
# SUMMARY
# ============================================

echo "=================================="
echo "✅ Automated Cleanup Complete!"
echo "=================================="
echo ""
echo "What was done:"
echo "  ✅ Checked Render services (manual deletion required)"
echo "  ✅ Listed Shopify apps (manual deletion required)"
echo ""
echo "Manual steps still required:"
echo "  ⏳ Delete old Render services via CLI or dashboard"
echo "  ⏳ Delete old Shopify app via Partners dashboard"
echo "  ⏳ Uninstall old app from dev stores"
echo "  ⏳ Remove old theme blocks from stores"
echo ""
echo "See MANUAL_CLEANUP_STEPS.md for detailed instructions."
echo ""
echo "Next steps:"
echo "  1. Complete manual cleanup steps above"
echo "  2. Create .env file: cp .env.example .env"
echo "  3. Add your API credentials to .env"
echo "  4. Deploy to Render: see README.md"
echo ""
