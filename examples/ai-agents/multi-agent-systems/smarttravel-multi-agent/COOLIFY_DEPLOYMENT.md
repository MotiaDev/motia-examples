# 🚀 Coolify Self-Hosted Deployment Guide

Complete guide to deploy SmartTravel Multi-Agent System on Coolify - the open-source, self-hostable alternative to Heroku, Vercel, and Netlify.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Coolify Server Setup](#coolify-server-setup)
- [Application Deployment](#application-deployment)
- [Environment Configuration](#environment-configuration)
- [Custom Domain Setup](#custom-domain-setup)
- [Monitoring & Logs](#monitoring--logs)
- [Troubleshooting](#troubleshooting)
- [Production Best Practices](#production-best-practices)

---

## Prerequisites

### Required
- A server (VPS, dedicated, or cloud instance)
  - **Minimum:** 2 vCPU, 2GB RAM, 20GB storage
  - **Recommended:** 4 vCPU, 4GB RAM, 40GB storage
- SSH access to your server
- Domain name (optional but recommended)
- OpenAI API key

### Supported Platforms
- DigitalOcean
- Hetzner
- AWS EC2
- Linode
- Raspberry Pi (ARM)
- Any server with SSH access

---

## Coolify Server Setup

### 1. Install Coolify

SSH into your server and run the Coolify installation script:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

This will:
- Install Docker and Docker Compose
- Set up Coolify services
- Configure networking
- Start the Coolify dashboard

**Installation takes ~5-10 minutes**

### 2. Access Coolify Dashboard

Once installed, access Coolify at:

```
http://your-server-ip:8000
```

First-time setup:
1. Create your admin account
2. Set your email for notifications
3. Configure your server settings

### 3. Add Your Server

In Coolify dashboard:

1. Go to **Servers** → **Add Server**
2. Choose:
   - **Localhost** (if Coolify is on the same server)
   - **Remote Server** (if deploying to a different server)
3. For remote servers:
   - Enter server IP
   - Add SSH key or use password authentication
   - Test connection

---

## Application Deployment

### Option 1: Deploy from Git Repository (Recommended)

#### Step 1: Push Code to Git

Ensure your SmartTravel app is in a Git repository (GitHub, GitLab, Bitbucket, or self-hosted).

```bash
# If not already in a Git repo
cd /Users/rohitghumare/motia-examples-1/examples/smarttravel-multi-agent
git init
git add .
git commit -m "Initial commit for Coolify deployment"
git remote add origin <your-git-repo-url>
git push -u origin main
```

#### Step 2: Create New Resource in Coolify

1. **Navigate to Resources**
   - Dashboard → **+ New** → **Application**

2. **Select Source**
   - Choose **Git Repository**
   - Select your Git provider (GitHub, GitLab, etc.)
   - Authorize Coolify to access your repositories

3. **Choose Repository**
   - Select: `smarttravel-multi-agent`
   - Branch: `main` (or your deployment branch)

4. **Configure Build**
   - **Name:** `smarttravel-multi-agent`
   - **Build Pack:** Select **Docker Compose** or **Dockerfile**
   - **Dockerfile Path:** `Dockerfile.coolify`
   - **Port:** `3000`

5. **Set Destination**
   - Choose your server
   - Select network: Create new or use existing

### Option 2: Deploy with Docker Compose

#### Step 1: Upload Project to Server

```bash
# On your local machine
rsync -avz --exclude 'node_modules' --exclude '.git' \
  /Users/rohitghumare/motia-examples-1/examples/smarttravel-multi-agent \
  user@your-server-ip:/home/user/smarttravel
```

#### Step 2: Create Application in Coolify

1. **Navigate to Resources**
   - Dashboard → **+ New** → **Application**

2. **Select Source**
   - Choose **Docker Compose**
   - **Compose File Path:** `docker-compose.yml`

3. **Configure Application**
   - **Name:** `smarttravel`
   - **Project Directory:** `/home/user/smarttravel`

---

## Environment Configuration

### 1. Set Environment Variables in Coolify

In your application settings:

1. Go to **Environment Variables**
2. Click **+ Add Variable**
3. Add the following:

| Variable | Value | Required |
|----------|-------|----------|
| `OPENAI_API_KEY` | `sk-your-openai-key` | ✅ Yes |
| `PORT` | `3000` | No (default) |
| `NODE_ENV` | `production` | Recommended |

**Security Note:** Use Coolify's built-in secrets management for sensitive variables.

### 2. Environment Variable Security

For production:

```bash
# In Coolify, mark variables as "Build Time" or "Runtime"
# - Build Time: Available during build
# - Runtime: Available when container runs

OPENAI_API_KEY → Runtime (Sensitive)
PORT → Runtime
NODE_ENV → Build Time + Runtime
```

---

## Custom Domain Setup

### 1. Configure Domain in Coolify

1. **Add Domain**
   - Go to your application → **Domains**
   - Click **+ Add Domain**
   - Enter: `smarttravel.yourdomain.com`

2. **SSL Certificate**
   - Enable **Automatic SSL** (Let's Encrypt)
   - Coolify will automatically provision and renew certificates

### 2. DNS Configuration

In your domain registrar (e.g., Cloudflare, Namecheap):

Add an **A Record**:
```
Type: A
Name: smarttravel (or @ for root domain)
Value: your-server-ip
TTL: Auto or 300
```

**DNS propagation takes 5-60 minutes**

### 3. Verify Domain

```bash
# Test DNS resolution
dig smarttravel.yourdomain.com

# Test HTTPS
curl -I https://smarttravel.yourdomain.com
```

---

## Deployment Process

### 1. Deploy Application

In Coolify dashboard:

1. Click **Deploy** on your application
2. Coolify will:
   - Clone repository
   - Build Docker image
   - Start containers
   - Configure networking
   - Set up SSL (if domain configured)

**First deployment takes ~5-15 minutes**

### 2. Monitor Deployment

Watch real-time logs:
- Dashboard → Your App → **Logs**
- See build process, container startup, and application logs

### 3. Verify Deployment

```bash
# Test application
curl http://your-server-ip:3000

# Or with domain
curl https://smarttravel.yourdomain.com

# Health check
curl https://smarttravel.yourdomain.com/health
```

---

## Monitoring & Logs

### Application Logs

**View logs in Coolify:**
1. Dashboard → Your Application → **Logs**
2. Filter by:
   - **Build logs** - Docker build process
   - **Container logs** - Application runtime logs
   - **System logs** - Coolify management logs

### Real-Time Monitoring

Coolify provides:
- ✅ **CPU usage** per container
- ✅ **Memory consumption**
- ✅ **Disk space**
- ✅ **Network traffic**
- ✅ **Container status** (running, stopped, restarting)

### Alerts & Notifications

Configure notifications:
1. Dashboard → **Settings** → **Notifications**
2. Add channels:
   - Email
   - Discord webhook
   - Slack webhook
   - Telegram bot

Set alerts for:
- Container crashes
- High resource usage
- Failed deployments
- SSL certificate expiry

---

## Webhooks & Auto-Deploy

### Enable Git Webhook

1. **Get Webhook URL**
   - Your App → **Webhooks** → Copy URL

2. **Configure in Git Provider**

   **GitHub:**
   - Repo → **Settings** → **Webhooks** → **Add webhook**
   - Payload URL: `<coolify-webhook-url>`
   - Content type: `application/json`
   - Events: `Push events`

   **GitLab:**
   - Project → **Settings** → **Webhooks**
   - URL: `<coolify-webhook-url>`
   - Trigger: `Push events`

3. **Test Webhook**
   ```bash
   # Push to your repository
   git add .
   git commit -m "Test auto-deploy"
   git push origin main
   
   # Coolify will automatically rebuild and redeploy
   ```

---

## Troubleshooting

### Common Issues

#### 1. Build Fails - "npm ci failed"

**Problem:** Missing package-lock.json or dependency issues

**Solution:**
```bash
# Regenerate package-lock.json
rm package-lock.json
npm install
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

#### 2. Container Crashes on Start

**Problem:** Environment variables not set

**Check logs:**
```bash
# In Coolify logs tab, look for:
# "Error: OPENAI_API_KEY is required"
```

**Solution:**
- Add missing environment variables in Coolify dashboard
- Redeploy application

#### 3. Port Already in Use

**Problem:** Port 3000 is taken by another application

**Solution:**
```bash
# In Coolify, change port mapping
# or update PORT environment variable
PORT=3001
```

#### 4. Out of Memory

**Problem:** Node.js process killed due to memory limit

**Solution:**
```bash
# Increase container memory in Coolify
# Settings → Advanced → Memory Limit → 2GB
```

#### 5. Frontend Not Loading

**Problem:** Frontend build not copied correctly

**Check:**
```bash
# In Coolify terminal (click Terminal icon)
ls -la /app/public
# Should show frontend build files
```

**Solution:**
- Verify `Dockerfile.coolify` copies frontend correctly
- Rebuild: `Deploy` → `Rebuild`

---

## Production Best Practices

### 1. Resource Allocation

**Recommended container limits:**
```yaml
# In Coolify advanced settings
resources:
  limits:
    cpus: '2'
    memory: 2G
  reservations:
    cpus: '1'
    memory: 1G
```

### 2. Backup Strategy

**Database Backups:**
- If using external DB, enable Coolify's automatic backups
- Backup frequency: Daily
- Retention: 7 days minimum

**Application State:**
- Store in persistent volumes
- Configure in Coolify → **Storage**

### 3. High Availability

**Enable auto-restart:**
```yaml
restart_policy:
  condition: unless-stopped
  max_attempts: 3
```

**Health checks** (already in docker-compose.yml):
- Interval: 30s
- Timeout: 10s
- Retries: 3

### 4. Security

**Firewall rules:**
```bash
# Only expose necessary ports
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 22/tcp    # SSH
sudo ufw enable
```

**Update regularly:**
```bash
# Update Coolify
coolify update

# Update server packages
sudo apt update && sudo apt upgrade -y
```

### 5. Performance Optimization

**Enable caching:**
- Add Redis for session management
- Use CDN for static assets

**Optimize Docker image:**
- Use multi-stage builds (already in Dockerfile.coolify)
- Minimize layers
- Use Alpine base images

### 6. Monitoring

**Add external monitoring:**
- UptimeRobot for uptime monitoring
- Sentry for error tracking
- New Relic or DataDog for APM

---

## Scaling

### Horizontal Scaling

**Multiple instances:**
1. Coolify → Your App → **Scale**
2. Set replicas: `2` or more
3. Coolify automatically load balances

### Vertical Scaling

**Increase resources:**
1. Coolify → Your App → **Settings** → **Advanced**
2. Update:
   - CPU limit
   - Memory limit
3. Redeploy

---

## Updating Your Application

### Manual Update

```bash
# 1. Update your code
git add .
git commit -m "Update application"
git push origin main

# 2. In Coolify dashboard
# Click "Deploy" button
```

### Automatic Updates

With webhooks enabled (see above), every push triggers:
1. Automatic build
2. Automatic deployment
3. Zero-downtime restart

---

## Rollback

### Quick Rollback

1. Coolify → Your App → **Deployments**
2. Find previous successful deployment
3. Click **Redeploy**

### Git-based Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or checkout specific commit
git checkout <commit-hash>
git push origin main --force
```

---

## Advanced Configuration

### Custom Nginx Configuration

Create `nginx.conf` in your repository:

```nginx
server {
    listen 80;
    server_name smarttravel.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

In Coolify:
- Add as a **Service** → **Nginx**
- Link to your application

### Database Integration

**Add PostgreSQL:**
1. Coolify → **+ New** → **Database** → **PostgreSQL**
2. Set credentials
3. Add `DATABASE_URL` to your app's environment variables

### Redis Cache

**Add Redis:**
1. Coolify → **+ New** → **Database** → **Redis**
2. Add `REDIS_URL` to environment variables

---

## Cost Optimization

### Server Costs

**Budget-friendly options:**
- **Hetzner Cloud:** €3.79/month (2 vCPU, 2GB RAM)
- **DigitalOcean:** $12/month (2 vCPU, 2GB RAM)
- **Vultr:** $6/month (1 vCPU, 1GB RAM)

**Get €20 free credit:**
Use Hetzner referral: https://coolify.io/hetzner

### Resource Optimization

**Reduce container footprint:**
- Use Alpine images (smaller)
- Multi-stage builds (cleaner)
- Remove dev dependencies

---

## Support & Resources

### Official Documentation
- **Coolify Docs:** https://coolify.io/docs
- **Motia Docs:** https://motia.dev/docs

### Community
- **Discord:** https://discord.gg/coolify (17k+ members)
- **GitHub Issues:** https://github.com/coollabsio/coolify/issues

### Professional Support
- **Coolify Cloud:** Managed hosting with premium support
- **Email:** support@coollabs.io

---

## Summary

✅ **You now have:**
- SmartTravel deployed on your own infrastructure
- Automatic SSL certificates
- Auto-deployment from Git
- Monitoring and logging
- Full control over your data

🎉 **Your SmartTravel app is live at:**
- `http://your-server-ip:3000`
- or `https://smarttravel.yourdomain.com`

---

## Next Steps

1. ✅ Test all API endpoints
2. ✅ Configure monitoring alerts
3. ✅ Set up automatic backups
4. ✅ Add custom domain
5. ✅ Enable auto-deployment webhooks
6. ✅ Invite team members in Coolify

**Happy deploying! 🚀**

