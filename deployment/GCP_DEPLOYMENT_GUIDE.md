# Google Cloud Platform Deployment Guide
## School Portal Platform - Complete Deployment Walkthrough

**Last Updated:** 2025-11-05
**Deployment Method:** Compute Engine VM with Docker Compose
**Estimated Time:** 2-3 hours
**Cost:** ~$70-75/month

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Domain name ready (or willing to use temporary IP)
- [ ] Google account for GCP
- [ ] Credit card for GCP billing (free tier available)
- [ ] Google OAuth credentials for production (can create during deployment)
- [ ] Local terminal access (macOS/Linux/Windows with WSL)

---

## Phase 1: Local Setup - gcloud CLI Installation

### macOS Installation

```bash
# Install using Homebrew (recommended)
brew install google-cloud-sdk

# Verify installation
gcloud version

# Expected output:
# Google Cloud SDK 457.0.0
# ...
```

### Alternative: Manual Installation (macOS/Linux)

```bash
# Download and extract
curl https://sdk.cloud.google.com | bash

# Restart shell
exec -l $SHELL

# Verify
gcloud version
```

### Windows Installation

Download from: https://cloud.google.com/sdk/docs/install

---

## Phase 2: GCP Authentication & Project Setup

### 2.1 Initialize gcloud and Login

```bash
# Initialize gcloud (interactive setup)
gcloud init

# Or login separately
gcloud auth login

# This opens a browser window for Google OAuth authentication
# Select your Google account and grant permissions
```

### 2.2 Create GCP Project

```bash
# Set your project ID (CUSTOMIZE THIS!)
export PROJECT_ID="school-portal-prod-$(date +%s)"
echo "Your Project ID: $PROJECT_ID"

# Create the project
gcloud projects create $PROJECT_ID \
  --name="School Portal Production"

# Set as active project
gcloud config set project $PROJECT_ID

# Verify
gcloud config get-value project
```

### 2.3 Link Billing Account

```bash
# List available billing accounts
gcloud billing accounts list

# Link billing account to project (REPLACE ACCOUNT_ID)
# gcloud billing projects link $PROJECT_ID \
#   --billing-account=YOUR-BILLING-ACCOUNT-ID

# Note: If you don't have a billing account, create one at:
# https://console.cloud.google.com/billing
```

### 2.4 Enable Required APIs

```bash
# Enable Compute Engine API
gcloud services enable compute.googleapis.com

# Enable DNS API (if using custom domain)
gcloud services enable dns.googleapis.com

# Verify enabled services
gcloud services list --enabled
```

---

## Phase 3: Network Infrastructure

### 3.1 Reserve Static IP Address

```bash
# Reserve a static external IP
gcloud compute addresses create school-portal-ip \
  --region=us-central1

# Get the IP address (SAVE THIS!)
export STATIC_IP=$(gcloud compute addresses describe school-portal-ip \
  --region=us-central1 \
  --format="get(address)")

echo "Your Static IP: $STATIC_IP"

# Example output: 34.123.45.67
```

### 3.2 Configure Firewall Rules

```bash
# Create firewall rule for web traffic
gcloud compute firewall-rules create school-portal-allow-web \
  --allow tcp:80,tcp:443,tcp:22 \
  --description="Allow HTTP, HTTPS, and SSH for School Portal" \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --target-tags=school-portal-server

# Verify firewall rule
gcloud compute firewall-rules describe school-portal-allow-web
```

---

## Phase 4: Create & Configure VM Instance

### 4.1 Create Compute Engine VM

```bash
# Create VM with recommended specs
gcloud compute instances create school-portal-vm \
  --zone=us-central1-a \
  --machine-type=e2-standard-2 \
  --network-interface=address=school-portal-ip,network-tier=PREMIUM \
  --tags=school-portal-server,http-server,https-server \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-balanced \
  --metadata=startup-script='#!/bin/bash
apt-get update
apt-get install -y apt-transport-https ca-certificates curl software-properties-common
'

# Wait for VM to start (30-60 seconds)
echo "Waiting for VM to start..."
sleep 30

# Verify VM is running
gcloud compute instances list
```

