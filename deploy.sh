#!/bin/bash

# Deployment Script for Hostinger VPS
# Usage: ./deploy.sh

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Error: .env.production file not found!${NC}"
    echo "Please create .env.production with your Supabase credentials."
    exit 1
fi

echo -e "${GREEN}✅ Environment file found${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --production

# Build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build

# Check if build succeeded
if [ ! -d ".next" ]; then
    echo -e "${RED}❌ Build failed! .next directory not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

# Restart PM2
if pm2 list | grep -q "attendance-app"; then
    echo -e "${YELLOW}🔄 Restarting application...${NC}"
    pm2 restart attendance-app
else
    echo -e "${YELLOW}▶️  Starting application...${NC}"
    pm2 start npm --name "attendance-app" -- start
    pm2 save
fi

# Check PM2 status
echo -e "${YELLOW}📊 Application status:${NC}"
pm2 status attendance-app

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "View logs with: pm2 logs attendance-app"
echo "Monitor with: pm2 monit"

