# 🚀 Quick Deployment Reference Card

## One-Command Deployment

### Linux (Ubuntu/Debian)

```bash
chmod +x deploy-linux.sh && ./deploy-linux.sh
```

### Windows (PowerShell as Admin)

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser; .\deploy-windows.ps1
```

---

## 📋 What You Need Before Starting

| Item                   | Description                  | Where to Get                                                 |
| ---------------------- | ---------------------------- | ------------------------------------------------------------ |
| **Domain Name**        | e.g., erp.yourdomain.com     | Your domain registrar                                        |
| **Telegram Bot Token** | e.g., 123456789:ABC...       | [@BotFather](https://t.me/BotFather) on Telegram             |
| **Server Access**      | SSH (Linux) or RDP (Windows) | Your hosting provider                                        |
| **Gemini API Key**     | Optional, for AI features    | [Google AI Studio](https://makersuite.google.com/app/apikey) |

---

## ⚡ Quick Setup Steps

### 1️⃣ Get Telegram Bot Token

1. Open Telegram → Search **@BotFather**
2. Send `/newbot`
3. Follow prompts
4. Copy token (looks like: `123456789:ABCdef...`)

### 2️⃣ Point Domain to Server

1. Login to your domain registrar
2. Add **A Record**: `erp.yourdomain.com` → `Your Server IP`
3. Wait 5-10 minutes for DNS propagation

### 3️⃣ Run Deployment Script

- **Linux**: `./deploy-linux.sh`
- **Windows**: `.\deploy-windows.ps1`

### 4️⃣ Enter Configuration

When prompted, provide:

- Domain name
- Telegram bot token
- Email (for SSL)
- Port (default: 3000)

### 5️⃣ Wait for Completion

Script will automatically:

- ✅ Install dependencies
- ✅ Build application
- ✅ Configure web server
- ✅ Setup SSL certificate
- ✅ Configure Telegram webhook
- ✅ Start all services

### 6️⃣ Access Your Application

Visit: `https://your-domain.com`

---

## 🎯 Post-Deployment Checklist

- [ ] Application loads at `https://your-domain.com`
- [ ] Login page appears
- [ ] Create Telegram groups for shops
- [ ] Get channel IDs (send `/getid` in group)
- [ ] Configure shop Telegram channels in Settings
- [ ] Test Telegram notification (use "Test" button)
- [ ] Create test order to verify full flow

---

## 🔧 Essential Commands

### Check Application Status

```bash
pm2 status
```

### View Logs

```bash
pm2 logs factory-shop-erp
```

### Restart Application

```bash
pm2 restart factory-shop-erp
```

### Check Telegram Webhook

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo"
```

### Manual Backup

```bash
# Linux
/usr/local/bin/backup-erp-db.sh

# Windows
.\backup-database.ps1
```

---

## 🆘 Quick Troubleshooting

| Problem                  | Solution                                     |
| ------------------------ | -------------------------------------------- |
| **App won't start**      | Check logs: `pm2 logs factory-shop-erp`      |
| **Telegram not working** | Verify webhook URL is HTTPS (not localhost)  |
| **SSL error**            | Wait for DNS propagation, then re-run script |
| **Port in use**          | Change port in `.env.production` and restart |
| **Database locked**      | Restart: `pm2 restart factory-shop-erp`      |

---

## 📱 Telegram Setup (Detailed)

### Create Bot

```
1. Open Telegram
2. Search: @BotFather
3. Send: /newbot
4. Name: Factory ERP Bot
5. Username: your_factory_erp_bot
6. Copy token
```

### Create Shop Group

```
1. Create new group
2. Add your bot
3. Make bot admin
4. Send: /getid
5. Copy channel ID (e.g., -1003867704448)
```

### Link to Shop

```
1. Login to ERP
2. Go to: Shop Management
3. Edit shop
4. Paste channel ID
5. Click "Test Telegram"
6. Save
```

---

## 🔐 Security Checklist

- [ ] HTTPS enabled (SSL certificate installed)
- [ ] `.env.production` file permissions set to 600
- [ ] Firewall configured (only ports 80, 443 open)
- [ ] Daily backups configured
- [ ] Strong passwords for all users
- [ ] Telegram bot token kept secret

---

## 📊 Default Ports

| Service     | Port | Access             |
| ----------- | ---- | ------------------ |
| Application | 3000 | Internal only      |
| HTTP        | 80   | Redirects to HTTPS |
| HTTPS       | 443  | Public access      |

---

## 🗂️ Important File Locations

### Linux

```
Application:  /var/www/Factory-Shop-ERP
Database:     /var/www/Factory-Shop-ERP/db/carement.db
Logs:         /var/www/Factory-Shop-ERP/logs/
Backups:      /var/backups/factory-erp/
Nginx Config: /etc/nginx/sites-available/factory-shop-erp
SSL Certs:    /etc/letsencrypt/live/yourdomain.com/
```

### Windows

```
Application:  C:\inetpub\Factory-Shop-ERP
Database:     C:\inetpub\Factory-Shop-ERP\db\carement.db
Logs:         C:\inetpub\Factory-Shop-ERP\logs\
Backups:      C:\Backups\factory-erp\
IIS Config:   C:\inetpub\Factory-Shop-ERP\web.config
```

---

## 🎓 First-Time User Guide

### 1. Access Application

Visit: `https://your-domain.com`

### 2. Login

Use default credentials or create admin account

### 3. Configure System

1. **Settings** → Configure company info
2. **Shop Management** → Register shops
3. **Product Management** → Add products
4. **Telegram Settings** → Link channels

### 4. Test Order Flow

1. Login as shop user
2. Create order
3. Check Telegram notification
4. Upload payment slip
5. Verify payment (as finance)
6. Dispatch order (as factory)
7. Confirm all notifications received

---

## 📞 Need Help?

1. **Check Logs**: `pm2 logs factory-shop-erp`
2. **Read Full Guide**: See `DEPLOYMENT_GUIDE.md`
3. **Check Database**: `sqlite3 db/carement.db`
4. **Telegram Logs**: Check `shop_telegram_notifications` table

---

## ✅ Deployment Complete Checklist

- [ ] Script ran without errors
- [ ] Application accessible via HTTPS
- [ ] SSL certificate valid (green padlock)
- [ ] Telegram webhook configured
- [ ] Test notification sent successfully
- [ ] Database created and accessible
- [ ] Automated backups scheduled
- [ ] PM2 auto-starts on reboot
- [ ] Firewall rules configured
- [ ] All services running

---

**🎉 Congratulations! Your Factory-Shop-ERP is now live!**

For detailed documentation, see: `DEPLOYMENT_GUIDE.md`
