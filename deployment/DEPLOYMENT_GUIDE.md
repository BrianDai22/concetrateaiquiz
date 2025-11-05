# School Portal Platform - Production Deployment Guide

Complete guide for deploying the School Portal Platform to production using Docker, Docker Compose, and Nginx with SSL/TLS.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Testing](#local-testing)
3. [Production Setup](#production-setup)
4. [SSL Certificate Setup](#ssl-certificate-setup)
5. [Deployment](#deployment)
6. [Health Checks & Monitoring](#health-checks--monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

---

## Prerequisites

### Required Software
- **Docker** (v20.10+): [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** (v2.0+): [Install Docker Compose](https://docs.docker.com/compose/install/)
- **Git**: For repository management

### Cloud Infrastructure (Choose One)

**Option A: Google Cloud Platform (GCP)**
- Compute Engine VM (e2-standard-2 or better)
- Cloud SQL (PostgreSQL 17)
- Memorystore (Redis 7)
- Static IP address
- Domain name

**Option B: AWS**
- EC2 instance (t3.medium or better)
- RDS (PostgreSQL 17)
- ElastiCache (Redis 7)
- Elastic IP
- Domain name

**Option C: DigitalOcean**
- Droplet (4GB RAM minimum)
- Managed PostgreSQL
- Managed Redis
- Reserved IP
- Domain name

**Option D: Self-Hosted**
- Server with 4GB+ RAM
- Docker and Docker Compose installed
- Public IP address
- Domain name

---

## Local Testing

Before deploying to production, test the Docker setup locally:

### 1. Clone Repository
```bash
git clone https://github.com/your-username/school-portal.git
cd school-portal
```

### 2. Configure Environment
```bash
# Copy development environment template
cp .env.docker.dev.example .env.docker.dev

# Edit with your local settings (Google OAuth credentials, etc.)
nano .env.docker.dev
```

### 3. Build and Start Services
```bash
# Build all Docker images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Verify Services
```bash
# Check all containers are running
docker-compose ps

# Test API health
curl http://localhost/api/v0/health

# Test frontend
curl http://localhost/

# Run health check script
bash deployment/health-check.sh
```

### 5. Run Database Migrations
```bash
# Execute migrations inside API container
docker-compose exec api npm run migrate

# Or if migrations are in a different script
docker-compose exec api node apps/api/dist/migrations/migrate.js
```

### 6. Test the Application
- Open browser: `http://localhost`
- Login with test credentials
- Verify all features work

### 7. Stop Services
```bash
docker-compose down

# To also remove volumes (⚠️ deletes data)
docker-compose down -v
```

---

## Production Setup

### Step 1: Server Provisioning

**For Cloud Providers:**

**GCP Example:**
```bash
# Create VM instance
gcloud compute instances create school-portal-vm \
  --machine-type=e2-standard-2 \
  --zone=us-central1-a \
  --boot-disk-size=50GB \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud

# Reserve static IP
gcloud compute addresses create school-portal-ip --region=us-central1

# Configure firewall
gcloud compute firewall-rules create allow-http-https \
  --allow tcp:80,tcp:443 \
  --target-tags=http-server,https-server
```

**Manual/Self-Hosted:**
- Ubuntu 22.04 LTS or similar
- 4GB RAM minimum
- 50GB disk space
- Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)

### Step 2: Server Initial Configuration

```bash
# SSH into server
ssh user@YOUR_SERVER_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Logout and login again for group changes
exit
ssh user@YOUR_SERVER_IP

# Verify Docker installation
docker --version
docker compose version
```

### Step 3: Database & Redis Setup

**Option A: Managed Services (Recommended)**

Configure managed PostgreSQL and Redis through your cloud provider's console. Note the connection strings.

**Option B: Self-Hosted**

The docker-compose.yml already includes PostgreSQL and Redis containers. Skip to next step.

### Step 4: Domain & DNS Configuration

1. **Purchase/Configure Domain**
   - Point A record to your server's IP address
   - Example: `school-portal.yourdomain.com` → `34.123.45.67`
   - Wait for DNS propagation (5-30 minutes)

2. **Verify DNS**
   ```bash
   dig school-portal.yourdomain.com
   nslookup school-portal.yourdomain.com
   ```

### Step 5: Clone Repository on Server

```bash
# Clone repository
git clone https://github.com/your-username/school-portal.git
cd school-portal
```

### Step 6: Configure Production Environment

```bash
# Copy production environment template
cp .env.docker.prod.example .env.docker.prod

# Edit with production values
nano .env.docker.prod
```

**Required Configuration:**
```env
# Update these values:
DATABASE_URL=postgresql://user:password@your-db-host:5432/dbname
REDIS_URL=redis://your-redis-host:6379
JWT_SECRET=<generate with: openssl rand -base64 64>
COOKIE_SECRET=<generate with: openssl rand -base64 64>
GOOGLE_CLIENT_ID=your-prod-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-prod-client-secret
OAUTH_CALLBACK_URL=https://your-domain.com/api/v0/auth/oauth/google/callback
CORS_ORIGIN=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v0
CERTBOT_DOMAIN=your-domain.com
CERTBOT_EMAIL=admin@your-domain.com
```

---

## SSL Certificate Setup

### Option 1: Automatic Setup (Recommended)

Use the provided script:

```bash
# Make script executable
chmod +x deployment/setup-ssl.sh

# Run SSL setup
./deployment/setup-ssl.sh your-domain.com admin@your-domain.com
```

### Option 2: Manual Setup

```bash
# Stop nginx if running
docker-compose stop nginx

# Get initial certificate
docker run --rm -it \
  -v $(pwd)/nginx_certs:/etc/letsencrypt \
  -v $(pwd)/certbot_www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --email admin@your-domain.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com

# Update nginx.conf to enable HTTPS (uncomment SSL server block)
nano nginx.conf

# Restart nginx
docker-compose up -d nginx
```

---

## Deployment

### Step 1: Build Production Images

```bash
# Build all images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Or build individually
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build api
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build frontend
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build nginx
```

### Step 2: Start Production Services

```bash
# Start all services in production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Step 3: Run Database Migrations

```bash
# Run migrations
docker-compose exec api npm run migrate

# Verify database
docker-compose exec postgres psql -U postgres -d concentrate-quiz -c "\dt"
```

### Step 4: Verify Deployment

```bash
# Run health checks
bash deployment/health-check.sh

# Test API
curl https://your-domain.com/api/v0/health

# Test frontend
curl https://your-domain.com/
```

### Step 5: Test Application

1. Open `https://your-domain.com`
2. Register a new account
3. Login with credentials
4. Test all major features:
   - Authentication
   - Class creation (Teacher)
   - Assignment submission (Student)
   - Grading (Teacher)
   - Admin functions

---

## Health Checks & Monitoring

### Service Health Checks

```bash
# All services status
docker-compose ps

# Individual service logs
docker-compose logs api
docker-compose logs frontend
docker-compose logs nginx

# Follow logs in real-time
docker-compose logs -f --tail=100
```

### Automated Health Monitoring

```bash
# Run comprehensive health check
bash deployment/health-check.sh
```

### Database Health

```bash
# PostgreSQL
docker-compose exec postgres pg_isready -U postgres

# Check connections
docker-compose exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

### Redis Health

```bash
docker-compose exec redis redis-cli ping
docker-compose exec redis redis-cli INFO
```

### Application Metrics

```bash
# API response time
curl -o /dev/null -s -w '%{time_total}\n' https://your-domain.com/api/v0/health

# Check disk space
df -h

# Check memory usage
free -h

# Docker container stats
docker stats
```

---

## Troubleshooting

### Common Issues

**1. Container Won't Start**
```bash
# Check logs
docker-compose logs SERVICE_NAME

# Check container status
docker-compose ps

# Rebuild specific service
docker-compose build --no-cache SERVICE_NAME
```

**2. Database Connection Errors**
```bash
# Verify DATABASE_URL in .env.docker.prod
cat .env.docker.prod | grep DATABASE_URL

# Test database connectivity
docker-compose exec api node -e "const { Client } = require('pg'); const client = new Client(process.env.DATABASE_URL); client.connect().then(() => console.log('Connected!')).catch(console.error);"
```

**3. SSL Certificate Issues**
```bash
# Check certificate status
docker-compose exec certbot certbot certificates

# Renew certificate manually
docker-compose exec certbot certbot renew --dry-run

# Check nginx SSL configuration
docker-compose exec nginx nginx -t
```

**4. 502 Bad Gateway**
```bash
# Check if backend services are running
docker-compose ps api frontend

# Check nginx configuration
docker-compose exec nginx nginx -t

# Restart nginx
docker-compose restart nginx
```

**5. Out of Memory**
```bash
# Check memory usage
docker stats

# Increase server RAM or add swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Maintenance

### Updating the Application

```bash
# 1. Backup database
docker-compose exec postgres pg_dump -U postgres concentrate-quiz > backup_$(date +%Y%m%d).sql

# 2. Pull latest code
git pull origin main

# 3. Rebuild images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# 4. Stop services
docker-compose down

# 5. Start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 6. Run migrations
docker-compose exec api npm run migrate

# 7. Verify
bash deployment/health-check.sh
```

### Certificate Renewal

Certificates auto-renew via certbot container. Manual renewal:

```bash
docker-compose exec certbot certbot renew
docker-compose exec nginx nginx -s reload
```

### Database Backups

```bash
# Automated backup script
docker-compose exec postgres pg_dump -U postgres concentrate-quiz | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Restore from backup
gunzip < backup_20241104.sql.gz | docker-compose exec -T postgres psql -U postgres concentrate-quiz
```

### Log Rotation

```bash
# Configure Docker log rotation
sudo nano /etc/docker/daemon.json

# Add:
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# Restart Docker
sudo systemctl restart docker
```

### Monitoring & Alerts

Set up monitoring with:
- **Cloud provider monitoring** (GCP Monitoring, AWS CloudWatch, etc.)
- **Uptime monitoring** (UptimeRobot, Pingdom)
- **Log aggregation** (Loggly, Papertrail)
- **Error tracking** (Sentry - if implemented)

---

## Security Checklist

- [ ] SSL/TLS certificates configured and auto-renewing
- [ ] Strong JWT_SECRET and COOKIE_SECRET generated
- [ ] Database uses strong password
- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] SSH key-based authentication only
- [ ] Regular system updates enabled
- [ ] Database backups automated
- [ ] .env.docker.prod not committed to git
- [ ] Docker images regularly updated
- [ ] Rate limiting enabled in nginx
- [ ] Security headers configured

---

## Support & Resources

- **Documentation**: See project README.md and SPECS.md
- **Issues**: GitHub Issues
- **Docker Docs**: https://docs.docker.com
- **Let's Encrypt**: https://letsencrypt.org/docs/

---

**Deployment Complete!** 🎉

Your School Portal Platform should now be running at `https://your-domain.com`
