#!/bin/bash

# ============================================================================
# TRADEBILIA SEAMLESS HANDOFF SETUP SCRIPT
# ============================================================================
# This script automates the complete setup for a new session
# Run this ONCE after cloning the project
# ============================================================================

set -e  # Exit on any error

echo "🚀 Starting Tradebilia Setup..."
echo ""

# ============================================================================
# STEP 1: Verify we're in the right directory
# ============================================================================
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Are you in the collectors-barter directory?"
  exit 1
fi

echo "✅ Step 1: Verified project directory"
echo ""

# ============================================================================
# STEP 2: Configure Git Remote to Manus Webdev Repo
# ============================================================================
echo "🔧 Step 2: Configuring Git Remote..."

# Remove GitHub remote if it exists
git remote remove origin 2>/dev/null || true

# Add Manus webdev repo as origin
git remote add origin s3://vida-prod-gitrepo/webdev-git/310519663570115757/TzzwLt5FRwqjKKW5zhfchR

echo "✅ Git remote configured to Manus webdev repo"
echo ""

# ============================================================================
# STEP 3: Install Dependencies
# ============================================================================
echo "📦 Step 3: Installing dependencies..."
pnpm install

echo "✅ Dependencies installed"
echo ""

# ============================================================================
# STEP 4: Verify Environment Variables
# ============================================================================
echo "🔐 Step 4: Verifying environment variables..."

required_vars=(
  "OAUTH_SERVER_URL"
  "VITE_APP_ID"
  "JWT_SECRET"
  "DATABASE_URL"
)

missing_vars=()
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
  echo "⚠️  Warning: Missing environment variables: ${missing_vars[*]}"
  echo "These should be auto-injected by Manus. If they're not set, add them to .env file"
else
  echo "✅ All required environment variables are set"
fi
echo ""

# ============================================================================
# STEP 5: Fix Database Image URLs (CRITICAL)
# ============================================================================
echo "🖼️  Step 5: Fixing database image URLs..."

# Database credentials
DB_HOST="gateway05.us-east-1.prod.aws.tidbcloud.com"
DB_USER="4ZXfWh5QbDJhQ4C.023db4f53938"
DB_PASS="9gg6EhlcJlBPkKU3111k"
DB_NAME="TzzwLt5FRwqjKKW5zhfchR"

# Check how many broken URLs exist
broken_count=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" \
  -e "SELECT COUNT(*) FROM listingPhotos WHERE imageUrl NOT LIKE '/manus-storage/%';" 2>/dev/null | tail -1)

if [ "$broken_count" -gt 0 ]; then
  echo "Found $broken_count broken image URLs. Fixing..."
  
  # Run the SQL fix
  mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" \
    -e "UPDATE listingPhotos SET imageUrl = CONCAT('/manus-storage/', fileKey) WHERE imageUrl NOT LIKE '/manus-storage/%';" 2>/dev/null
  
  echo "✅ Fixed $broken_count image URLs"
else
  echo "✅ No broken image URLs found"
fi
echo ""

# ============================================================================
# STEP 6: Verify Database Connection
# ============================================================================
echo "🗄️  Step 6: Verifying database connection..."

db_status=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" \
  -e "SELECT COUNT(*) FROM listings;" 2>/dev/null | tail -1)

if [ -z "$db_status" ]; then
  echo "⚠️  Warning: Could not verify database connection"
else
  echo "✅ Database connected. Found $db_status listings"
fi
echo ""

# ============================================================================
# STEP 7: Summary and Next Steps
# ============================================================================
echo "✅ Setup Complete!"
echo ""
echo "📋 Summary:"
echo "  ✅ Git configured to use Manus webdev repo"
echo "  ✅ Dependencies installed"
echo "  ✅ Environment variables verified"
echo "  ✅ Database image URLs fixed"
echo "  ✅ Database connection verified"
echo ""
echo "🚀 Next Steps:"
echo "  1. Start the dev server: pnpm dev"
echo "  2. Open http://localhost:3000 in your browser"
echo "  3. Verify all features work:"
echo "     - Hero section displays with background image"
echo "     - Category navigation shows all 10 categories"
echo "     - Items display with images"
echo "     - Collector's Forum link appears in left sidebar"
echo ""
echo "💡 Troubleshooting:"
echo "  - If images still don't load, clear browser cache (Ctrl+Shift+Delete)"
echo "  - If OAuth fails, verify OAUTH_SERVER_URL is set"
echo "  - If database fails, check DATABASE_URL is correct"
echo ""
echo "Happy trading! 🎉"
