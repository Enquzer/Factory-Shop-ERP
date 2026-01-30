# Phase 1: Foundation Implementation (Weeks 1-2)

## Overview
Phase 1 focuses on establishing the core infrastructure and foundation for the ERP system. This includes server setup, security configuration, database initialization, and basic system components.

## Week 1: Environment Setup

### Task 1.1: Server Provisioning and Security Hardening

#### Server Requirements
- **Operating System**: Ubuntu 20.04 LTS or Windows Server 2019+
- **CPU**: 4 cores minimum
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 500GB SSD minimum
- **Network**: 100Mbps bandwidth

#### Security Hardening Steps

**Linux Server Configuration:**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install security tools
sudo apt install -y fail2ban ufw logwatch

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Secure SSH
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
# Set: AllowUsers your_username

sudo systemctl restart ssh
```

**Windows Server Configuration:**
```powershell
# Enable Windows Defender Firewall
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True

# Configure inbound rules
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
New-NetFirewallRule -DisplayName "SSH" -Direction Inbound -Protocol TCP -LocalPort 22 -Action Allow

# Disable unnecessary services
Get-Service | Where-Object {$_.Name -like "*telnet*" -or $_.Name -like "*ftp*"} | Stop-Service
```

#### User Account Management
```bash
# Create service account
sudo adduser erp-service
sudo usermod -aG sudo erp-service

# Set up SSH keys
ssh-keygen -t rsa -b 4096
ssh-copy-id erp-service@server-ip
```

### Task 1.2: Domain Configuration and SSL Setup

#### Domain Setup Process
1. **DNS Configuration**
   - Point A record to server IP
   - Configure CNAME for www subdomain
   - Set up MX records for email (if needed)

2. **SSL Certificate Installation (Let's Encrypt)**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal setup
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Reverse proxy to Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Task 1.3: Database Initialization and Schema Deployment

#### SQLite Database Setup
```bash
# Create database directory
mkdir -p /var/www/Factory-Shop-ERP/db
chmod 755 /var/www/Factory-Shop-ERP/db

# Initialize database
sqlite3 /var/www/Factory-Shop-ERP/db/carement.db <<EOF
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    profilePictureUrl TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Shops table
CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ownerName TEXT NOT NULL,
    phoneNumber TEXT,
    address TEXT,
    telegramChannelId TEXT,
    isActive BOOLEAN DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    basePrice REAL,
    isActive BOOLEAN DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shopId INTEGER,
    orderNumber TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    totalAmount REAL,
    paymentStatus TEXT DEFAULT 'unpaid',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shopId) REFERENCES shops(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_shops_telegram ON shops(telegramChannelId);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shopId);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Insert default admin user
INSERT OR IGNORE INTO users (username, password, role) 
VALUES ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', 'factory');
EOF
```

#### Database Backup Configuration
```bash
# Create backup script
cat > /usr/local/bin/backup-erp-db.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/factory-erp"
DB_PATH="/var/www/Factory-Shop-ERP/db/carement.db"

mkdir -p $BACKUP_DIR
cp $DB_PATH $BACKUP_DIR/carement_backup_$DATE.db
gzip $BACKUP_DIR/carement_backup_$DATE.db

# Keep only last 30 days of backups
find $BACKUP_DIR -name "carement_backup_*.db.gz" -mtime +30 -delete

# Log backup
echo "[$(date)] Database backup completed: carement_backup_$DATE.db.gz" >> /var/log/erp-backup.log
EOF

chmod +x /usr/local/bin/backup-erp-db.sh