**VM Specs:**
- **Type:** e2-standard-2 (2 vCPU, 8GB RAM)
- **Cost:** ~$49/month
- **Disk:** 50GB SSD
- **OS:** Ubuntu 22.04 LTS

### 4.2 SSH into VM

```bash
# SSH into the VM
gcloud compute ssh school-portal-vm --zone=us-central1-a

# You are now on the VM! The rest of this section runs ON THE VM.
```

---

## Phase 5: VM Setup (Run on VM)

### 5.1 System Update

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install basic tools
sudo apt install -y git curl wget vim htop
```

### 5.2 Install Docker

```bash
# Install Docker using official script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Apply group changes (logout and login)
exit
```

```bash
# SSH back in
gcloud compute ssh school-portal-vm --zone=us-central1-a

# Verify Docker installation
docker --version
# Expected: Docker version 24.0.7 or newer
```

### 5.3 Install Docker Compose

```bash
# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Verify installation
docker compose version
# Expected: Docker Compose version v2.23.0 or newer
```

### 5.4 Configure Docker

```bash
# Setup log rotation
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker
sudo systemctl restart docker

# Verify Docker is running
sudo systemctl status docker
```

---

## Phase 6: Deploy Application

### 6.1 Clone Repository

```bash
# Navigate to home directory
cd ~

# Clone your repository (REPLACE WITH YOUR REPO URL)
git clone https://github.com/BrianDai22/concetrateaiquiz.git
cd concetrateaiquiz

# Verify you have latest code
git log --oneline -5

# Should show:
# 07d98e9 fix: resolve UUID display bugs in grading views
# ...
```

### 6.2 Configure Production Environment

```bash
# Copy environment template
cp .env.docker.prod.example .env.docker.prod

# Generate secure secrets
export JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
export COOKIE_SECRET=$(openssl rand -base64 64 | tr -d '\n')

echo "JWT_SECRET=$JWT_SECRET"
echo "COOKIE_SECRET=$COOKIE_SECRET"

# SAVE THESE SECRETS! You'll need them in the next step.
```

### 6.3 Edit Production Environment

```bash
# Edit the production environment file
nano .env.docker.prod
```

**Required Configuration:**

```bash
# API Configuration
API_PORT=3001
API_HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=warn

# Database (containerized PostgreSQL)
DATABASE_URL=postgresql://postgres:YOUR_STRONG_PASSWORD@postgres:5432/concentrate-quiz

# Redis (containerized)
REDIS_URL=redis://redis:6379

# JWT & Authentication Secrets (paste generated secrets)
JWT_SECRET=<PASTE_JWT_SECRET_HERE>
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
COOKIE_SECRET=<PASTE_COOKIE_SECRET_HERE>

# Google OAuth (Production)
# Create these at: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your-prod-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-prod-client-secret

# OAuth Callbacks (REPLACE your-domain.com)
OAUTH_CALLBACK_URL=https://your-domain.com/api/v0/auth/oauth/google/callback
OAUTH_SUCCESS_REDIRECT=https://your-domain.com/dashboard
OAUTH_ERROR_REDIRECT=https://your-domain.com/login

# CORS Configuration (REPLACE your-domain.com)
CORS_ORIGIN=https://your-domain.com

# Frontend Configuration (REPLACE your-domain.com)
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v0
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Certbot Configuration (REPLACE your-domain.com)
CERTBOT_DOMAIN=your-domain.com
CERTBOT_EMAIL=admin@your-domain.com
```

**Important:**
- Replace `YOUR_STRONG_PASSWORD` with a secure password
- Replace `your-domain.com` with your actual domain
- Or use `$STATIC_IP` temporarily if no domain yet

Save with: `Ctrl+O`, `Enter`, `Ctrl+X`

### 6.4 Update Docker Compose for Production Password

```bash
# Edit docker-compose.yml
nano docker-compose.yml

# Find line ~9:
# POSTGRES_PASSWORD: postgres

