#!/bin/bash
# Production Environment Verification Script
# Run this on your GCP VM to check environment configuration

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo -e "${BLUE}Production Environment Verification${NC}"
echo "=========================================="
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Check Container Status
echo -e "${YELLOW}1. Container Status:${NC}"
echo "-------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "school-portal|concentrate" || echo "No containers found"
echo ""

# 2. Health Status
echo -e "${YELLOW}2. Container Health Status:${NC}"
echo "---------------------------"
for container in school-portal-api school-portal-frontend concentrate-quiz-db school-portal-redis school-portal-nginx; do
    if docker ps --format "{{.Names}}" | grep -q "^$container$"; then
        health=$(docker inspect $container --format='{{.State.Health.Status}}' 2>/dev/null || echo "no healthcheck")
        if [[ "$health" == "healthy" ]]; then
            echo -e "  $container: ${GREEN}$health${NC}"
        elif [[ "$health" == "unhealthy" ]]; then
            echo -e "  $container: ${RED}$health${NC}"
        else
            echo -e "  $container: ${YELLOW}$health${NC}"
        fi
    else
        echo -e "  $container: ${RED}not running${NC}"
    fi
done
echo ""

# 3. Environment Variables Check (Redacted)
echo -e "${YELLOW}3. Environment Variables Check:${NC}"
echo "-------------------------------"

# Check API environment
if docker ps --format "{{.Names}}" | grep -q "^school-portal-api$"; then
    echo "  API Environment:"
    NODE_ENV=$(docker exec school-portal-api printenv NODE_ENV 2>/dev/null || echo "not set")
    echo "    NODE_ENV: $NODE_ENV"

    # Check if DATABASE_URL is set
    docker exec school-portal-api bash -c 'test -n "$DATABASE_URL" && echo "    DATABASE_URL: ✓ Set" || echo "    DATABASE_URL: ✗ Not set"' 2>/dev/null || echo "    DATABASE_URL: Error checking"

    # Check if REDIS_URL is set
    docker exec school-portal-api bash -c 'test -n "$REDIS_URL" && echo "    REDIS_URL: ✓ Set" || echo "    REDIS_URL: ✗ Not set"' 2>/dev/null || echo "    REDIS_URL: Error checking"

    # Check JWT_SECRET strength
    docker exec school-portal-api bash -c 'if [[ ${#JWT_SECRET} -gt 50 ]] && [[ "$JWT_SECRET" != *"replace"* ]]; then echo "    JWT_SECRET: ✓ Strong"; else echo "    JWT_SECRET: ✗ Weak or default"; fi' 2>/dev/null || echo "    JWT_SECRET: Error checking"

    # Check COOKIE_SECRET strength
    docker exec school-portal-api bash -c 'if [[ ${#COOKIE_SECRET} -gt 50 ]] && [[ "$COOKIE_SECRET" != *"replace"* ]]; then echo "    COOKIE_SECRET: ✓ Strong"; else echo "    COOKIE_SECRET: ✗ Weak or default"; fi' 2>/dev/null || echo "    COOKIE_SECRET: Error checking"

    # Check CORS_ORIGIN
    CORS_ORIGIN=$(docker exec school-portal-api printenv CORS_ORIGIN 2>/dev/null || echo "not set")
    echo "    CORS_ORIGIN: $CORS_ORIGIN"
else
    echo -e "  API Container: ${RED}Not running${NC}"
fi

echo ""

# Check Frontend environment
if docker ps --format "{{.Names}}" | grep -q "^school-portal-frontend$"; then
    echo "  Frontend Environment:"
    NEXT_PUBLIC_API_URL=$(docker exec school-portal-frontend printenv NEXT_PUBLIC_API_URL 2>/dev/null || echo "not set")
    NEXT_PUBLIC_APP_URL=$(docker exec school-portal-frontend printenv NEXT_PUBLIC_APP_URL 2>/dev/null || echo "not set")
    echo "    NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"
    echo "    NEXT_PUBLIC_APP_URL: $NEXT_PUBLIC_APP_URL"
else
    echo -e "  Frontend Container: ${RED}Not running${NC}"
fi
echo ""

# 4. Service Connectivity Tests
echo -e "${YELLOW}4. Service Connectivity:${NC}"
echo "-----------------------"

# Test API reachability from nginx
if docker ps --format "{{.Names}}" | grep -q "^school-portal-nginx$" && docker ps --format "{{.Names}}" | grep -q "^school-portal-api$"; then
    docker exec school-portal-nginx curl -sf http://api:3001/health >/dev/null 2>&1 && \
        echo -e "  API → Nginx: ${GREEN}✓ Connected${NC}" || \
        echo -e "  API → Nginx: ${RED}✗ Connection failed${NC}"
else
    echo -e "  API → Nginx: ${YELLOW}Containers not running${NC}"
fi

# Test Frontend reachability from nginx
if docker ps --format "{{.Names}}" | grep -q "^school-portal-nginx$" && docker ps --format "{{.Names}}" | grep -q "^school-portal-frontend$"; then
    docker exec school-portal-nginx wget --spider --quiet http://frontend:3000/ 2>/dev/null && \
        echo -e "  Frontend → Nginx: ${GREEN}✓ Connected${NC}" || \
        echo -e "  Frontend → Nginx: ${RED}✗ Connection failed${NC}"
else
    echo -e "  Frontend → Nginx: ${YELLOW}Containers not running${NC}"
