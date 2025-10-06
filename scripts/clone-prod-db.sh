#!/bin/bash

# Database Clone Script
# Clones production database (port 5555) to development database (port 5432)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROD_HOST="localhost"
PROD_PORT="5555"
PROD_DB="sathub"
PROD_USER="sathub"

DEV_HOST="localhost"
DEV_PORT="5432"
DEV_DB="sathub"
DEV_USER="sathub"

BACKUP_FILE="/tmp/sathub_prod_backup_$(date +%Y%m%d_%H%M%S).sql"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  SatHub Database Cloning Tool         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if required tools are installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql is not installed${NC}"
    echo -e "${YELLOW}Please install PostgreSQL client tools:${NC}"
    echo -e "  Ubuntu/Debian: ${BLUE}sudo apt install postgresql-client${NC}"
    echo -e "  Fedora/RHEL:   ${BLUE}sudo dnf install postgresql${NC}"
    echo -e "  macOS:         ${BLUE}brew install postgresql@15${NC}"
    exit 1
fi

if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}Error: pg_dump is not installed${NC}"
    echo -e "${YELLOW}Please install PostgreSQL client tools (same as above)${NC}"
    exit 1
fi

# Prompt for production database password
echo -e "${YELLOW}Production Database Password${NC}"
echo -e "Enter the password for ${BLUE}$PROD_USER@$PROD_HOST:$PROD_PORT${NC}"
read -s -p "Password: " PROD_PASSWORD
echo ""
echo ""

# Prompt for development database password
echo -e "${YELLOW}Development Database Password${NC}"
echo -e "Enter the password for ${BLUE}$DEV_USER@$DEV_HOST:$DEV_PORT${NC}"
read -s -p "Password: " DEV_PASSWORD
echo ""
echo ""

# Export passwords for database operations
export PROD_PGPASSWORD="$PROD_PASSWORD"
export PGPASSWORD="$DEV_PASSWORD"

# Function to check if PostgreSQL is accessible
check_postgres() {
    local host=$1
    local port=$2
    local db=$3
    local user=$4
    local password=$5
    
    echo -e "${YELLOW}Checking connection to $host:$port...${NC}"
    
    if PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$db" -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Connected to $host:$port${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to connect to $host:$port${NC}"
        return 1
    fi
}

# Check production database
echo -e "\n${BLUE}Step 1: Checking production database${NC}"
if ! check_postgres "$PROD_HOST" "$PROD_PORT" "$PROD_DB" "$PROD_USER" "$PROD_PGPASSWORD"; then
    echo -e "${RED}Error: Cannot connect to production database on port $PROD_PORT${NC}"
    echo -e "${YELLOW}Make sure your production database proxy is running on port $PROD_PORT${NC}"
    exit 1
fi

# Check development database
echo -e "\n${BLUE}Step 2: Checking development database${NC}"
if ! check_postgres "$DEV_HOST" "$DEV_PORT" "$DEV_DB" "$DEV_USER" "$PGPASSWORD"; then
    echo -e "${RED}Error: Cannot connect to development database on port $DEV_PORT${NC}"
    echo -e "${YELLOW}Make sure your development database is running (docker compose up)${NC}"
    exit 1
fi

# Warning and confirmation
echo -e "\n${RED}⚠️  WARNING ⚠️${NC}"
echo -e "${YELLOW}This will:${NC}"
echo -e "  1. Create a backup from: ${BLUE}$PROD_HOST:$PROD_PORT/$PROD_DB${NC}"
echo -e "  2. Drop and recreate: ${RED}$DEV_HOST:$DEV_PORT/$DEV_DB${NC}"
echo -e "  3. Restore data to development database"
echo ""
echo -e "${RED}ALL DATA IN YOUR DEVELOPMENT DATABASE WILL BE LOST!${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Aborted.${NC}"
    exit 0
fi

# Backup production database
echo -e "\n${BLUE}Step 3: Creating backup from production database${NC}"
echo -e "${YELLOW}Backup file: $BACKUP_FILE${NC}"

