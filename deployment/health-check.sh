#!/bin/bash

# Health Check Script for School Portal Platform
# Verifies all services are running correctly

set -e

echo "========================================"
echo "School Portal Platform - Health Check"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# Function to check service
check_service() {
  local service=$1
  local check_command=$2

  printf "Checking %-15s ... " "$service"

  if eval "$check_command" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
    return 0
  else
    echo -e "${RED}✗ FAILED${NC}"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

# Check Docker is running
check_service "Docker" "docker info"

# Check Docker Compose
check_service "Docker Compose" "docker compose version"

# Check if containers are running
echo ""
echo "Container Status:"
echo "----------------"
docker compose ps

echo ""
echo "Service Health Checks:"
echo "---------------------"

# Check PostgreSQL
check_service "PostgreSQL" "docker compose exec -T postgres pg_isready -U postgres"

# Check Redis
check_service "Redis" "docker compose exec -T redis redis-cli ping"

# Check API
check_service "API Service" "docker compose exec -T api node -e \"require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\""

# Check Frontend
if command -v wget &> /dev/null; then
  check_service "Frontend" "docker compose exec -T frontend wget --no-verbose --tries=1 --spider http://localhost:3000/"
elif command -v curl &> /dev/null; then
  check_service "Frontend" "docker compose exec -T frontend curl -f http://localhost:3000/ >/dev/null 2>&1"
else
  echo -e "${YELLOW}⚠ Frontend check skipped (wget/curl not available)${NC}"
fi

# Check Nginx
if command -v curl &> /dev/null; then
  check_service "Nginx Proxy" "curl -f http://localhost/health"
else
  echo -e "${YELLOW}⚠ Nginx check skipped (curl not available)${NC}"
fi

# Check disk space
echo ""
echo "System Resources:"
echo "----------------"
printf "Disk Space: "
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
  echo -e "${GREEN}✓ ${DISK_USAGE}% used${NC}"
else
  echo -e "${YELLOW}⚠ ${DISK_USAGE}% used (getting high!)${NC}"
fi

# Check memory
printf "Memory: "
if command -v free &> /dev/null; then
  MEM_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
  if [ "$MEM_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✓ ${MEM_USAGE}% used${NC}"
  else
    echo -e "${YELLOW}⚠ ${MEM_USAGE}% used (getting high!)${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Cannot check (free command not available)${NC}"
fi

# Docker container stats summary
echo ""
echo "Container Resource Usage:"
echo "------------------------"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Summary
echo ""
echo "========================================"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All health checks passed!${NC}"
  echo "========================================"
  exit 0
else
  echo -e "${RED}✗ $FAILED health check(s) failed!${NC}"
  echo "========================================"
  echo ""
  echo "Troubleshooting:"
  echo "- Check logs: docker compose logs [service]"
  echo "- Restart service: docker compose restart [service]"
  echo "- Check documentation: deployment/DEPLOYMENT_GUIDE.md"
  exit 1
fi
