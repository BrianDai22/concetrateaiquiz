#!/bin/bash
#
# Configure Production Environment and Start Services
# Run this script ON THE VM after Docker is installed
#
# Usage: bash deployment/configure-production.sh
#

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Production Configuration & Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running from correct directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}ERROR: Must run from project root directory${NC}"
    echo "Run: cd ~/concetrateaiquiz && bash deployment/configure-production.sh"
    exit 1
fi

# Step 1: Generate secrets
echo -e "${BLUE}[1/9] Generating secure secrets...${NC}"
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
COOKIE_SECRET=$(openssl rand -base64 64 | tr -d '\n')
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | tr '+/' '-_')

echo -e "${GREEN}✓ Secrets generated${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT: Save these secrets!${NC}"
echo -e "JWT_SECRET=${BLUE}${JWT_SECRET}${NC}"
echo -e "COOKIE_SECRET=${BLUE}${COOKIE_SECRET}${NC}"
echo -e "DB_PASSWORD=${BLUE}${DB_PASSWORD}${NC}"
echo ""
read -p "Press Enter to continue..."

# Step 2: Create production environment file
echo -e "${BLUE}[2/9] Creating production environment file...${NC}"

cat > .env.docker.prod <<EOF
# API Configuration
API_PORT=3001
API_HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=warn

# Database (containerized PostgreSQL)
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/concentrate-quiz

# Redis (containerized)
REDIS_URL=redis://redis:6379

# JWT & Authentication Secrets
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
COOKIE_SECRET=${COOKIE_SECRET}

# Google OAuth (Production) - UPDATE THESE!
GOOGLE_CLIENT_ID=your-prod-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-prod-client-secret

# OAuth Callbacks (using IP for now)
OAUTH_CALLBACK_URL=http://35.225.50.31/api/v0/auth/oauth/google/callback
OAUTH_SUCCESS_REDIRECT=http://35.225.50.31/dashboard
OAUTH_ERROR_REDIRECT=http://35.225.50.31/login

# CORS Configuration
CORS_ORIGIN=http://35.225.50.31

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://35.225.50.31/api/v0
NEXT_PUBLIC_APP_URL=http://35.225.50.31

# Certbot Configuration (for later SSL setup)
CERTBOT_DOMAIN=35.225.50.31
CERTBOT_EMAIL=your-email@example.com
EOF

echo -e "${GREEN}✓ Environment file created${NC}"

# Step 3: Update docker-compose.yml with DB password
echo -e "${BLUE}[3/9] Updating docker-compose.yml with database password...${NC}"
sed -i "s/POSTGRES_PASSWORD: postgres/POSTGRES_PASSWORD: ${DB_PASSWORD}/" docker-compose.yml
echo -e "${GREEN}✓ docker-compose.yml updated${NC}"

# Step 4: Ask about Google OAuth
echo ""
echo -e "${YELLOW}Do you want to configure Google OAuth now? (recommended for later)${NC}"
echo "If not, you can skip and configure it later in .env.docker.prod"
read -p "Configure Google OAuth? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Get OAuth credentials from: https://console.cloud.google.com/apis/credentials"
    echo ""
    read -p "Enter Google Client ID: " GOOGLE_CLIENT_ID
    read -p "Enter Google Client Secret: " GOOGLE_CLIENT_SECRET

    sed -i "s/your-prod-client-id.apps.googleusercontent.com/${GOOGLE_CLIENT_ID}/" .env.docker.prod
    sed -i "s/your-prod-client-secret/${GOOGLE_CLIENT_SECRET}/" .env.docker.prod

    echo -e "${GREEN}✓ Google OAuth configured${NC}"
else
    echo -e "${YELLOW}Skipping Google OAuth configuration${NC}"
    echo "You can configure it later by editing .env.docker.prod"
fi

# Step 5: Build Docker images
echo ""
echo -e "${BLUE}[4/9] Building Docker images (this takes 5-10 minutes)...${NC}"
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
echo -e "${GREEN}✓ Docker images built${NC}"

# Step 6: Start services
echo -e "${BLUE}[5/9] Starting all services...${NC}"
docker compose up -d
sleep 10  # Wait for services to start
echo -e "${GREEN}✓ Services started${NC}"

# Step 7: Check service status
echo -e "${BLUE}[6/9] Checking service status...${NC}"
docker compose ps

# Step 8: Run database migrations
echo -e "${BLUE}[7/9] Running database migrations...${NC}"
sleep 5  # Give postgres time to fully initialize
docker compose exec -T api npm run migrate
echo -e "${GREEN}✓ Database migrations complete${NC}"

# Step 9: Test the application
echo -e "${BLUE}[8/9] Testing application...${NC}"
sleep 3
HEALTH_CHECK=$(curl -s http://localhost/api/v0/health || echo "failed")

if [[ $HEALTH_CHECK == *"ok"* ]]; then
    echo -e "${GREEN}✓ Application is running!${NC}"
else
    echo -e "${YELLOW}Warning: Health check failed, check logs with: docker compose logs${NC}"
fi

# Step 10: Display summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Application URL:${NC} ${GREEN}http://35.225.50.31${NC}"
echo ""
echo -e "${BLUE}Container Status:${NC}"
docker compose ps
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  View logs:           ${GREEN}docker compose logs -f${NC}"
echo "  View API logs:       ${GREEN}docker compose logs -f api${NC}"
echo "  Restart service:     ${GREEN}docker compose restart api${NC}"
echo "  Stop all:            ${GREEN}docker compose down${NC}"
echo "  Health check:        ${GREEN}bash deployment/health-check.sh${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Test the application: ${GREEN}http://35.225.50.31${NC}"
echo "  2. Configure your domain DNS to point to: ${GREEN}35.225.50.31${NC}"
echo "  3. Setup SSL: ${GREEN}./deployment/setup-ssl.sh your-domain.com admin@your-domain.com${NC}"
echo ""
echo -e "${BLUE}To view in browser, open:${NC} ${GREEN}http://35.225.50.31${NC}"
echo ""
