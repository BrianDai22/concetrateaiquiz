#!/bin/bash

# SSL Certificate Setup Script for Let's Encrypt
# Usage: ./deployment/setup-ssl.sh your-domain.com admin@your-domain.com

set -e

# Check if domain and email are provided
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <domain> <email>"
  echo "Example: $0 school-portal.com admin@school-portal.com"
  exit 1
fi

DOMAIN=$1
EMAIL=$2

echo "========================================"
echo "SSL Certificate Setup for $DOMAIN"
echo "========================================"

# Ensure nginx is stopped
echo "Stopping nginx service..."
docker-compose stop nginx 2>/dev/null || true

# Create directories if they don't exist
mkdir -p nginx_certs
mkdir -p certbot_www

# Get initial certificate using standalone mode
echo "Obtaining SSL certificate from Let's Encrypt..."
docker run --rm -it \
  -v $(pwd)/nginx_certs:/etc/letsencrypt \
  -v $(pwd)/certbot_www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  --force-renewal \
  -d $DOMAIN

# Check if certificate was obtained successfully
if [ ! -f "nginx_certs/live/$DOMAIN/fullchain.pem" ]; then
  echo "ERROR: Failed to obtain SSL certificate!"
  exit 1
fi

echo "✓ SSL certificate obtained successfully!"

# Update nginx.conf to enable HTTPS
echo "Updating nginx configuration..."

# Check if HTTPS server block exists
if grep -q "listen 443 ssl http2" nginx.conf; then
  echo "✓ HTTPS configuration already present in nginx.conf"
else
  echo "⚠️  Manual step required:"
  echo "   Edit nginx.conf and uncomment the HTTPS server block"
  echo "   Update server_name to: $DOMAIN"
fi

# Start nginx
echo "Starting nginx with SSL..."
docker-compose up -d nginx

# Wait for nginx to start
sleep 5

# Verify nginx is running
if docker-compose ps nginx | grep -q "Up"; then
  echo "✓ Nginx is running with SSL!"
else
  echo "ERROR: Nginx failed to start. Check logs with: docker-compose logs nginx"
  exit 1
fi

# Test HTTPS connection
echo "Testing HTTPS connection..."
if curl -k -f https://$DOMAIN/health >/dev/null 2>&1; then
  echo "✓ HTTPS is working!"
else
  echo "⚠️  HTTPS test failed. This might be normal if DNS hasn't propagated yet."
fi

# Setup auto-renewal with certbot container
echo "Setting up auto-renewal..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d certbot

echo "========================================"
echo "SSL Setup Complete!"
echo "========================================"
echo "Certificate: /etc/nginx/certs/live/$DOMAIN/fullchain.pem"
echo "Private Key: /etc/nginx/certs/live/$DOMAIN/privkey.pem"
echo ""
echo "Next steps:"
echo "1. Verify HTTPS works: https://$DOMAIN"
echo "2. Certificate auto-renews every 12 hours via certbot container"
echo "3. Check renewal with: docker-compose exec certbot certbot renew --dry-run"
echo ""
echo "Your site should now be accessible at: https://$DOMAIN"
echo "========================================"
