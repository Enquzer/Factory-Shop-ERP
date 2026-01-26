# 🚀 Factory-Shop-ERP Deployment Guide

## Quick Start - One-Click Deployment

This guide will help you deploy the Factory-Shop-ERP system to a production server with minimal effort.

---

## 📋 Prerequisites

### For Linux (Ubuntu/Debian)

- Ubuntu 20.04+ or Debian 10+
- Root or sudo access
- Domain name pointed to your server
- Minimum 2GB RAM, 20GB storage

### For Windows Server

- Windows Server 2016+ or Windows 10/11 Pro
- Administrator access
- Domain name pointed to your server
- Minimum 2GB RAM, 20GB storage

---

## 🐧 Linux Deployment (Ubuntu/Debian)

### Step 1: Upload Files to Server

```bash
# SSH into your server
ssh user@your-server-ip

# Navigate to web directory
cd /var/www

# Clone your repository
git clone https://github.com/Enquzer/Factory-Shop-ERP.git
cd Factory-Shop-ERP
```

### Step 2: Make Script Executable

```bash
chmod +x deploy-linux.sh
```

### Step 3: Run Deployment Script

```bash
./deploy-linux.sh
```

### Step 4: Follow Interactive Prompts

The script will ask you for:

1. **Domain Name**: Enter your domain (e.g., `erp.yourdomain.com`)
2. **Telegram Bot Token**: Get from [@BotFather](https://t.me/BotFather) on Telegram
3. **Gemini API Key**: Optional, for AI features
4. **Application Port**: Default is 3000
5. **SSL Certificate**: Automatic setup via Let's Encrypt
6. **Email for SSL**: Required for SSL certificate

### What the Script Does:

✅ Installs Node.js 20.x  
✅ Installs PM2 process manager  
✅ Installs and configures Nginx  
✅ Builds your application  
✅ Sets up SSL certificate (HTTPS)  
✅ Configures Telegram webhook  
✅ Sets up automated daily backups  
✅ Configures firewall rules  
✅ Starts all services

### Step 5: Access Your Application

Visit `https://your-domain.com` in your browser!

---

## 🪟 Windows Server Deployment

### Step 1: Upload Files to Server

1. Remote Desktop into your Windows Server
2. Download/clone the repository to `C:\inetpub\Factory-Shop-ERP`

```powershell
cd C:\inetpub
git clone https://github.com/Enquzer/Factory-Shop-ERP.git
cd Factory-Shop-ERP
```

### Step 2: Run PowerShell as Administrator

1. Right-click on PowerShell
2. Select "Run as Administrator"

### Step 3: Allow Script Execution

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Step 4: Run Deployment Script

```powershell
.\deploy-windows.ps1
```

### Step 5: Follow Interactive Prompts

The script will ask you for:

1. **Domain Name**: Enter your domain (e.g., `erp.yourdomain.com`)
2. **Telegram Bot Token**: Get from [@BotFather](https://t.me/BotFather)
3. **Gemini API Key**: Optional
4. **Application Port**: Default is 3000
5. **IIS Setup**: Recommended for production

### What the Script Does:

✅ Installs Node.js 20.x  
✅ Installs PM2 process manager  
✅ Installs and configures IIS  
✅ Builds your application  
✅ Configures URL Rewrite rules  
✅ Configures Telegram webhook  
✅ Sets up automated daily backups  
✅ Configures Windows Firewall  
✅ Starts all services

### Step 6: Configure SSL Certificate

For Windows, install SSL certificate manually:

**Option 1: Using Let's Encrypt (Recommended)**

1. Download [win-acme](https://www.win-acme.com/)
2. Run `wacs.exe`
3. Follow prompts to get free SSL certificate

**Option 2: Using Purchased Certificate**

1. Open IIS Manager
2. Select your site
3. Click "Bindings" → "Add"
4. Select HTTPS and choose your certificate

### Step 7: Access Your Application

Visit `https://your-domain.com` in your browser!

---

## 📱 Telegram Configuration

### 1. Create Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow prompts to create your bot
4. Copy the **Bot Token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Create Shop Groups/Channels

For each shop that needs notifications:

1. Create a new Telegram group or channel
2. Add your bot as administrator
3. Grant permissions:
   - ✅ Post messages
   - ✅ Edit messages
   - ✅ Delete messages

### 3. Get Channel ID

**Method 1: Using Bot Command**

1. Send `/getid` in the group
2. Bot will reply with the channel ID

**Method 2: Using Web Interface**

1. Login to your ERP system
2. Go to Settings → Telegram
3. View "Detected Groups"
4. Copy the channel ID (e.g., `-1003867704448`)

### 4. Link Channel to Shop

1. Go to Factory Dashboard → Shop Management
2. Click "Edit" on a shop
3. Paste the Telegram Channel ID
4. Click "Test Telegram" to verify
5. Save changes

### 5. Verify Webhook

The deployment script automatically sets the webhook, but you can verify:

```bash
# Linux
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"

# Windows PowerShell
Invoke-RestMethod "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Expected response:

```json
{
  "ok": true,
  "result": {
    "url": "https://yourdomain.com/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## 🔧 Post-Deployment Configuration

### 1. First Login

Default credentials are created during first run. Check your database or create users via the admin panel.

### 2. Configure Shops

1. Go to **Shop Management**
2. Register new shops
3. Set discount rates
4. Configure Telegram channels

### 3. Add Products

1. Go to **Product Management**
2. Add product categories
3. Add products with variants (size, color)
4. Set pricing and minimum stock levels

### 4. Test Order Flow

1. Login as a shop user
2. Create a test order
3. Verify Telegram notification is received
4. Upload payment slip
5. Verify payment notification
6. Mark as dispatched
7. Verify dispatch notification

---

## 🛠️ Management Commands

### Linux

```bash
# View application logs
pm2 logs factory-shop-erp

# Restart application
pm2 restart factory-shop-erp

# Stop application
pm2 stop factory-shop-erp

# View status
pm2 status

# Monitor resources
pm2 monit

# Restart Nginx
sudo systemctl restart nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log

# Manual database backup
/usr/local/bin/backup-erp-db.sh

# View database
sqlite3 /var/www/Factory-Shop-ERP/db/carement.db
```

### Windows

```powershell
# View application logs
pm2 logs factory-shop-erp

# Restart application
pm2 restart factory-shop-erp

# Stop application
pm2 stop factory-shop-erp

# View status
pm2 status

# Monitor resources
pm2 monit

# Restart IIS
iisreset

# Manual database backup
.\backup-database.ps1

# View database
sqlite3 .\db\carement.db
```

---

## 🔒 Security Best Practices

### 1. Environment Variables

- ✅ Never commit `.env` files to Git
- ✅ Keep `.env.production` secure (`chmod 600` on Linux)
- ✅ Rotate Telegram bot token if compromised

### 2. Database Security

- ✅ Regular automated backups (configured by script)
- ✅ Store backups in separate location
- ✅ Test backup restoration periodically

### 3. SSL/HTTPS

- ✅ Always use HTTPS in production
- ✅ Telegram webhooks REQUIRE HTTPS
- ✅ Auto-renewal configured for Let's Encrypt

### 4. Firewall

- ✅ Only expose ports 80 (HTTP) and 443 (HTTPS)
- ✅ Application port (3000) should be internal only
- ✅ Configured automatically by deployment script

### 5. Updates

```bash
# Linux
cd /var/www/Factory-Shop-ERP
git pull
npm install
npm run build
pm2 restart factory-shop-erp

# Windows
cd C:\inetpub\Factory-Shop-ERP
git pull
npm install
npm run build
pm2 restart factory-shop-erp
```

---

## 🐛 Troubleshooting

### Application Not Starting

**Check PM2 logs:**

```bash
pm2 logs factory-shop-erp --lines 50
```

**Common issues:**

- Port already in use → Change port in `.env.production`
- Build failed → Run `npm run build` manually
- Missing dependencies → Run `npm install`

### Telegram Notifications Not Working

**Check webhook status:**

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

**Common issues:**

- ❌ Webhook URL is localhost → Must be HTTPS domain
- ❌ Bot not admin in channel → Add bot as administrator
- ❌ `TELEGRAM_ENABLED=false` → Set to `true` in `.env.production`
- ❌ Shop has no channel ID → Configure in shop settings

**Check notification logs:**

```bash
sqlite3 db/carement.db "SELECT * FROM shop_telegram_notifications ORDER BY created_at DESC LIMIT 10;"
```

### SSL Certificate Issues

**Linux (Let's Encrypt):**

```bash
# Renew manually
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

**Windows:**

- Reinstall certificate in IIS Manager
- Check certificate expiration date
- Verify bindings in IIS

### Database Locked

```bash
# Check for zombie processes
ps aux | grep node  # Linux
Get-Process node    # Windows

# Restart application
pm2 restart factory-shop-erp
```

### High Memory Usage

```bash
# Check memory
pm2 monit

# Restart application
pm2 restart factory-shop-erp

# Increase memory limit in ecosystem.config.js
max_memory_restart: '2G'
```

---

## 📊 Monitoring

### Application Health

```bash
# Check if app is responding
curl http://localhost:3000/health

# Check PM2 status
pm2 status

# View resource usage
pm2 monit
```

### Database Health

```bash
# Check database size
du -h db/carement.db  # Linux
Get-Item db\carement.db | Select-Object Length  # Windows

# Check database integrity
sqlite3 db/carement.db "PRAGMA integrity_check;"

# Optimize database
sqlite3 db/carement.db "VACUUM;"
```

### Nginx/IIS Health

```bash
# Linux - Check Nginx
sudo systemctl status nginx
sudo nginx -t

# Windows - Check IIS
Get-Service W3SVC
```

---

## 📞 Support

### Getting Help

1. **Check Logs**: Always check PM2 and Nginx/IIS logs first
2. **Database Logs**: Check `shop_telegram_notifications` table for Telegram issues
3. **GitHub Issues**: Report bugs on the repository
4. **Documentation**: Refer to this guide and inline code comments

### Useful Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

---

## 🎯 Summary

Your Factory-Shop-ERP deployment is complete! The system includes:

✅ **Web Application**: Next.js running on PM2  
✅ **Reverse Proxy**: Nginx (Linux) or IIS (Windows)  
✅ **Database**: SQLite with automated backups  
✅ **Notifications**: Telegram bot integration  
✅ **SSL**: HTTPS encryption  
✅ **Monitoring**: PM2 process management  
✅ **Backups**: Daily automated database backups

**Your application is now live and ready to manage your factory-shop operations!** 🎉
