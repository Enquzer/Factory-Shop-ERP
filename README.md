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
- **CAD Engine**: Fabric.js for high-precision 2D pattern editing
- **Notifications**: Telegram Bot API
- **PDF Generation**: jsPDF
- **Authentication**: bcrypt, JWT
- **AI Integration**: Google Gemini API

---

## 📱 Features

### 📐 CAD & Pattern Engineering (New!)

- **Interactive Pattern Editor**: Professional 2D CAD tool for garment pattern design and vertex manipulation.
- **Parametric Input System**: Capture client body measurements to dynamically scale pattern coordinates.
- **Point Drive Logic**: Intelligent coordinate transformation (scaling width/length while keeping necklines fixed).
- **Counterpart Sync**: Real-time mirroring of adjustments across symmetrical pattern pieces (e.g., Front/Back Hem).
- **Perpendicular Notch Logic**: Precision notch placement that remains perpendicular even on curved paths.
- **Advanced PDF Export**: Tiled export with calibration marks, grain lines, and multi-page support for physical printing.

### 🏭 Factory Management

- **Production Traceability**: Real-time tracking from Order Planning to Packing.
- **Multi-stage Workflow**: Planning → Cutting → Sewing → Finishing → QC → Packing.
- **Material Consumption DB**: Standardized consumption tracking per product variant and style history.
- **Quality Inspection**: Comprehensive inspection matrix with detailed fault logging and automated PDF reporting.
- **Handover Management**: Digital cutting-to-production handover logs with granular size/color tracking.

### 🛍️ Shop Management

- **Smart Distribution**: Automated size and color breakdown balancing for shop distribution.
- **Real-time Inventory**: Sync between factory output and shop stock levels.
- **Order Tracking**: Complete lifecycle management from placement to payment verification and delivery.
- **Payment Verification**: Digital payment slip upload with automated admin approval workflow.

### 📊 Finance & Analytics

- **Sales Performance**: Real-time dashboards for shop-wise and product-wise sales analytics.
- **Cost Tracking**: Material consumption vs. actual production cost analysis.
- **Production Metrics**: Daily output tracking and efficiency reporting.

### 🤖 Telegram Integration

- **Real-time Notifications**: Instant alerts for new orders, payment uploads, and dispatch status.
- **Visual Reports**: Automated PDF report generation with product snapshots sent directly to Telegram groups.
- **Multi-channel Support**: Dedicated channels for different factory departments and shop groups.

---

## 🔐 Security Features

- HTTPS/SSL encryption
- Secure password hashing (bcrypt)
- Role-based access control (Admin, Factory Manager, Shop Manager, Designer, Marketing)
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
- `material_consumption` - Historical consumption data
- `production_ledger` - Granular production and handover logs
- `shop_telegram_notifications` - Notification logs
- `telegram_groups` - Detected Telegram channels

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

- ✅ **CAD Tool Integration**: Fully functional 2D pattern editor for custom-fit garments.
- ✅ **One-click deployment scripts** for Linux and Windows.
- ✅ **Automated SSL certificate setup** and backup system.
- ✅ **Granular Production Tracking**: New size/color-level handover and ledger system.
- ✅ **Material Consumption Database**: Historical tracking for accurate costing.
- ✅ **Enhanced Quality Inspection Matrix**.