# Change to:
# POSTGRES_PASSWORD: YOUR_STRONG_PASSWORD  (same as DATABASE_URL)
```

Save with: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## Phase 7: Domain & DNS Configuration

**If you don't have a domain yet, skip to Phase 8 and use the static IP temporarily.**

### 7.1 Configure DNS A Record

In your domain registrar's DNS management:

1. **Login to your domain registrar** (GoDaddy, Namecheap, Cloudflare, etc.)

2. **Add A Record:**
   ```
   Type: A
   Name: @ (or subdomain like "portal")
   Value: <YOUR_STATIC_IP>  (from Phase 3.1)
   TTL: 3600
   ```

3. **Optional - Add www subdomain:**
   ```
   Type: CNAME
   Name: www
   Value: your-domain.com
   TTL: 3600
   ```

### 7.2 Verify DNS Propagation

```bash
# Check DNS resolution (run on your local machine or VM)
dig your-domain.com
nslookup your-domain.com

# Should return your static IP
# DNS propagation can take 5-30 minutes
```

---

## Phase 8: Build & Start Services

### 8.1 Build Docker Images

```bash
# Navigate to project directory
cd ~/concetrateaiquiz

# Build all images (takes 5-10 minutes)
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Watch build progress...
# This builds: API, Frontend, Nginx containers
```

### 8.2 Start Services

```bash
# Start all services in detached mode
docker compose up -d

# Check container status
docker compose ps

# Expected output:
# NAME                      STATUS
# concentrate-quiz-db       Up (healthy)
# school-portal-redis       Up (healthy)
# school-portal-api         Up (healthy)
# school-portal-frontend    Up (healthy)
# school-portal-nginx       Up
```

### 8.3 View Logs

```bash
# View logs from all services
docker compose logs -f

# Or specific service:
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f nginx

# Press Ctrl+C to stop following logs
```

### 8.4 Run Database Migrations

```bash
# Execute migrations
docker compose exec api npm run migrate

# Verify migrations ran
docker compose exec postgres psql -U postgres -d concentrate-quiz -c "\dt"

# Should show tables: users, classes, assignments, submissions, grades, etc.
```

---

## Phase 9: Initial Testing (HTTP)

### 9.1 Test from VM

```bash
# Test API health endpoint
curl http://localhost/api/v0/health

# Expected: {"status":"ok","timestamp":"..."}

# Test frontend
curl http://localhost/ | head -20

# Should return HTML
```

### 9.2 Test from External

```bash
# From your local machine (not VM)
# Replace with your domain or static IP

curl http://your-domain.com/api/v0/health
# or
curl http://<STATIC_IP>/api/v0/health
```

### 9.3 Open in Browser

Open `http://your-domain.com` (or `http://<STATIC_IP>`)

You should see the login page!

**Note:** If using static IP without domain, Google OAuth won't work yet. Skip to SSL setup first.

---

## Phase 10: SSL Certificate Setup

**Prerequisites:** Domain must be configured and pointing to your VM.

### 10.1 Run SSL Setup Script

```bash
# Navigate to project directory
cd ~/concetrateaiquiz

# Make script executable
chmod +x deployment/setup-ssl.sh

# Run SSL setup (REPLACE your-domain.com)
./deployment/setup-ssl.sh your-domain.com admin@your-domain.com

# This script will:
# 1. Stop nginx temporarily
# 2. Obtain Let's Encrypt certificate
# 3. Store certificate in nginx_certs volume
# 4. Restart nginx with SSL enabled

# Takes ~2-3 minutes
```

### 10.2 Enable HTTPS in Nginx

```bash
# Edit nginx configuration
nano nginx.conf
```

**Uncomment HTTPS server block (lines ~75-190):**

1. Find the HTTPS server block:
```nginx
# HTTPS server
# Uncomment below after running setup-ssl.sh
# server {
#     listen 443 ssl http2;
```

2. Remove `#` from all lines in the HTTPS server block

3. Update `server_name` to your domain:
```nginx
server_name your-domain.com;  # UPDATE THIS
```

4. Uncomment HTTP to HTTPS redirect (line ~71):
```nginx
# Redirect HTTP to HTTPS
return 301 https://$host$request_uri;
```

Save with: `Ctrl+O`, `Enter`, `Ctrl+X`

### 10.3 Restart Services with SSL

```bash
# Restart services
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify certbot container is running
docker compose ps certbot

# Check nginx logs
docker compose logs nginx | tail -20
```

### 10.4 Test HTTPS