# Schedule daily backups
echo "0 2 * * * /usr/local/bin/backup-erp-db.sh" | crontab -
```

### Task 1.4: User Role System Implementation

#### Role Definitions
```typescript
// src/lib/roles.ts
export type UserRole = 
  | 'factory'           // Factory administrator
  | 'shop'             // Shop owner/manager
  | 'store'            // Store keeper
  | 'finance'          // Finance department
  | 'planning'         // Production planning
  | 'cutting'          // Cutting department
  | 'sewing'           // Sewing department
  | 'finishing'        // Finishing department
  | 'packing'          // Packing department
  | 'quality_inspection' // Quality control
  | 'marketing'        // Marketing department
  | 'designer'         // Designer
  | 'admin';           // System administrator

export interface RolePermissions {
  canViewDashboard: boolean;
  canManageUsers: boolean;
  canManageProducts: boolean;
  canManageOrders: boolean;
  canManageInventory: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canViewDashboard: true,
    canManageUsers: true,
    canManageProducts: true,
    canManageOrders: true,
    canManageInventory: true,
    canViewReports: true,
    canManageSettings: true
  },
  factory: {
    canViewDashboard: true,
    canManageUsers: false,
    canManageProducts: true,
    canManageOrders: true,
    canManageInventory: true,
    canViewReports: true,
    canManageSettings: false
  },
  shop: {
    canViewDashboard: true,
    canManageUsers: false,
    canManageProducts: false,
    canManageOrders: true,
    canManageInventory: true,
    canViewReports: true,
    canManageSettings: false
  },
  // ... other roles
};
```

#### Database Schema Updates
```sql
-- Add roles and permissions table
CREATE TABLE IF NOT EXISTS user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    role TEXT NOT NULL,
    permissions TEXT, -- JSON string of permissions
    assignedBy INTEGER,
    assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (assignedBy) REFERENCES users(id)
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    displayName TEXT NOT NULL,
    description TEXT,
    permissions TEXT, -- JSON permissions structure
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT OR IGNORE INTO roles (name, displayName, description, permissions) VALUES
('factory', 'Factory Admin', 'Factory administrator with full factory access', '{"dashboard":true,"products":true,"orders":true,"inventory":true,"reports":true}'),
('shop', 'Shop Owner', 'Shop owner with shop management access', '{"dashboard":true,"orders":true,"inventory":true,"reports":true}'),
('store', 'Store Keeper', 'Store management access', '{"dashboard":true,"inventory":true,"materials":true}'),
('finance', 'Finance Manager', 'Financial operations access', '{"dashboard":true,"orders":true,"payments":true,"reports":true}');
```

### Task 1.5: Basic Authentication Framework

#### Authentication API Endpoints
```typescript
// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { createToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password required' },
        { status: 400 }
      );
    }
    
    // Database query (pseudo-code)
    const user = await db.getUserByUsername(username);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isValid = await compare(password, user.password);
    
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Create JWT token
    const token = createToken(user);
    
    // Return success response
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
      { status: 500 }
    );
  }
}
```

#### Authentication Context
```typescript
// src/contexts/auth-context.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  role: string;
  profilePictureUrl?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setUser(result.user);
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('token', result.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

## Week 2: Core Infrastructure

### Task 2.1: Telegram Bot Integration

#### Telegram Bot Setup
```typescript
// src/lib/telegram.ts
import TelegramBot from 'node-telegram-bot-api';

class TelegramService {
  private bot: TelegramBot;
  private isEnabled: boolean;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    this.isEnabled = process.env.TELEGRAM_ENABLED === 'true';
    
    if (this.isEnabled && token) {
      this.bot = new TelegramBot(token, { polling: true });
      this.setupWebhook();
    }
  }

  private async setupWebhook() {
    if (!this.bot) return;
    
    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/telegram/webhook`;
    try {
      await this.bot.setWebHook(webhookUrl);
      console.log('Telegram webhook configured successfully');
    } catch (error) {
      console.error('Failed to set Telegram webhook:', error);
    }
  }

  async sendMessage(chatId: string, message: string, options?: any) {
    if (!this.isEnabled || !this.bot) return;
    
    try {
      await this.bot.sendMessage(chatId, message, options);
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
    }
  }

  async sendDocument(chatId: string, documentPath: string, caption?: string) {
    if (!this.isEnabled || !this.bot) return;
    
    try {
      await this.bot.sendDocument(chatId, documentPath, { caption });
    } catch (error) {
      console.error('Failed to send Telegram document:', error);
    }
  }
}

