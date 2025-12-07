#!/bin/bash

# PathConvert Setup Script
# Automates the initial setup process

set -e

echo "🚀 PathConvert Setup Script"
echo "============================"
echo ""

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Error: Node.js 18 or higher is required"
  echo "   Current version: $(node -v)"
  exit 1
fi
echo "✓ Node.js version OK: $(node -v)"
echo ""

# Check PostgreSQL
echo "Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
  echo "❌ Error: PostgreSQL is not installed"
  echo "   Install PostgreSQL 14+ and try again"
  exit 1
fi
echo "✓ PostgreSQL found"
echo ""

# Check Redis
echo "Checking Redis..."
if ! command -v redis-cli &> /dev/null; then
  echo "⚠️  Warning: Redis CLI not found"
  echo "   Redis is required for production. Install it or use Docker."
else
  echo "✓ Redis found"
fi
echo ""

# Install npm dependencies
echo "Installing npm dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Copy .env.example if .env doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file from template..."
  cp .env.example .env
  echo "✓ .env file created"
  echo ""
  echo "⚠️  IMPORTANT: Edit .env and fill in your API keys:"
  echo "   - SHOPIFY_API_KEY"
  echo "   - SHOPIFY_API_SECRET"
  echo "   - OPENAI_API_KEY"
  echo "   - DATABASE_URL"
  echo ""
  read -p "Press enter when you've updated .env..."
else
  echo "✓ .env file already exists"
  echo ""
fi

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Create database if it doesn't exist
echo "Setting up database..."
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
if [ -z "$DB_NAME" ]; then
  DB_NAME="pathconvert"
fi

echo "Database name: $DB_NAME"

# Check if database exists
if psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
  echo "✓ Database '$DB_NAME' already exists"
else
  echo "Creating database '$DB_NAME'..."
  createdb $DB_NAME || {
    echo "⚠️  Could not create database. You may need to do this manually."
  }
  echo "✓ Database created"
fi
echo ""

# Install pgvector extension
echo "Installing pgvector extension..."
psql $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS vector;" || {
  echo "⚠️  Could not install pgvector extension"
  echo "   Install it manually: https://github.com/pgvector/pgvector"
}
echo "✓ pgvector extension installed"
echo ""

# Run database migrations
echo "Running database migrations..."
npm run db:migrate
echo "✓ Migrations completed"
echo ""

# Check if ngrok is installed (for development)
if command -v ngrok &> /dev/null; then
  echo "✓ ngrok found (useful for development)"
  echo ""
  echo "To start ngrok tunnel, run in a separate terminal:"
  echo "  ngrok http 3000"
  echo ""
else
  echo "⚠️  ngrok not found (optional for local development)"
  echo "   Install: https://ngrok.com/download"
  echo ""
fi

echo "========================"
echo "✅ Setup Complete!"
echo "========================"
echo ""
echo "Next steps:"
echo "1. Start the development server: npm run dev"
echo "2. Set up ngrok tunnel: ngrok http 3000"
echo "3. Update Shopify app settings with your ngrok URL"
echo "4. Install the app on a development store"
echo ""
echo "For more details, see INSTALLATION.md"
echo ""
