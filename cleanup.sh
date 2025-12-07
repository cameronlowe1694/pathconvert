#!/bin/bash

# PathConvert Local Cleanup Script
# Removes all traces of old plp-linker-engine attempts

set -e  # Exit on any error

echo "🧹 PathConvert - Local Environment Cleanup"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "ℹ $1"
}

# 1. Check for old references in code
echo "1️⃣  Checking for old 'plp-linker' references..."
if grep -r "plp-linker\|plplinker" . --exclude-dir=node_modules --exclude-dir=.git --exclude="*.sh" -q 2>/dev/null; then
    print_warning "Found old 'plp-linker' references in code (this is okay if in CLEANUP_GUIDE.md)"
    grep -r "plp-linker\|plplinker" . --exclude-dir=node_modules --exclude-dir=.git --exclude="*.sh" -l 2>/dev/null | head -5
else
    print_success "No old 'plp-linker' references found in code"
fi
echo ""

# 2. Clean Node modules
echo "2️⃣  Cleaning Node.js environment..."
if [ -d "node_modules" ]; then
    print_info "Removing node_modules directory..."
    rm -rf node_modules
    print_success "node_modules removed"
else
    print_info "node_modules already clean"
fi

if [ -f "package-lock.json" ]; then
    print_info "Removing package-lock.json..."
    rm -f package-lock.json
    print_success "package-lock.json removed"
fi

print_info "Cleaning npm cache..."
npm cache clean --force > /dev/null 2>&1
print_success "npm cache cleaned"
echo ""

# 3. Clean databases
echo "3️⃣  Cleaning PostgreSQL databases..."

# Check if psql is available
if command -v psql &> /dev/null; then
    # Drop old databases
    OLD_DBS=("plp_linker_engine" "plplinker" "pathconvert_old")

    for db in "${OLD_DBS[@]}"; do
        if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$db"; then
            print_info "Dropping old database: $db"
            dropdb "$db" 2>/dev/null || print_warning "Could not drop $db (may not exist or permission denied)"
            print_success "Database $db dropped"
        fi
    done

    # Check if pathconvert database exists
    if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "pathconvert"; then
        print_warning "pathconvert database already exists"
        read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            dropdb pathconvert 2>/dev/null || print_error "Failed to drop pathconvert database"
            createdb pathconvert
            psql pathconvert -c "CREATE EXTENSION IF NOT EXISTS vector;" > /dev/null 2>&1
            print_success "pathconvert database recreated with pgvector"
        else
            print_info "Keeping existing pathconvert database"
        fi
    else
        print_info "Creating fresh pathconvert database..."
        createdb pathconvert
        psql pathconvert -c "CREATE EXTENSION IF NOT EXISTS vector;" > /dev/null 2>&1
        print_success "pathconvert database created with pgvector extension"
    fi
else
    print_warning "PostgreSQL not found - skipping database cleanup"
    print_info "Please manually create database: createdb pathconvert && psql pathconvert -c 'CREATE EXTENSION vector;'"
fi
echo ""

# 4. Clean Redis
echo "4️⃣  Cleaning Redis..."
if command -v redis-cli &> /dev/null; then
    # Check if Redis is running
    if redis-cli ping > /dev/null 2>&1; then
        print_info "Flushing all Redis data..."
        redis-cli FLUSHALL > /dev/null 2>&1
        print_success "Redis cache cleared"
    else
        print_warning "Redis is not running - skipping"
        print_info "Start Redis with: brew services start redis (macOS) or redis-server"
    fi
else
    print_warning "Redis CLI not found - skipping Redis cleanup"
fi
echo ""

# 5. Clean Git (if needed)
echo "5️⃣  Checking Git configuration..."
if [ -d ".git" ]; then
    REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")

    if [[ $REMOTE_URL == *"plp-linker"* ]]; then
        print_warning "Git remote still points to old repository: $REMOTE_URL"
        print_info "Removing old remote..."
        git remote remove origin 2>/dev/null || true
        print_success "Old remote removed"
        print_info "You can add new remote with: git remote add origin https://github.com/YOUR_USERNAME/pathconvert.git"
    elif [[ $REMOTE_URL == *"pathconvert"* ]]; then
        print_success "Git remote correctly points to pathconvert: $REMOTE_URL"
    else
        print_info "No remote configured (this is fine)"
    fi
else
    print_info "Not a git repository - you can initialize with: git init"
fi
echo ""

# 6. Install fresh dependencies
echo "6️⃣  Installing fresh dependencies..."
print_info "Running npm install..."
if npm install > /dev/null 2>&1; then
    print_success "Dependencies installed successfully"

    # Count installed packages
    PACKAGE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
    print_info "Installed $PACKAGE_COUNT packages"
else
    print_error "npm install failed - please run manually: npm install"
fi
echo ""

# 7. Run database migrations
echo "7️⃣  Running database migrations..."
if [ -f "src/database/migrate.js" ]; then
    if command -v psql &> /dev/null && psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "pathconvert"; then
        print_info "Running migrations..."
        if npm run db:migrate > /dev/null 2>&1; then
            print_success "Database migrations completed"
        else
            print_warning "Migration script exists but failed - you may need to run manually: npm run db:migrate"
        fi
    else
        print_warning "Skipping migrations - database not ready"
    fi
else
    print_warning "Migration script not found at src/database/migrate.js"
fi
echo ""

# 8. Verify .env
echo "8️⃣  Checking environment configuration..."
if [ -f ".env" ]; then
    if grep -q "plp\|linker" .env 2>/dev/null; then
        print_error "Found old references in .env file!"
        print_info "Please review and update your .env file"
    else
        print_success ".env file looks clean"
    fi
else
    print_warning ".env file not found"
    if [ -f ".env.example" ]; then
        print_info "Copy template with: cp .env.example .env"
    fi
fi
echo ""

# 9. Final verification
echo "9️⃣  Final verification..."
echo ""
echo "Checking for remaining issues:"

# Check for old database connections
if grep -r "plp_linker\|plplinker" src/ --include="*.js" -q 2>/dev/null; then
    print_error "Found old database references in source code!"
else
    print_success "No old database references in source code"
fi

# Check Redis keys
if command -v redis-cli &> /dev/null && redis-cli ping > /dev/null 2>&1; then
    OLD_KEYS=$(redis-cli KEYS "*plp*" 2>/dev/null | wc -l)
    if [ "$OLD_KEYS" -gt 0 ]; then
        print_warning "Found $OLD_KEYS old keys in Redis"
    else
        print_success "Redis has no old keys"
    fi
fi

echo ""
echo "==========================================="
echo -e "${GREEN}✅ Local cleanup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Update your .env file with credentials"
echo "  2. Delete old app from Shopify Partners dashboard"
echo "  3. Delete old services from Render.com"
echo "  4. Delete old GitHub repository"
echo ""
echo "See CLEANUP_GUIDE.md for detailed instructions"
echo ""
