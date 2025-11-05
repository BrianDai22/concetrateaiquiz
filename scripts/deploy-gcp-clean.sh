#!/bin/bash

# GCP Deployment Script with Complete Cache Clear
# This script ensures a completely clean Docker environment before deployment
# Resolving volume mount issues and cached builds

set -e  # Exit on error

echo "========================================="
echo "GCP CLEAN DEPLOYMENT SCRIPT"
echo "========================================="
echo ""
echo "This script will:"
echo "1. Stop all containers"
echo "2. Remove all images and volumes"
echo "3. Clear Docker build cache"
echo "4. Rebuild everything from scratch"
echo "5. Deploy with production configuration"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Step 1: Stop all containers
print_status "Step 1: Stopping all containers..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v || true
docker compose down -v || true
sleep 2

# Step 2: Remove specific images
print_status "Step 2: Removing project-specific images..."
docker rmi concetrateaiquiz-api concetrateaiquiz-frontend concetrateaiquiz-nginx 2>/dev/null || true
docker rmi school-portal-api school-portal-frontend school-portal-nginx 2>/dev/null || true
docker rmi test-api test-frontend test-api-verified test-frontend-verified 2>/dev/null || true

# Step 3: Clear Docker builder cache
print_status "Step 3: Clearing Docker builder cache..."
docker builder prune -af

# Step 4: Remove all unused volumes
print_status "Step 4: Removing unused volumes..."
docker volume prune -f

# Step 5: Show clean state
print_status "Step 5: Verifying clean state..."
echo "Current images:"
docker images | grep -E "(concentrate|school-portal)" || echo "  No project images found (good!)"
echo ""
echo "Current volumes:"
docker volume ls | grep -E "(concentrate|school-portal)" || echo "  No project volumes found (good!)"
echo ""

# Step 6: Build with production configuration
print_status "Step 6: Building fresh images (this will take several minutes)..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml build \
    --no-cache \
    --pull \
    --progress=plain 2>&1 | tee build.log

# Check if build succeeded
if grep -q "✓ All packages compiled successfully" build.log && \
   grep -q "✓ Next.js standalone build successful" build.log; then
    print_status "Build verification passed!"
else
    print_error "Build verification failed! Check build.log for details."
    echo ""
    echo "Common issues:"
    echo "1. TypeScript compilation errors"
    echo "2. Missing dependencies"
    echo "3. Next.js standalone configuration issues"
    exit 1
fi

# Step 7: Start containers
print_status "Step 7: Starting containers..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Step 8: Wait for services to be healthy
print_status "Step 8: Waiting for services to be healthy..."
sleep 10

# Step 9: Verify deployments
print_status "Step 9: Verifying deployments..."
echo ""
echo "Container status:"
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

echo ""
echo "Checking for volume mounts (should be empty for production):"
docker inspect school-portal-api 2>/dev/null | grep -A 5 '"Mounts"' || docker inspect concetrateaiquiz-api | grep -A 5 '"Mounts"'

echo ""
# Step 10: Health checks
print_status "Step 10: Running health checks..."
echo "API Health:"
curl -f http://localhost:3001/health 2>/dev/null && print_status "API is healthy" || print_error "API health check failed"

echo ""
echo "Frontend Health (through nginx):"
curl -f http://localhost 2>/dev/null >/dev/null && print_status "Frontend is accessible" || print_error "Frontend not accessible"

echo ""
print_status "Deployment complete!"
echo ""
echo "========================================="
echo "DEPLOYMENT SUMMARY"
echo "========================================="
echo "Services should be accessible at:"
echo "  - Frontend: http://YOUR_GCP_IP"
echo "  - API: http://YOUR_GCP_IP/api"
echo ""
echo "To check logs:"
echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
echo ""
echo "To stop services:"
echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml down"
echo ""
echo "========================================="

# Check if there are any warnings
if docker inspect school-portal-api 2>/dev/null | grep -q "/app/packages" || \
   docker inspect concetrateaiquiz-api 2>/dev/null | grep -q "/app/packages"; then
    print_error "WARNING: Volume mounts detected in production containers!"
    print_error "This indicates the volume override issue is not fully resolved."
    print_error "Containers may still be using local source code instead of built artifacts."
    exit 1
fi

print_status "All checks passed successfully!"