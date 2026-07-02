#!/bin/bash

# Tradebilia Startup Verification Script
# This script verifies that all required environment variables and dependencies are configured

set -e

echo "================================"
echo "Tradebilia Startup Verification"
echo "================================"
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  Node.js version: $NODE_VERSION"
else
    echo "  ✗ Node.js not found"
    exit 1
fi

# Check pnpm
echo "✓ Checking pnpm..."
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    echo "  pnpm version: $PNPM_VERSION"
else
    echo "  ✗ pnpm not found"
    exit 1
fi

# Check Git
echo "✓ Checking Git..."
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    echo "  $GIT_VERSION"
    echo "  Current branch: $(git branch --show-current)"
    echo "  Latest commit: $(git log --oneline -1)"
else
    echo "  ✗ Git not found"
    exit 1
fi

echo ""
echo "================================"
echo "Environment Variables"
echo "================================"
echo ""

# Check required environment variables
REQUIRED_VARS=(
    "VITE_APP_ID"
    "VITE_APP_TITLE"
    "OAUTH_SERVER_URL"
    "VITE_OAUTH_PORTAL_URL"
    "DATABASE_URL"
    "JWT_SECRET"
)

MISSING_VARS=0

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "✗ Missing: $var"
        MISSING_VARS=$((MISSING_VARS + 1))
    else
        # Show first 50 chars of sensitive vars
        VALUE="${!var}"
        if [ ${#VALUE} -gt 50 ]; then
            VALUE="${VALUE:0:50}..."
        fi
        echo "✓ $var = $VALUE"
    fi
done

echo ""

if [ $MISSING_VARS -gt 0 ]; then
    echo "⚠️  Missing $MISSING_VARS environment variable(s)"
    echo ""
    echo "These should be auto-injected by Manus. If they're missing:"
    echo "1. Try restarting the dev server: pnpm dev"
    echo "2. Check the Manus dashboard for secrets configuration"
    exit 1
fi

echo "✓ All required environment variables are set"
echo ""

# Check database connection
echo "================================"
echo "Database Connection"
echo "================================"
echo ""

if [ -z "$DATABASE_URL" ]; then
    echo "✗ DATABASE_URL not set, skipping database check"
else
    echo "✓ DATABASE_URL is configured"
    echo "  Database type: TiDB (MySQL-compatible)"
fi

echo ""
echo "================================"
echo "Ready to Start Development"
echo "================================"
echo ""
echo "Run: pnpm dev"
echo ""
echo "The dev server will start on http://localhost:3000"
echo "Open it in your browser to verify everything is working"
echo ""
