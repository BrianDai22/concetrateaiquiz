# School Portal Deployment Information

**Date:** 2025-11-05
**Status:** VM Created - Ready for Application Deployment

---

## GCP Infrastructure Details

### Project Information
- **Project ID:** `school-portal-prod-1762319504`
- **Project Name:** School Portal Production
- **Region:** us-central1
- **Zone:** us-central1-a

### Network Information
- **Static IP Address:** `35.225.50.31`
- **IP Name:** school-portal-ip
- **Firewall Rule:** school-portal-allow-web
- **Allowed Ports:** 22 (SSH), 80 (HTTP), 443 (HTTPS)

### VM Instance Details
- **VM Name:** school-portal-vm
- **Machine Type:** e2-standard-2 (2 vCPU, 8GB RAM)
- **Boot Disk:** 50GB SSD (pd-balanced)
- **OS:** Ubuntu 22.04 LTS
- **Internal IP:** 10.128.0.2
- **External IP:** 35.225.50.31
- **Status:** RUNNING ✅

---

## Billing Information

**Billing Account:** 013508-688014-F6C709 (Firebase Payment)
**Billing Status:** Enabled ✅

**Estimated Monthly Cost:** ~$75/month
- VM (e2-standard-2): ~$49/month
- Static IP: ~$7/month
- Disk (50GB): ~$8/month
- Network egress: ~$12/month

---

## Next Steps

### Phase 1: Access VM and Install Docker

```bash
# SSH into the VM
~/google-cloud-sdk/bin/gcloud compute ssh school-portal-vm --zone=us-central1-a
```

**On the VM, run these commands:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Logout and login again for group changes
exit
```

```bash
# SSH back in
~/google-cloud-sdk/bin/gcloud compute ssh school-portal-vm --zone=us-central1-a

# Verify installations
docker --version
docker compose version
```

### Phase 2: Clone Repository and Configure

```bash
# Clone your repository
cd ~
git clone https://github.com/BrianDai22/concetrateaiquiz.git
cd concetrateaiquiz

# Verify you have the latest code
git log --oneline -5
```

### Phase 3: Configure Production Environment

```bash
# Copy environment template
cp .env.docker.prod.example .env.docker.prod

# Generate secure secrets
export JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
export COOKIE_SECRET=$(openssl rand -base64 64 | tr -d '\n')

echo "JWT_SECRET=$JWT_SECRET"
echo "COOKIE_SECRET=$COOKIE_SECRET"
# SAVE THESE! You'll need them in the next step.
```

**Edit `.env.docker.prod`:**

```bash
nano .env.docker.prod
```

**Update these values:**
```bash
# Database
DATABASE_URL=postgresql://postgres:YOUR_STRONG_PASSWORD@postgres:5432/concentrate-quiz

# JWT & Secrets (paste the generated values)
JWT_SECRET=<paste JWT_SECRET>
COOKIE_SECRET=<paste COOKIE_SECRET>

# Google OAuth (get from: https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=your-prod-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-prod-client-secret

# Domain Configuration (or use IP temporarily)
# Replace "your-domain.com" with your actual domain OR use the static IP
OAUTH_CALLBACK_URL=https://35.225.50.31/api/v0/auth/oauth/google/callback
OAUTH_SUCCESS_REDIRECT=https://35.225.50.31/dashboard
OAUTH_ERROR_REDIRECT=https://35.225.50.31/login
CORS_ORIGIN=https://35.225.50.31
NEXT_PUBLIC_API_URL=https://35.225.50.31/api/v0
NEXT_PUBLIC_APP_URL=https://35.225.50.31
CERTBOT_DOMAIN=35.225.50.31
CERTBOT_EMAIL=your-email@example.com
```

### Phase 4: Update docker-compose.yml

```bash
# Edit docker-compose.yml to update PostgreSQL password
nano docker-compose.yml

# Change line ~9:
# FROM: POSTGRES_PASSWORD: postgres
# TO:   POSTGRES_PASSWORD: YOUR_STRONG_PASSWORD
# (must match DATABASE_URL password)
```

### Phase 5: Build and Start Services

```bash
# Build all Docker images (takes 5-10 minutes)
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Phase 6: Run Database Migrations

```bash
# Execute migrations
docker compose exec api npm run migrate

# Verify tables created
docker compose exec postgres psql -U postgres -d concentrate-quiz -c "\dt"
```

### Phase 7: Test Initial Access

```bash
# Test from VM
curl http://localhost/api/v0/health

# Test from your local machine (new terminal)
curl http://35.225.50.31/api/v0/health
```

**Open in browser:** http://35.225.50.31

You should see the login page!

---

## Domain Configuration (Optional but Recommended)

If you have a domain:

1. **Configure DNS A Record:**
   - Point your domain to: `35.225.50.31`
   - Wait 5-30 minutes for propagation

2. **Update `.env.docker.prod`:**
   - Replace `35.225.50.31` with your domain
   - Restart services: `docker compose restart`

3. **Setup SSL (after domain DNS propagates):**
   ```bash
   # Make script executable
   chmod +x deployment/setup-ssl.sh

   # Run SSL setup
   ./deployment/setup-ssl.sh your-domain.com admin@your-domain.com
   ```

4. **Enable HTTPS in nginx.conf:**
   - Uncomment HTTPS server block
   - Restart: `docker compose restart nginx`

---

## Useful Commands

### VM Management (from your local machine)
```bash
# SSH into VM
~/google-cloud-sdk/bin/gcloud compute ssh school-portal-vm --zone=us-central1-a

# Stop VM (save costs when not using)
~/google-cloud-sdk/bin/gcloud compute instances stop school-portal-vm --zone=us-central1-a

# Start VM
~/google-cloud-sdk/bin/gcloud compute instances start school-portal-vm --zone=us-central1-a

# View VM details
~/google-cloud-sdk/bin/gcloud compute instances describe school-portal-vm --zone=us-central1-a
```

### Docker Commands (on the VM)
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

# Run health check
bash deployment/health-check.sh
```

---

## Troubleshooting

### Issue: Can't SSH into VM
```bash
# Check VM is running
~/google-cloud-sdk/bin/gcloud compute instances list

# If stopped, start it
~/google-cloud-sdk/bin/gcloud compute instances start school-portal-vm --zone=us-central1-a
```

### Issue: Container won't start
```bash
# Check logs
docker compose logs SERVICE_NAME

# Rebuild
docker compose build --no-cache SERVICE_NAME
docker compose up -d SERVICE_NAME
```

### Issue: Out of memory
```bash
# Check memory
free -h

# Add swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Reference Documentation

- **Full Deployment Guide:** `deployment/GCP_DEPLOYMENT_GUIDE.md`
- **General Deployment:** `deployment/DEPLOYMENT_GUIDE.md`
- **Health Check Script:** `deployment/health-check.sh`
- **SSL Setup Script:** `deployment/setup-ssl.sh`

---

## Success Criteria

Deployment is complete when:
- [ ] All 5 containers running and healthy
- [ ] Application accessible at http://35.225.50.31 (or your domain)
- [ ] User registration/login works
- [ ] All 3 user roles functional (Admin, Teacher, Student)
- [ ] Database migrations applied
- [ ] (Optional) HTTPS enabled with SSL certificate

---

**Created:** 2025-11-05
**VM IP:** 35.225.50.31
**Project ID:** school-portal-prod-1762319504