PGPASSWORD="$PROD_PGPASSWORD" pg_dump \
    -h "$PROD_HOST" \
    -p "$PROD_PORT" \
    -U "$PROD_USER" \
    -d "$PROD_DB" \
    --no-owner \
    --no-acl \
    -F p \
    -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup created successfully ($BACKUP_SIZE)${NC}"
else
    echo -e "${RED}✗ Backup failed${NC}"
    exit 1
fi

# Drop and recreate development database
echo -e "\n${BLUE}Step 4: Resetting development database${NC}"

# Terminate existing connections
echo -e "${YELLOW}Terminating existing connections...${NC}"
PGPASSWORD="${PGPASSWORD:-}" psql \
    -h "$DEV_HOST" \
    -p "$DEV_PORT" \
    -U "$DEV_USER" \
    -d "postgres" \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DEV_DB' AND pid <> pg_backend_pid();" \
    > /dev/null 2>&1

# Drop database
echo -e "${YELLOW}Dropping database...${NC}"
PGPASSWORD="${PGPASSWORD:-}" psql \
    -h "$DEV_HOST" \
    -p "$DEV_PORT" \
    -U "$DEV_USER" \
    -d "postgres" \
    -c "DROP DATABASE IF EXISTS $DEV_DB;" \
    > /dev/null 2>&1

# Create database
echo -e "${YELLOW}Creating fresh database...${NC}"
PGPASSWORD="${PGPASSWORD:-}" psql \
    -h "$DEV_HOST" \
    -p "$DEV_PORT" \
    -U "$DEV_USER" \
    -d "postgres" \
    -c "CREATE DATABASE $DEV_DB OWNER $DEV_USER;" \
    > /dev/null 2>&1

echo -e "${GREEN}✓ Database reset complete${NC}"

# Restore backup to development
echo -e "\n${BLUE}Step 5: Restoring backup to development database${NC}"
echo -e "${YELLOW}This may take a while...${NC}"

PGPASSWORD="${PGPASSWORD:-}" psql \
    -h "$DEV_HOST" \
    -p "$DEV_PORT" \
    -U "$DEV_USER" \
    -d "$DEV_DB" \
    -f "$BACKUP_FILE" \
    > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Restore completed successfully${NC}"
else
    echo -e "${RED}✗ Restore failed${NC}"
    exit 1
fi

# Verify data
echo -e "\n${BLUE}Step 6: Verifying data${NC}"

# Count tables
TABLE_COUNT=$(PGPASSWORD="${PGPASSWORD:-}" psql \
    -h "$DEV_HOST" \
    -p "$DEV_PORT" \
    -U "$DEV_USER" \
    -d "$DEV_DB" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
    | tr -d ' ')

# Count posts
POST_COUNT=$(PGPASSWORD="${PGPASSWORD:-}" psql \
    -h "$DEV_HOST" \
    -p "$DEV_PORT" \
    -U "$DEV_USER" \
    -d "$DEV_DB" \
    -t -c "SELECT COUNT(*) FROM posts;" \
    | tr -d ' ')

# Count users
USER_COUNT=$(PGPASSWORD="${PGPASSWORD:-}" psql \
    -h "$DEV_HOST" \
    -p "$DEV_PORT" \
    -U "$DEV_USER" \
    -d "$DEV_DB" \
    -t -c "SELECT COUNT(*) FROM users;" \
    | tr -d ' ')

echo -e "${GREEN}✓ Database verification:${NC}"
echo -e "  Tables: ${BLUE}$TABLE_COUNT${NC}"
echo -e "  Posts: ${BLUE}$POST_COUNT${NC}"
echo -e "  Users: ${BLUE}$USER_COUNT${NC}"

# Cleanup
echo -e "\n${BLUE}Step 7: Cleanup${NC}"
echo -e "${YELLOW}Removing backup file...${NC}"
rm -f "$BACKUP_FILE"
echo -e "${GREEN}✓ Cleanup complete${NC}"

# Final message
echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Database cloning completed! 🎉        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Your development database now contains production data.${NC}"
echo -e "${YELLOW}Note: You may need to restart your backend service.${NC}"
echo ""
echo -e "${BLUE}Quick commands:${NC}"
echo -e "  docker compose restart backend"
echo -e "  docker compose restart worker"
echo ""