export const telegramService = new TelegramService();
```

#### Webhook Endpoint
```typescript
// src/app/api/telegram/webhook/route.ts
import { NextResponse } from 'next/server';
import { telegramService } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const update = await request.json();
    
    // Handle different update types
    if (update.message) {
      await handleTextMessage(update.message);
    } else if (update.my_chat_member) {
      await handleChatMemberUpdate(update.my_chat_member);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

async function handleTextMessage(message: any) {
  const chatId = message.chat.id;
  const text = message.text;
  
  // Handle commands
  if (text === '/start') {
    await telegramService.sendMessage(chatId, 'Welcome to Factory-Shop ERP Bot!');
  } else if (text === '/getid') {
    await telegramService.sendMessage(chatId, `Chat ID: ${chatId}`);
  }
}

async function handleChatMemberUpdate(update: any) {
  // Handle bot being added to groups
  if (update.new_chat_member?.status === 'member') {
    const chatId = update.chat.id;
    const chatTitle = update.chat.title;
    
    // Save to database
    await db.saveTelegramGroup(chatId, chatTitle);
    
    await telegramService.sendMessage(
      chatId, 
      `Thank you for adding me to ${chatTitle}! I'm now ready to send notifications.`
    );
  }
}
```

### Task 2.2: Backup System Configuration

#### Automated Backup Implementation
```bash
#!/bin/bash
# backup-system.sh

# Configuration
BACKUP_DIR="/var/backups/factory-erp"
SOURCE_DIR="/var/www/Factory-Shop-ERP"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
sqlite3 $SOURCE_DIR/db/carement.db ".backup $BACKUP_DIR/db_backup_$DATE.db"

# Application files backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C $SOURCE_DIR .

# Uploads directory backup
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz -C $SOURCE_DIR/public/uploads .

# Logs backup
tar -czf $BACKUP_DIR/logs_backup_$DATE.tar.gz -C $SOURCE_DIR/logs .

# Cleanup old backups
find $BACKUP_DIR -name "*.db" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Log completion
echo "[$(date)] Backup completed successfully" >> /var/log/erp-backup.log
```

#### Backup Monitoring
```typescript
// src/app/api/backup/status/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const backupDir = '/var/backups/factory-erp';
    const files = await fs.readdir(backupDir);
    
    const backupInfo = files
      .filter(file => file.endsWith('.db') || file.endsWith('.tar.gz'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          createdAt: stats.mtime
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return NextResponse.json({
      success: true,
      backups: backupInfo,
      totalBackups: backupInfo.length
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve backup status' },
      { status: 500 }
    );
  }
}
```

### Task 2.3: Monitoring and Logging Setup

#### PM2 Process Management
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'factory-shop-erp',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

#### Application Logging
```typescript
// src/lib/logger.ts
import fs from 'fs/promises';
import path from 'path';

class Logger {
  private logDir: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  private async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  private async writeLog(level: string, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      meta
    };

    const logFile = path.join(this.logDir, `${level}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  async info(message: string, meta?: any) {
    await this.writeLog('info', message, meta);
  }

  async error(message: string, meta?: any) {
    await this.writeLog('error', message, meta);
  }

  async warn(message: string, meta?: any) {
    await this.writeLog('warn', message, meta);
  }

  async debug(message: string, meta?: any) {
    await this.writeLog('debug', message, meta);
  }
}

export const logger = new Logger();
```

### Task 2.4: Basic Dashboard Implementation

#### Dashboard Component Structure
```typescript
// src/app/(app)/dashboard/page.tsx
'use client';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  
  // Sample data - would come from API in real implementation
  const orderData = [
    { name: 'Jan', orders: 45 },
    { name: 'Feb', orders: 52 },
    { name: 'Mar', orders: 48 },
    { name: 'Apr', orders: 61 },
    { name: 'May', orders: 55 },
    { name: 'Jun', orders: 67 }
  ];

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard - Welcome, {user.username}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">1,234</div>
            <p className="text-sm text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Active Shops</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">45</div>
            <p className="text-sm text-muted-foreground">+3 new this month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">156</div>
            <p className="text-sm text-muted-foreground">12 low stock items</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">ETB 245K</div>
            <p className="text-sm text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Orders Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={orderData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="ml-4">
                  <p className="text-sm font-medium">New order #ORD-12345</p>
                  <p className="text-sm text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="ml-4">
                  <p className="text-sm font-medium">Payment verified for Shop ABC</p>
                  <p className="text-sm text-muted-foreground">5 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### Task 2.5: Navigation Framework Completion

#### Enhanced Navigation Component
```typescript
// src/components/nav.tsx (enhanced version)
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  User, 
  ClipboardList, 
  FileText, 
  Bell, 
  Factory, 
  BarChart3 
} from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { ROLE_PERMISSIONS } from '@/lib/roles';

const navigationLinks = {
  factory: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/products', label: 'Products', icon: Package, permission: 'canManageProducts' },
    { href: '/inventory', label: 'Inventory', icon: ClipboardList, permission: 'canManageInventory' },
    { href: '/orders', label: 'Orders', icon: ShoppingCart, permission: 'canManageOrders' },
    { href: '/reports', label: 'Reports', icon: FileText, permission: 'canViewReports' },
    { href: '/users', label: 'Users', icon: User, permission: 'canManageUsers' }
  ],
  shop: [
    { href: '/shop/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/shop/orders', label: 'My Orders', icon: ShoppingCart },
    { href: '/shop/products', label: 'Products', icon: Package },
    { href: '/shop/inventory', label: 'My Inventory', icon: ClipboardList }
  ],
  // ... other role configurations
};

export function Nav() {
  const pathname = usePathname();
  const { user } = useAuth();
  
  if (!user) return null;
  
  const userRole = user.role as keyof typeof ROLE_PERMISSIONS;
  const permissions = ROLE_PERMISSIONS[userRole];
  const links = navigationLinks[userRole as keyof typeof navigationLinks] || [];
  
  // Filter links based on permissions
  const filteredLinks = links.filter(link => {
    if (!link.permission) return true;
    return permissions[link.permission as keyof typeof permissions];
  });

  return (
    <SidebarMenu>
      {filteredLinks.map((link) => (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === link.href}
          >
            <Link href={link.href}>
              <link.icon className="h-4 w-4" />
              <span>{link.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
```

## Phase 1 Completion Checklist

### Week 1 Tasks
- [x] Server provisioning and security hardening
- [x] Domain configuration and SSL setup
- [x] Database initialization and schema deployment
- [x] User role system implementation
- [x] Basic authentication framework

### Week 2 Tasks
- [x] Telegram bot integration and webhook setup
- [x] Backup system configuration
- [x] Monitoring and logging setup
- [x] Basic dashboard implementation
- [x] Navigation framework completion

### Quality Assurance
- [ ] Security audit completed
- [ ] Performance testing conducted
- [ ] Backup restoration tested
- [ ] User authentication verified
- [ ] Dashboard functionality validated

### Documentation
- [ ] Technical documentation updated
- [ ] User guides created
- [ ] API documentation completed
- [ ] Deployment procedures documented

## Next Phase Preparation

- Review Phase 1 deliverables
- Conduct retrospective meeting
- Prepare for Phase 2 implementation
- Update project timeline and resources

**Phase 1 Status**: Implementation in progress
**Completion Target**: February 13, 2026
**Team Lead**: [To be assigned]