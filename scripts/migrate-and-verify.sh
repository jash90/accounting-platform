#!/bin/bash

# Database Migration Runner and Verifier
# This script runs all pending migrations and verifies they were applied successfully

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATION_DIR="$PROJECT_ROOT/drizzle"

echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}${BOLD}  Database Migration Manager${NC}"
echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to load environment variables
load_env() {
    local env_file="$1"
    if [ -f "$env_file" ]; then
        echo -e "${GREEN}✓${NC} Loading environment from: $env_file"
        # Export variables from .env file, handling special characters
        while IFS='=' read -r key value; do
            # Skip comments and empty lines
            [[ $key =~ ^#.*$ ]] && continue
            [[ -z $key ]] && continue
            # Remove leading/trailing whitespace and quotes
            key=$(echo "$key" | xargs)
            value=$(echo "$value" | xargs | sed -e 's/^"//' -e 's/"$//')
            # Export variable
            export "$key=$value" 2>/dev/null || true
        done < "$env_file"
    fi
}

# Load environment variables (prefer backend .env)
echo -e "${BOLD}📁 Loading Configuration...${NC}"
load_env "$PROJECT_ROOT/apps/backend/.env"
load_env "$PROJECT_ROOT/.env"

# Validate DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}✗ Error: DATABASE_URL not found in .env files${NC}"
    echo -e "${YELLOW}  Please set DATABASE_URL in .env or apps/backend/.env${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Database URL: ${DATABASE_URL%%@*}@***"
echo ""

# Test database connection
echo -e "${BOLD}🔌 Testing Database Connection...${NC}"
if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}✗ Error: Cannot connect to database${NC}"
    echo -e "${YELLOW}  Please check if PostgreSQL is running and credentials are correct${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Database connection successful"
echo ""

# Ensure __drizzle_migrations table exists
echo -e "${BOLD}📊 Checking Migration Tracking Table...${NC}"
psql "$DATABASE_URL" -c "
CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash TEXT NOT NULL,
    created_at BIGINT
);" > /dev/null 2>&1

echo -e "${GREEN}✓${NC} Migration tracking table ready"
echo ""

# Get list of migration files
echo -e "${BOLD}📂 Discovering Migration Files...${NC}"
MIGRATION_FILES=($(ls -1 "$MIGRATION_DIR"/*.sql 2>/dev/null | sort))

if [ ${#MIGRATION_FILES[@]} -eq 0 ]; then
    echo -e "${YELLOW}⚠ No migration files found in $MIGRATION_DIR${NC}"
    exit 0
fi

echo -e "${GREEN}✓${NC} Found ${#MIGRATION_FILES[@]} migration files"
echo ""

# Display migration files
echo -e "${BOLD}📋 Migration Files:${NC}"
for migration in "${MIGRATION_FILES[@]}"; do
    filename=$(basename "$migration")
    echo -e "   • $filename"
done
echo ""

# Check which migrations have been applied
echo -e "${BOLD}🔍 Checking Applied Migrations...${NC}"

# Create a temporary file to store applied migrations
APPLIED_MIGRATIONS=$(psql "$DATABASE_URL" -t -c "SELECT hash FROM __drizzle_migrations;" 2>/dev/null | tr -d ' ')

# Arrays to track status
PENDING_MIGRATIONS=()
APPLIED_COUNT=0
PENDING_COUNT=0

# Check each migration file
for migration in "${MIGRATION_FILES[@]}"; do
    filename=$(basename "$migration")
    # Use filename as hash for tracking
    migration_hash="$filename"

    if echo "$APPLIED_MIGRATIONS" | grep -q "$migration_hash"; then
        echo -e "   ${GREEN}✅${NC} $filename ${GREEN}(applied)${NC}"
        ((APPLIED_COUNT++))
    else
        echo -e "   ${YELLOW}⏳${NC} $filename ${YELLOW}(pending)${NC}"
        PENDING_MIGRATIONS+=("$migration")
        ((PENDING_COUNT++))
    fi
done
echo ""

# If no pending migrations, we're done
if [ ${#PENDING_MIGRATIONS[@]} -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✅ All migrations are up to date!${NC}"
    echo -e "${GREEN}   Applied: $APPLIED_COUNT / ${#MIGRATION_FILES[@]}${NC}"
    exit 0
fi

# Run pending migrations
echo -e "${BOLD}🚀 Running Pending Migrations...${NC}"
echo ""

FAILED_MIGRATIONS=()

for migration in "${PENDING_MIGRATIONS[@]}"; do
    filename=$(basename "$migration")
    echo -e "${BLUE}▶${NC} Executing: ${BOLD}$filename${NC}"

    # Run migration
    if psql "$DATABASE_URL" -f "$migration" > /dev/null 2>&1; then
        # Record migration as applied
        migration_hash="$filename"
        created_at=$(date +%s)000  # Unix timestamp in milliseconds

        psql "$DATABASE_URL" -c "
        INSERT INTO __drizzle_migrations (hash, created_at)
        VALUES ('$migration_hash', $created_at)
        ON CONFLICT DO NOTHING;" > /dev/null 2>&1

        echo -e "${GREEN}  ✓${NC} Applied successfully"
    else
        echo -e "${RED}  ✗${NC} Failed to apply"
        FAILED_MIGRATIONS+=("$filename")
    fi
    echo ""
done

# Final verification
echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}📊 Migration Summary${NC}"
echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Count applied migrations now
FINAL_APPLIED=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM __drizzle_migrations;" 2>/dev/null | tr -d ' ')

echo -e "   Total migrations found: ${BOLD}${#MIGRATION_FILES[@]}${NC}"
echo -e "   Successfully applied:   ${GREEN}${BOLD}$FINAL_APPLIED${NC}"
echo -e "   Failed:                 ${RED}${BOLD}${#FAILED_MIGRATIONS[@]}${NC}"
echo ""

# List failed migrations if any
if [ ${#FAILED_MIGRATIONS[@]} -gt 0 ]; then
    echo -e "${RED}${BOLD}❌ Failed Migrations:${NC}"
    for failed in "${FAILED_MIGRATIONS[@]}"; do
        echo -e "${RED}   ✗${NC} $failed"
    done
    echo ""
    exit 1
fi

# Show applied migrations in database
echo -e "${BOLD}📜 Applied Migrations (from database):${NC}"
MIGRATION_TABLE=$(psql "$DATABASE_URL" -c "
SELECT
    ROW_NUMBER() OVER (ORDER BY created_at) as num,
    hash as migration_file,
    TO_TIMESTAMP(created_at::bigint / 1000) as applied_at
FROM __drizzle_migrations
ORDER BY created_at;" 2>/dev/null)

# Display table without header/footer rows
echo "$MIGRATION_TABLE" | tail -n +3 | sed '$ d' | sed '$ d'

echo ""
echo -e "${GREEN}${BOLD}✅ All migrations completed successfully!${NC}"
echo ""
