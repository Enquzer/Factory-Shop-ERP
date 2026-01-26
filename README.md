# Carement Central ERP

A comprehensive Factory-Shop ERP system built with Next.js by **Enquzer Getachew** from Ethiopia.

This modern ERP solution manages the complete workflow from factory production to shop orders, with real-time Telegram notifications and comprehensive tracking.

## 🚀 Quick Deployment (Production)

### One-Click Deployment Scripts

We've created automated deployment scripts for seamless production setup:

#### **Linux (Ubuntu/Debian)**

```bash
chmod +x deploy-linux.sh
./deploy-linux.sh
```

#### **Windows Server**

```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
.\deploy-windows.ps1
```

### What Gets Configured Automatically:

✅ Node.js 20.x installation  
✅ PM2 process manager  
✅ Nginx (Linux) or IIS (Windows) reverse proxy  
✅ SSL certificate (HTTPS)  
✅ Telegram webhook configuration  
✅ Automated daily backups  
✅ Firewall rules  
✅ Production build & optimization

### 📚 Deployment Documentation

- **[QUICK_START.md](QUICK_START.md)** - Quick reference card for rapid deployment
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Comprehensive deployment guide with troubleshooting
- **[TELEGRAM_FIX_SUMMARY.md](TELEGRAM_FIX_SUMMARY.md)** - Telegram notification system details

---

## 💻 Development

### Prerequisites

- Node.js 18+ or 20+
- npm or yarn
- Git

### Local Setup

```bash
# Clone the repository
git clone https://github.com/Enquzer/Factory-Shop-ERP.git
cd Factory-Shop-ERP

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see your application.

### Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run deploy       # Build and backup database
```

---

## 🏗️ Technology Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: SQLite (file-based)
- **Process Manager**: PM2
- **Web Server**: Nginx (Linux) / IIS (Windows)
- **Notifications**: Telegram Bot API
- **PDF Generation**: jsPDF
- **Authentication**: bcrypt, JWT
- **AI Integration**: Google Gemini API

---

## 📱 Features

### Factory Management

- Production order tracking
- Multi-stage workflow (Planning → Cutting → Sewing → Finishing → QC → Packing)
- Daily production status updates
- Quality inspection management
- Raw material inventory
- BOM (Bill of Materials) management

### Shop Management

- Shop registration and approval
- Product catalog with variants (size, color)
- Order placement and tracking
- Payment slip upload
- Inventory management
- Real-time Telegram notifications

### Finance Module

- Payment verification
- Order financial tracking
- Sales analytics
- Shop performance metrics

### Designer Studio

- Style creation and management
- Tech pack specifications
- Factory handover workflow
- Sample approval process

### Telegram Integration

- Real-time order notifications
- Payment verification alerts
- Dispatch notifications
- PDF reports with product images
- Multi-shop channel support

---

## 🔐 Security Features

- HTTPS/SSL encryption
- Secure password hashing (bcrypt)
- Role-based access control
- Environment variable protection
- SQL injection prevention
- XSS protection headers

---

## 📊 Database Schema

The application uses SQLite with the following main tables:

- `users` - User authentication and roles
- `shops` - Shop information and configuration
- `products` - Product catalog
- `product_variants` - Size/color variants
- `orders` - Shop orders
- `marketing_orders` - Factory production orders
- `shop_telegram_notifications` - Notification logs
- `telegram_groups` - Detected Telegram channels
- And many more for comprehensive tracking...

---

## 🛠️ Manual Production Deployment

If you prefer manual deployment:

1. Configure environment variables in `.env.production`:

   ```env
   NODE_ENV=production
   NEXT_PUBLIC_BASE_URL=https://yourdomain.com
   PORT=3000
   TELEGRAM_ENABLED=true
   TELEGRAM_BOT_TOKEN=your_bot_token
   ```

2. Build the application:

   ```bash
   npm run build
   ```

3. Start with PM2:

   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

4. Configure Nginx/IIS as reverse proxy

5. Set up SSL certificate

6. Configure Telegram webhook

For detailed manual setup, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

---

## 📞 Support & Documentation

- **Issues**: [GitHub Issues](https://github.com/Enquzer/Factory-Shop-ERP/issues)
- **Deployment Help**: See `DEPLOYMENT_GUIDE.md`
- **Quick Reference**: See `QUICK_START.md`
- **Telegram Setup**: See `TELEGRAM_FIX_SUMMARY.md`

---

## 👨‍💻 Author

**Enquzer Getachew**  
Ethiopia

---

## 📄 License

This project is proprietary software developed for Carement Fashion.

---

## 🎯 Project Status

✅ **Production Ready** - Fully functional with automated deployment scripts

**Latest Updates:**

- ✅ One-click deployment scripts for Linux and Windows
- ✅ Automated SSL certificate setup
- ✅ Telegram webhook auto-configuration
- ✅ Automated backup system
- ✅ Complete production environment setup
