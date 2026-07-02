#!/bin/bash

# ============================================================================
# TRADEBILIA COMPLETE HANDOFF SCRIPT
# ============================================================================
# This script performs a COMPLETE setup for a new session from scratch:
# 1. Clones the project from Manus webdev repo (ONLY source of truth)
# 2. Installs all dependencies
# 3. Sets up environment variables
# 4. Fixes ALL 19 broken image URLs in database
# 5. Verifies everything works
# 6. Provides summary and next steps
#
# USAGE: bash COMPLETE_HANDOFF.sh
# ============================================================================

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# CONFIGURATION - MANUS REPO ONLY
# ============================================================================
PROJECT_DIR="/home/ubuntu/collectors-barter"
MANUS_REPO="s3://vida-prod-gitrepo/webdev-git/310519663570115757/TzzwLt5FRwqjKKW5zhfchR"

# Database credentials
DB_HOST="gateway05.us-east-1.prod.aws.tidbcloud.com"
DB_USER="4ZXfWh5QbDJhQ4C.023db4f53938"
DB_PASS="9gg6EhlcJlBPkKU3111k"
DB_NAME="TzzwLt5FRwqjKKW5zhfchR"

# Environment variables
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://manus.im"
VITE_APP_ID="TzzwLt5FRwqjKKW5zhfchR"
JWT_SECRET="2fTBz7ETgrcQ28xdigDHm2"
DATABASE_URL="mysql://4ZXfWh5QbDJhQ4C.023db4f53938:9gg6EhlcJlBPkKU3111k@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/TzzwLt5FRwqjKKW5zhfchR?ssl={\"rejectUnauthorized\":true}"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
  echo ""
}