```bash
# Test from VM
curl https://your-domain.com/api/v0/health

# Test in browser
# Open: https://your-domain.com

# Should show green padlock (valid SSL certificate)
```

---

## Phase 11: Google OAuth Configuration

### 11.1 Create OAuth Credentials

1. **Go to:** https://console.cloud.google.com/apis/credentials
2. **Select your project** (or create new one)
3. **Click:** "Create Credentials" → "OAuth 2.0 Client IDs"
4. **Application type:** Web application
5. **Name:** School Portal Production
6. **Authorized redirect URIs:**
   ```
   https://your-domain.com/api/v0/auth/oauth/google/callback
   ```
7. **Click:** Create
8. **Save:** Client ID and Client Secret

### 11.2 Update Production Environment

```bash
# On the VM
cd ~/concetrateaiquiz
nano .env.docker.prod

# Update these lines:
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
```

Save and restart:

```bash
docker compose restart api frontend
```

---

## Phase 12: Verification & Testing

### 12.1 Run Health Checks

```bash
# On the VM
cd ~/concetrateaiquiz
bash deployment/health-check.sh

# Should show all green ✅
```

### 12.2 Comprehensive Application Testing

**In Browser:** `https://your-domain.com`

1. **Authentication:**
   - [ ] Register new account (email/password)
   - [ ] Login with credentials
   - [ ] Login with Google OAuth
   - [ ] Logout

2. **Admin Functions:**
   - [ ] Create teacher group
   - [ ] Create users (teacher, student)
   - [ ] Suspend/unsuspend users

3. **Teacher Functions:**
   - [ ] Create class
   - [ ] Add students to class
   - [ ] Publish assignment
   - [ ] Grade student submission

4. **Student Functions:**
   - [ ] View enrolled classes
   - [ ] View assignments
   - [ ] Submit assignment
   - [ ] View grades and feedback

5. **Public Stats API:**
```bash
curl https://your-domain.com/api/v0/stats/average-grades
curl https://your-domain.com/api/v0/stats/teacher-names
curl https://your-domain.com/api/v0/stats/student-names
curl https://your-domain.com/api/v0/stats/classes
```

---

## Phase 13: Monitoring & Maintenance

### 13.1 Setup Automated Backups

```bash
# On the VM
# Create backup script
cat > ~/backup-database.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/backups"
mkdir -p $BACKUP_DIR
cd ~/concetrateaiquiz
docker compose exec -T postgres pg_dump -U postgres concentrate-quiz | \
  gzip > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
echo "Backup completed: $(date)"
EOF

chmod +x ~/backup-database.sh

# Test backup
./backup-database.sh

# Verify backup created
ls -lh ~/backups/
```

### 13.2 Setup Daily Cron Job

```bash
# Edit crontab
crontab -e

# Add this line (backup every day at 2 AM):
0 2 * * * /home/$USER/backup-database.sh >> /home/$USER/backup.log 2>&1

# Save and exit
```

### 13.3 Verify SSL Auto-Renewal

```bash
# Check certbot status
docker compose logs certbot | tail -20

# Test renewal (dry run)
docker compose exec certbot certbot renew --dry-run

# Certbot container automatically attempts renewal every 12 hours
```

### 13.4 Monitor Resources

```bash
# Check container resource usage
docker stats --no-stream

# Check disk space
df -h

# Check memory
free -h

# View system load
htop
```

---

## Phase 14: Post-Deployment Checklist

- [ ] All containers running and healthy
- [ ] HTTPS working with valid SSL certificate
- [ ] Google OAuth authentication working
- [ ] All user roles (Admin, Teacher, Student) functional
- [ ] Database migrations applied
- [ ] Automated backups configured
- [ ] SSL auto-renewal verified
- [ ] Firewall rules configured
- [ ] Domain DNS pointing to correct IP
- [ ] Application accessible from public internet
- [ ] Health check script passing
- [ ] Documentation updated with production URL

---

## Useful Commands Reference

### On Your Local Machine

```bash
# SSH into VM
gcloud compute ssh school-portal-vm --zone=us-central1-a

# View VM details
gcloud compute instances describe school-portal-vm --zone=us-central1-a

# Stop VM (save costs)
gcloud compute instances stop school-portal-vm --zone=us-central1-a

# Start VM
gcloud compute instances start school-portal-vm --zone=us-central1-a

# Delete VM (cleanup)
gcloud compute instances delete school-portal-vm --zone=us-central1-a
```