fi

# Test Database connectivity from API
if docker ps --format "{{.Names}}" | grep -q "^school-portal-api$"; then
    docker exec school-portal-api bash -c 'pg_isready -h postgres -p 5432' >/dev/null 2>&1 && \
        echo -e "  Database → API: ${GREEN}✓ Connected${NC}" || \
        echo -e "  Database → API: ${RED}✗ Connection failed${NC}"
else
    echo -e "  Database → API: ${YELLOW}API container not running${NC}"
fi

# Test Redis connectivity
if docker ps --format "{{.Names}}" | grep -q "^school-portal-api$"; then
    docker exec school-portal-api bash -c 'redis-cli -h redis ping' >/dev/null 2>&1 && \
        echo -e "  Redis → API: ${GREEN}✓ Connected${NC}" || \
        echo -e "  Redis → API: ${RED}✗ Connection failed${NC}"
else
    echo -e "  Redis → API: ${YELLOW}API container not running${NC}"
fi
echo ""

# 5. External Accessibility
echo -e "${YELLOW}5. External Accessibility:${NC}"
echo "-------------------------"

# Test nginx is accessible
curl -sf http://localhost/health >/dev/null 2>&1 && \
    echo -e "  Nginx (Port 80): ${GREEN}✓ Accessible${NC}" || \
    echo -e "  Nginx (Port 80): ${RED}✗ Not accessible${NC}"

# Test API through nginx
curl -sf http://localhost/api/v0/stats/teacher-names >/dev/null 2>&1 && \
    echo -e "  API Endpoint: ${GREEN}✓ Accessible${NC}" || \
    echo -e "  API Endpoint: ${RED}✗ Not accessible${NC}"

# Test Frontend
curl -sf http://localhost/ >/dev/null 2>&1 && \
    echo -e "  Frontend: ${GREEN}✓ Accessible${NC}" || \
    echo -e "  Frontend: ${RED}✗ Not accessible${NC}"
echo ""

# 6. Check for Recent Errors
echo -e "${YELLOW}6. Recent Container Errors (last 5 minutes):${NC}"
echo "--------------------------------------------"

for container in school-portal-api school-portal-frontend school-portal-nginx; do
    if docker ps --format "{{.Names}}" | grep -q "^$container$"; then
        errors=$(docker logs $container --tail 50 --since 5m 2>&1 | grep -iE "(error|fatal|exception|failed)" | head -3)
        if [ -n "$errors" ]; then
            echo -e "  ${RED}$container:${NC}"
            echo "$errors" | sed 's/^/    /'
        else
            echo -e "  ${GREEN}$container: No recent errors${NC}"
        fi
    fi
done
echo ""

# 7. Volume Mount Check
echo -e "${YELLOW}7. Volume Mount Check (should be empty for prod):${NC}"
echo "-------------------------------------------------"
for container in school-portal-api school-portal-frontend; do
    if docker ps --format "{{.Names}}" | grep -q "^$container$"; then
        mounts=$(docker inspect $container --format='{{range .Mounts}}{{if eq .Type "bind"}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}{{end}}' 2>/dev/null)
        if [ -n "$mounts" ]; then
            echo -e "  ${RED}$container has bind mounts:${NC}"
            echo "$mounts" | sed 's/^/    /'
        else
            echo -e "  ${GREEN}$container: No bind mounts (correct)${NC}"
        fi
    fi
done
echo ""

# 8. Summary
echo -e "${BLUE}=========================================="
echo "Summary"
echo "==========================================${NC}"

# Count issues
issues=0

# Check for weak secrets
docker exec school-portal-api bash -c '[[ "$JWT_SECRET" == *"replace"* ]]' 2>/dev/null && ((issues++)) && echo -e "${RED}⚠ JWT_SECRET needs to be updated${NC}"
docker exec school-portal-api bash -c '[[ "$COOKIE_SECRET" == *"replace"* ]]' 2>/dev/null && ((issues++)) && echo -e "${RED}⚠ COOKIE_SECRET needs to be updated${NC}"

# Check for unhealthy containers
unhealthy=$(docker ps --filter "health=unhealthy" --format "{{.Names}}" | grep -E "school-portal|concentrate" | wc -l)
if [ $unhealthy -gt 0 ]; then
    ((issues=issues+unhealthy))
    echo -e "${RED}⚠ $unhealthy unhealthy container(s)${NC}"
fi

# Check for bind mounts
if docker inspect school-portal-api --format='{{range .Mounts}}{{if eq .Type "bind"}}found{{end}}{{end}}' 2>/dev/null | grep -q "found"; then
    ((issues++))
    echo -e "${RED}⚠ API container has bind mounts (should not in production)${NC}"
fi

if [ $issues -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Environment is properly configured.${NC}"
else
    echo -e "${YELLOW}⚠ Found $issues issue(s) that need attention.${NC}"
fi

echo ""
echo "=========================================="
echo -e "${BLUE}Quick Commands for Troubleshooting:${NC}"
echo "=========================================="
echo "View API logs:         docker logs school-portal-api --tail 50"
echo "View Frontend logs:    docker logs school-portal-frontend --tail 50"
echo "View Nginx logs:       docker logs school-portal-nginx --tail 50"
echo "Restart all services:  docker compose restart"
echo "Check env vars:        docker exec school-portal-api printenv | grep -E 'JWT|DATABASE|REDIS'"
echo ""