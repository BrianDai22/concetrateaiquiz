# 🚀 Quick Deployment Guide

**Your VM is ready!** Follow these simple steps to deploy your application.

---

## ⚡ Quick Start (15-20 minutes)

### Step 1: SSH into your VM

Open a **new terminal window** and run:

```bash
~/google-cloud-sdk/bin/gcloud compute ssh school-portal-vm --zone=us-central1-a
```

### Step 2: Run the setup script

Once you're on the VM, run:

```bash
curl -o vm-setup.sh https://raw.githubusercontent.com/BrianDai22/concetrateaiquiz/main/deployment/vm-setup.sh
bash vm-setup.sh
```

This will install Docker, Docker Compose, and clone your repository (~5 minutes).

### Step 3: Logout and login again

After the script completes, you **must** logout and login for Docker permissions to take effect:

```bash
exit
```

Then SSH back in:

```bash
~/google-cloud-sdk/bin/gcloud compute ssh school-portal-vm --zone=us-central1-a
```

### Step 4: Deploy the application

Now run the deployment script:

```bash
cd ~/concetrateaiquiz
bash deployment/configure-production.sh
```

This will:
- Generate secure secrets
- Configure the production environment
- Build Docker images (~5-10 minutes)
- Start all services
- Run database migrations
- Test the application

### Step 5: Access your application

Once complete, open your browser to:

```
http://35.225.50.31
```

You should see the login page! 🎉

---

## 📋 What You'll See

During deployment, the script will:

1. ✅ Generate secure JWT and database passwords
2. ✅ Create `.env.docker.prod` with your configuration
3. ⏳ Build Docker images (this is the longest step - 5-10 min)
4. ✅ Start 5 containers: PostgreSQL, Redis, API, Frontend, Nginx
5. ✅ Run database migrations
6. ✅ Test the application

**Total time:** ~15-20 minutes

---

## 🔧 Optional: Google OAuth Configuration

During step 4, you'll be asked if you want to configure Google OAuth.

**Option 1: Skip for now** (recommended for first deployment)
- Press `N` when asked
- You can configure it later
- Regular email/password login will still work

**Option 2: Configure now**
- Press `Y` when asked
- Go to: https://console.cloud.google.com/apis/credentials
- Create OAuth 2.0 credentials
- Authorized redirect URI: `http://35.225.50.31/api/v0/auth/oauth/google/callback`
- Enter Client ID and Secret when prompted

---

## ✅ Success Checklist

Deployment is complete when you see:

- ✅ "Deployment Complete!" message
- ✅ All 5 containers showing as "Up" or "Up (healthy)"
- ✅ Health check shows `{"status":"ok"}`
- ✅ Browser loads login page at http://35.225.50.31

---

## 🎯 Testing the Application

### Create your first user:

1. Open http://35.225.50.31
2. Click "Register"
3. Fill in the form
4. Login with your credentials

### Test all features:

- **Admin:** Create users, manage teachers
- **Teacher:** Create classes, assign work, grade
- **Student:** View classes, submit work, see grades

---

## 🌐 Domain Setup (Optional)

If you have a domain, you can configure it now:

### 1. Configure DNS A Record

In your domain registrar:
- **Type:** A
- **Name:** @ (or subdomain)
- **Value:** `35.225.50.31`
- **TTL:** 3600

Wait 5-30 minutes for propagation.

### 2. Update environment

On the VM:

```bash
cd ~/concetrateaiquiz
nano .env.docker.prod
```

Replace all instances of `35.225.50.31` with `your-domain.com`

Then restart:

```bash
docker compose restart
```

### 3. Setup SSL

```bash
./deployment/setup-ssl.sh your-domain.com admin@your-domain.com
```

This will:
- Obtain Let's Encrypt certificate
- Configure HTTPS
- Auto-renewal every 12 hours

---

## 📊 Useful Commands

On the VM:

```bash
# View all container status
docker compose ps

# View logs
docker compose logs -f

# View API logs specifically
docker compose logs -f api

# Restart a service
docker compose restart api

# Stop everything
docker compose down

# Start everything
docker compose up -d

# Run health check
bash deployment/health-check.sh
```

---

## 🐛 Troubleshooting

### Issue: "Permission denied" when running docker commands

**Solution:** You need to logout and login again for docker group to take effect.

```bash
exit
gcloud compute ssh school-portal-vm --zone=us-central1-a
```

### Issue: Containers keep restarting

**Solution:** Check logs to see what's failing:

```bash
docker compose logs
```

Common causes:
- Database password mismatch in `.env.docker.prod` and `docker-compose.yml`
- Not enough memory (add swap - see DEPLOYMENT_INFO.md)

### Issue: Can't access http://35.225.50.31

**Solutions:**

1. Check if services are running:
```bash
docker compose ps
```

2. Test from the VM itself:
```bash
curl http://localhost/api/v0/health
```

3. Check firewall (should already be configured):
```bash
gcloud compute firewall-rules list
```

### Issue: Database migration fails

**Solution:** Database might not be ready yet. Wait 30 seconds and retry:

```bash
sleep 30
docker compose exec api npm run migrate
```

---

## 💰 Cost Management

### Stop the VM when not using it

**From your local machine:**

```bash
# Stop VM (you only pay ~$8/month for disk storage)
~/google-cloud-sdk/bin/gcloud compute instances stop school-portal-vm --zone=us-central1-a

# Start VM when needed
~/google-cloud-sdk/bin/gcloud compute instances start school-portal-vm --zone=us-central1-a
```

**Note:** Your static IP (35.225.50.31) won't change when you stop/start the VM.

---

## 📚 Additional Documentation

- **Detailed deployment guide:** `deployment/GCP_DEPLOYMENT_GUIDE.md`
- **Deployment information:** `deployment/DEPLOYMENT_INFO.md`
- **Health check script:** `deployment/health-check.sh`
- **SSL setup script:** `deployment/setup-ssl.sh`

---

## 🎬 After Deployment

Once your application is running:

1. ✅ Test all features thoroughly
2. ✅ Create test users for all 3 roles (Admin, Teacher, Student)
3. ✅ Verify Google OAuth (if configured)
4. ✅ (Optional) Setup domain and SSL
5. ✅ **Record your 5-10 minute demo video!**
6. ✅ Submit to adam@concentrate.ai

---

## 🆘 Need Help?

If you encounter issues:

1. Check the logs: `docker compose logs -f`
2. Check troubleshooting section above
3. Review `deployment/DEPLOYMENT_INFO.md`
4. Review `deployment/GCP_DEPLOYMENT_GUIDE.md`

---

## ✨ Summary

**Your deployment resources:**
- **VM IP:** 35.225.50.31
- **Project:** school-portal-prod-1762319504
- **SSH Command:** `~/google-cloud-sdk/bin/gcloud compute ssh school-portal-vm --zone=us-central1-a`

**Deployment scripts:**
- `deployment/vm-setup.sh` - Install Docker & clone repo
- `deployment/configure-production.sh` - Deploy application
- `deployment/setup-ssl.sh` - Configure SSL (optional)
- `deployment/health-check.sh` - Verify deployment

**Ready to deploy!** Start with Step 1 above. 🚀

---

**Created:** 2025-11-05
**Estimated Time:** 15-20 minutes
**Cost:** ~$75/month (or ~$8/month when stopped)
