#!/bin/sh
# SSL Certificate Setup Script for Let's Encrypt
# Sets up HTTPS for coolstudentportal.online using certbot

set -e

DOMAIN="${1:-coolstudentportal.online}"
EMAIL="${2:-admin@${DOMAIN}}"

echo "=========================================="
echo "SSL Certificate Setup"
echo "=========================================="
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Check if DNS is pointing correctly
echo "1. Checking DNS resolution..."
RESOLVED_IP=$(dig +short "$DOMAIN" | tail -n1)
echo "   $DOMAIN resolves to: $RESOLVED_IP"

if [ -z "$RESOLVED_IP" ]; then
    echo "   ❌ ERROR: Domain does not resolve to any IP"
    echo "   Please check your DNS settings and try again"
    exit 1
fi

echo "   ✓ DNS is configured"
echo ""

# Check if nginx is running
echo "2. Checking nginx status..."
if docker ps | grep -q school-portal-nginx; then
    echo "   ✓ Nginx is running"
else
    echo "   ❌ ERROR: Nginx container is not running"
    echo "   Please start services first: docker compose up -d"
    exit 1
fi
echo ""

# Test HTTP access
echo "3. Testing HTTP access..."
if curl -sf "http://$DOMAIN/health" > /dev/null 2>&1; then
    echo "   ✓ HTTP access working"
else
    echo "   ⚠ WARNING: Cannot access http://$DOMAIN/health"
    echo "   Certificate acquisition may fail if domain is not accessible"
fi
echo ""

# Obtain certificate using certbot
echo "4. Obtaining SSL certificate..."
echo "   This may take a minute..."

# Run certbot in the certbot container
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

if [ $? -eq 0 ]; then
    echo "   ✓ Certificate obtained successfully!"
else
    echo "   ❌ ERROR: Failed to obtain certificate"
    echo ""
    echo "Troubleshooting:"
    echo "- Ensure DNS is fully propagated (wait 15-30 minutes)"
    echo "- Ensure ports 80 and 443 are open in GCP firewall"
    echo "- Ensure nginx is running and accessible"
    echo "- Check certbot logs: docker logs school-portal-certbot"
    exit 1
fi
echo ""

# Restart nginx to load the new certificate
echo "5. Restarting nginx with SSL certificate..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx

# Wait for nginx to start
sleep 5

# Verify HTTPS
echo ""
echo "6. Verifying HTTPS setup..."
if curl -sf "https://$DOMAIN/health" > /dev/null 2>&1; then
    echo "   ✓ HTTPS is working!"
    echo ""
    echo "=========================================="
    echo "✓ SSL Setup Complete!"
    echo "=========================================="
    echo ""
    echo "Your site is now accessible at:"
    echo "   https://$DOMAIN"
    echo ""
    echo "Certificate will auto-renew every 90 days"
    echo "Next steps:"
    echo "1. Update .env.docker.prod with HTTPS URLs (if not done)"
    echo "2. Rebuild frontend: docker compose build frontend"
    echo "3. Restart services: docker compose up -d"
    echo "4. Test login at: https://$DOMAIN/login"
else
    echo "   ⚠ WARNING: HTTPS not accessible yet"
    echo ""
    echo "Please check:"
    echo "- Nginx logs: docker logs school-portal-nginx"
    echo "- Certificate files exist: docker exec school-portal-nginx ls -la /etc/letsencrypt/live/$DOMAIN/"
    echo ""
    echo "The certificate is installed, but nginx may need manual restart"
fi