print_step() {
  echo -e "${YELLOW}→ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# ============================================================================
# STEP 0: Welcome Banner
# ============================================================================
print_header "TRADEBILIA COMPLETE HANDOFF SETUP"
echo "This script will:"
echo "  1. Clone the project from Manus webdev repo (ONLY source of truth)"
echo "  2. Install all dependencies"
echo "  3. Set up environment variables"
echo "  4. Fix ALL 19 broken image URLs in database"
echo "  5. Verify everything works"
echo ""
echo "Time estimate: 5-10 minutes"
echo ""

# ============================================================================
# STEP 1: Clone Project from Manus Webdev Repo
# ============================================================================
print_header "STEP 1: CLONING FROM MANUS WEBDEV REPO"

if [ -d "$PROJECT_DIR" ]; then
  print_step "Project directory already exists. Removing old version..."
  rm -rf "$PROJECT_DIR"
fi

print_step "Cloning from Manus webdev repo..."
print_info "Repository: $MANUS_REPO"
git clone "$MANUS_REPO" "$PROJECT_DIR"
cd "$PROJECT_DIR"

print_success "Project cloned successfully from Manus webdev repo"

# ============================================================================
# STEP 2: Verify Git Remote
# ============================================================================
print_header "STEP 2: VERIFYING GIT REMOTE"

print_step "Checking git remote configuration..."
git remote -v | grep origin

print_success "Git remote verified - using Manus webdev repo only"

# ============================================================================
# STEP 3: Install Dependencies
# ============================================================================
print_header "STEP 3: INSTALLING DEPENDENCIES"

print_step "Installing with pnpm..."
pnpm install

print_success "Dependencies installed"

# ============================================================================
# STEP 4: Set Up Environment Variables
# ============================================================================
print_header "STEP 4: SETTING UP ENVIRONMENT VARIABLES"

print_step "Creating .env file with all required variables..."

cat > .env << EOF
# OAuth Configuration
OAUTH_SERVER_URL=$OAUTH_SERVER_URL
VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL
VITE_APP_ID=$VITE_APP_ID
JWT_SECRET=$JWT_SECRET

# Database Configuration
DATABASE_URL=$DATABASE_URL
DRIZZLE_DATABASE_URL=$DATABASE_URL

# Manus API Configuration
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=\${BUILT_IN_FORGE_API_KEY}

# Frontend Configuration
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=\${VITE_FRONTEND_FORGE_API_KEY}
EOF

print_success "Environment variables configured in .env file"

# ============================================================================
# STEP 5: Verify Database Connection
# ============================================================================
print_header "STEP 5: VERIFYING DATABASE CONNECTION"

print_step "Testing database connection..."

db_test=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" \
  -e "SELECT COUNT(*) FROM listings;" 2>/dev/null | tail -1)

if [ -z "$db_test" ]; then
  print_error "Could not connect to database"
  print_info "Database credentials might be incorrect"
  exit 1
fi

print_success "Database connected successfully"
print_info "Found $db_test listings in database"

# ============================================================================
# STEP 6: FIX ALL 19 BROKEN IMAGE URLS - CRITICAL
# ============================================================================
print_header "STEP 6: FIXING ALL 19 BROKEN IMAGE URLS (CRITICAL)"

print_step "Checking for broken image URLs..."

broken_count=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" \
  -e "SELECT COUNT(*) FROM listingPhotos WHERE imageUrl NOT LIKE '/manus-storage/%';" 2>/dev/null | tail -1)

print_info "Found $broken_count broken image URLs"

if [ "$broken_count" -gt 0 ]; then
  print_step "Fixing broken URLs with SQL update..."
  print_info "Running: UPDATE listingPhotos SET imageUrl = CONCAT('/manus-storage/', fileKey) WHERE imageUrl NOT LIKE '/manus-storage/%';"
  
  mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" \
    -e "UPDATE listingPhotos SET imageUrl = CONCAT('/manus-storage/', fileKey) WHERE imageUrl NOT LIKE '/manus-storage/%';" 2>/dev/null
  
  print_success "Fixed $broken_count image URLs"
else
  print_success "No broken image URLs found"
fi

# Verify the fix
fixed_count=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" \
  -e "SELECT COUNT(*) FROM listingPhotos WHERE imageUrl LIKE '/manus-storage/%';" 2>/dev/null | tail -1)

print_info "Verification: $fixed_count images are now using /manus-storage/ paths"

# ============================================================================
# STEP 7: Collect Database Statistics
# ============================================================================
print_header "STEP 7: COLLECTING DATABASE STATISTICS"

total_items=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" \
  -e "SELECT COUNT(*) FROM listings;" 2>/dev/null | tail -1)

total_photos=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" \
  -e "SELECT COUNT(*) FROM listingPhotos;" 2>/dev/null | tail -1)

total_users=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" \
  -e "SELECT COUNT(*) FROM users;" 2>/dev/null | tail -1)

total_forum_posts=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" \
  -e "SELECT COUNT(*) FROM forumPosts;" 2>/dev/null | tail -1)

print_info "Total Listings: $total_items"
print_info "Total Photos: $total_photos"
print_info "Total Users: $total_users"
print_info "Total Forum Posts: $total_forum_posts"

# ============================================================================
# STEP 8: Verify Git Configuration and Latest Commit
# ============================================================================
print_header "STEP 8: VERIFYING GIT CONFIGURATION"

latest_commit=$(git log --oneline -1)
print_info "Latest commit: $latest_commit"

print_step "Verifying remote is Manus repo only..."
git remote -v | grep origin

print_success "Git configuration verified"

# ============================================================================
# STEP 9: Final Summary
# ============================================================================
print_header "✅ SETUP COMPLETE!"

echo "📋 Summary:"
echo "  ✅ Project cloned from Manus webdev repo (ONLY source of truth)"
echo "  ✅ Dependencies installed"
echo "  ✅ Environment variables set up"
echo "  ✅ Database connection verified"
echo "  ✅ Fixed ALL $broken_count broken image URLs"
echo ""
echo "📊 Database Statistics:"
echo "  • Listings: $total_items"
echo "  • Photos: $total_photos"
echo "  • Users: $total_users"
echo "  • Forum Posts: $total_forum_posts"
echo ""
echo "🚀 Next Steps:"
echo "  1. Start the dev server:"
echo "     cd $PROJECT_DIR && pnpm dev"
echo ""
echo "  2. Open http://localhost:3000 in your browser"
echo ""
echo "  3. Verify all features work:"
echo "     ✓ Hero section displays with background image"
echo "     ✓ Category navigation shows all 10 categories"
echo "     ✓ Items display with images (all fixed!)"
echo "     ✓ Collector's Forum link appears in left sidebar"
echo "     ✓ Admin dashboard is accessible"
echo ""
echo "💡 Troubleshooting:"
echo "  • If images still don't load: Clear browser cache (Ctrl+Shift+Delete)"
echo "  • If OAuth fails: Verify OAUTH_SERVER_URL is set"
echo "  • If database fails: Check DATABASE_URL is correct"
echo ""
echo "📚 Repository Info:"
echo "  • Source: Manus webdev repo (ONLY source of truth)"
echo "  • GitHub: Secondary backup only (not used for new sessions)"
echo ""
echo "Happy trading! 🎉"
echo ""