### On the VM

```bash
# View container status
docker compose ps

# View logs
docker compose logs -f
docker compose logs -f api

# Restart specific service
docker compose restart api

# Stop all services
docker compose down

# Start production services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Rebuild specific service
docker compose build api
docker compose up -d api

# Run database migration
docker compose exec api npm run migrate

# Access PostgreSQL
docker compose exec postgres psql -U postgres -d concentrate-quiz

# Check health
bash deployment/health-check.sh

# Manual backup
docker compose exec postgres pg_dump -U postgres concentrate-quiz | \
  gzip > backup_$(date +%Y%m%d).sql.gz

# Restore backup
gunzip < backup_YYYYMMDD.sql.gz | \
  docker compose exec -T postgres psql -U postgres concentrate-quiz
```

---

## Troubleshooting

### Issue: Container won't start

```bash
# Check logs
docker compose logs SERVICE_NAME

# Rebuild without cache
docker compose build --no-cache SERVICE_NAME
docker compose up -d SERVICE_NAME
```

### Issue: Database connection errors

```bash
# Verify DATABASE_URL matches POSTGRES_PASSWORD
cat .env.docker.prod | grep DATABASE_URL
cat docker-compose.yml | grep POSTGRES_PASSWORD

# Check PostgreSQL is running
docker compose exec postgres pg_isready -U postgres
```

### Issue: 502 Bad Gateway

```bash
# Check backend services
docker compose ps api frontend

# Test API directly
curl http://localhost:3001/health

# Check nginx config
docker compose exec nginx nginx -t

# Restart nginx
docker compose restart nginx
```

### Issue: SSL certificate errors

```bash
# Check certificate
docker compose exec certbot certbot certificates

# Renew manually
docker compose exec certbot certbot renew
docker compose restart nginx
```

### Issue: Out of memory

```bash
# Check memory
free -h

# Add swap space
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Cost Management

### Monthly Cost Estimate

| Resource | Cost |
|----------|------|
| VM (e2-standard-2) | $49/month |
| Static IP | $7/month |
| Disk (50GB) | $8/month |
| Network Egress (~100GB) | $12/month |
| **Total** | **~$75/month** |

### Cost Optimization

1. **Committed Use Discounts:** Save 37% with 1-year, 55% with 3-year
2. **Stop VM when not needed:** Only pay for disk storage
3. **Use smaller instance:** e2-small ($13/month) for development

### Stop VM to Save Costs

```bash
# From local machine
gcloud compute instances stop school-portal-vm --zone=us-central1-a

# When needed again
gcloud compute instances start school-portal-vm --zone=us-central1-a
```

---

## Security Checklist

- [ ] SSL/TLS enabled with valid certificate
- [ ] Strong database password (not default)
- [ ] JWT and cookie secrets generated securely
- [ ] Firewall allows only ports 22, 80, 443
- [ ] `.env.docker.prod` not committed to git
- [ ] SSH key-based authentication enabled
- [ ] Docker log rotation configured
- [ ] Regular automated backups
- [ ] Security headers enabled in nginx
- [ ] Rate limiting configured
- [ ] Google OAuth for production domain

---

## Next Steps

After successful deployment:

1. **Update PROJECT_STATUS.md** with production URL
2. **Configure monitoring** (GCP monitoring, uptime checks)
3. **Setup error tracking** (optional: Sentry)
4. **Create admin accounts** for your team
5. **Test all features** thoroughly
6. **Document any environment-specific configurations**
7. **Record the video demonstration** for submission!

---

## Support Resources

- **GCP Documentation:** https://cloud.google.com/compute/docs
- **Docker Documentation:** https://docs.docker.com
- **Let's Encrypt:** https://letsencrypt.org/docs/
- **Project Docs:** `/docs/planning/SPECS.md`

---

**Deployment Status:** Ready to Deploy! 🚀

All infrastructure code and configurations are committed and ready.
Your repository is at: https://github.com/BrianDai22/concetrateaiquiz
