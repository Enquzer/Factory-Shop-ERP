#!/bin/bash

################################################################################
# Factory-Shop-ERP - Linux Production Deployment Script
# Author: Enquzer Getachew
# Description: Automated deployment script for Ubuntu/Debian servers
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should NOT be run as root/sudo"
        print_info "Run as a regular user. The script will ask for sudo when needed."
        exit 1
    fi
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

################################################################################
# Main Deployment Functions
################################################################################

welcome_banner() {
    clear
    echo -e "${GREEN}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        Factory-Shop-ERP Production Deployment Script         ║
║                                                               ║
║                    By Enquzer Getachew                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}\n"
    print_info "This script will set up your production environment automatically."
    print_warning "Make sure you have sudo privileges before continuing.\n"
    
    read -p "Press Enter to continue or Ctrl+C to cancel..."
}

collect_configuration() {
    print_header "Step 1: Configuration"
    
    # Domain configuration
    echo -e "${YELLOW}Enter your domain name (e.g., erp.yourdomain.com):${NC}"
    read -p "> " DOMAIN_NAME
    while [[ -z "$DOMAIN_NAME" ]]; do
        print_error "Domain name cannot be empty!"
        read -p "> " DOMAIN_NAME
    done
    
    # Telegram configuration
    echo -e "\n${YELLOW}Do you want to enable Telegram notifications? (y/n):${NC}"
    read -p "> " ENABLE_TELEGRAM
    
    if [[ "$ENABLE_TELEGRAM" =~ ^[Yy]$ ]]; then
        TELEGRAM_ENABLED="true"
        echo -e "\n${YELLOW}Enter your Telegram Bot Token:${NC}"
        echo -e "${BLUE}(Get it from @BotFather on Telegram)${NC}"
        read -p "> " TELEGRAM_BOT_TOKEN
        while [[ -z "$TELEGRAM_BOT_TOKEN" ]]; do
            print_error "Bot token cannot be empty!"
            read -p "> " TELEGRAM_BOT_TOKEN
        done
    else
        TELEGRAM_ENABLED="false"
        TELEGRAM_BOT_TOKEN=""
    fi
    
    # Gemini API (optional)
    echo -e "\n${YELLOW}Enter your Gemini API Key (optional, press Enter to skip):${NC}"
    read -p "> " GEMINI_API_KEY
    
    # Port configuration
    echo -e "\n${YELLOW}Enter application port (default: 3000):${NC}"
    read -p "> " APP_PORT
    APP_PORT=${APP_PORT:-3000}
    
    # SSL configuration
    echo -e "\n${YELLOW}Do you want to automatically obtain SSL certificate? (y/n):${NC}"
    echo -e "${BLUE}(Requires domain to be pointed to this server)${NC}"
    read -p "> " SETUP_SSL
    
    # Email for SSL
    if [[ "$SETUP_SSL" =~ ^[Yy]$ ]]; then
        echo -e "\n${YELLOW}Enter your email for SSL certificate:${NC}"
        read -p "> " SSL_EMAIL
        while [[ -z "$SSL_EMAIL" ]]; do
            print_error "Email cannot be empty for SSL setup!"
            read -p "> " SSL_EMAIL
        done
    fi
    
    # Confirmation
    echo -e "\n${GREEN}Configuration Summary:${NC}"
    echo -e "Domain: ${BLUE}$DOMAIN_NAME${NC}"
    echo -e "Port: ${BLUE}$APP_PORT${NC}"
    echo -e "Telegram: ${BLUE}$TELEGRAM_ENABLED${NC}"
    echo -e "SSL: ${BLUE}$([ "$SETUP_SSL" =~ ^[Yy]$ ] && echo "Yes" || echo "No")${NC}"
    echo ""
    read -p "Continue with this configuration? (y/n): " CONFIRM
    
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled."
        exit 0
    fi
}

install_system_dependencies() {
    print_header "Step 2: Installing System Dependencies"
    
    print_info "Updating package lists..."
    sudo apt update
    
    print_info "Installing required packages..."
    sudo apt install -y curl wget git build-essential python3 sqlite3
    
    print_success "System dependencies installed"
}

install_nodejs() {
    print_header "Step 3: Installing Node.js"
    
    if command_exists node; then
        NODE_VERSION=$(node -v)
        print_warning "Node.js $NODE_VERSION is already installed"
        read -p "Do you want to reinstall/update? (y/n): " REINSTALL_NODE
        if [[ ! "$REINSTALL_NODE" =~ ^[Yy]$ ]]; then
            print_info "Skipping Node.js installation"
            return
        fi
    fi
    
    print_info "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    
    NODE_VERSION=$(node -v)
    NPM_VERSION=$(npm -v)
    print_success "Node.js $NODE_VERSION and npm $NPM_VERSION installed"
}

install_pm2() {
    print_header "Step 4: Installing PM2 Process Manager"
    
    if command_exists pm2; then
        print_warning "PM2 is already installed"
        PM2_VERSION=$(pm2 -v)
        print_info "Current version: $PM2_VERSION"
    else
        print_info "Installing PM2 globally..."
        sudo npm install -g pm2
        print_success "PM2 installed successfully"
    fi
}

install_nginx() {
    print_header "Step 5: Installing Nginx"
    
    if command_exists nginx; then
        print_warning "Nginx is already installed"
        NGINX_VERSION=$(nginx -v 2>&1 | grep -oP '(?<=nginx/)[0-9.]+')
        print_info "Current version: $NGINX_VERSION"
    else
        print_info "Installing Nginx..."
        sudo apt install -y nginx
        sudo systemctl enable nginx
        print_success "Nginx installed and enabled"
    fi
}

setup_application() {
    print_header "Step 6: Setting Up Application"
    
    print_info "Installing npm dependencies..."
    npm install
    
    print_info "Creating necessary directories..."
    mkdir -p public/uploads
    mkdir -p public/telegram-pdfs
    mkdir -p db
    mkdir -p logs
    
    print_info "Setting up environment file..."
    cat > .env.production << EOF
# Production Environment Variables
NODE_ENV=production

# Server Configuration
NEXT_PUBLIC_BASE_URL=https://$DOMAIN_NAME
PORT=$APP_PORT

# Telegram Configuration
TELEGRAM_ENABLED=$TELEGRAM_ENABLED
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN

# Gemini AI (Optional)
GEMINI_API_KEY=$GEMINI_API_KEY

# Database
DATABASE_PATH=$SCRIPT_DIR/db/carement.db
EOF
    
    chmod 600 .env.production
    
    print_info "Building production bundle..."
    npm run build
    
    print_success "Application setup complete"
}

configure_nginx() {
    print_header "Step 7: Configuring Nginx"
    
    print_info "Creating Nginx configuration..."
    
    # Determine SSL configuration
    if [[ "$SETUP_SSL" =~ ^[Yy]$ ]]; then
        SSL_CERT_PATH="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
        SSL_KEY_PATH="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"
    else
        SSL_CERT_PATH="/path/to/your/certificate.crt"
        SSL_KEY_PATH="/path/to/your/private.key"
    fi
    
    sudo tee /etc/nginx/sites-available/factory-shop-erp > /dev/null << EOF
# Factory-Shop-ERP Nginx Configuration
# Generated by deployment script

server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    # SSL Configuration
    ssl_certificate $SSL_CERT_PATH;
    ssl_certificate_key $SSL_KEY_PATH;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Client Body Size
    client_max_body_size 50M;

    # Root Directory
    root $SCRIPT_DIR/public;
    index index.html;

    # Serve Static Files
    location /_next/static {
        alias $SCRIPT_DIR/.next/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Serve Uploads
    location /uploads {
        alias $SCRIPT_DIR/public/uploads;
        expires 1d;
        add_header Cache-Control "public";
    }

    # Serve Telegram PDFs
    location /telegram-pdfs {
        alias $SCRIPT_DIR/public/telegram-pdfs;
        expires 1d;
        add_header Cache-Control "public";
    }

    # Proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health Check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Error Pages
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/factory-shop-erp /etc/nginx/sites-enabled/
    
    # Remove default site if exists
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    print_info "Testing Nginx configuration..."
    if sudo nginx -t; then
        print_success "Nginx configuration is valid"
    else
        print_error "Nginx configuration has errors!"
        exit 1
    fi
}

setup_ssl() {
    if [[ ! "$SETUP_SSL" =~ ^[Yy]$ ]]; then
        print_warning "Skipping SSL setup (manual configuration required)"
        return
    fi
    
    print_header "Step 8: Setting Up SSL Certificate"
    
    if ! command_exists certbot; then
        print_info "Installing Certbot..."
        sudo apt install -y certbot python3-certbot-nginx
    fi
    
    print_info "Obtaining SSL certificate for $DOMAIN_NAME..."
    print_warning "Make sure your domain is pointing to this server!"
    
    sleep 2
    
    sudo certbot --nginx -d "$DOMAIN_NAME" -d "www.$DOMAIN_NAME" \
        --non-interactive --agree-tos --email "$SSL_EMAIL" \
        --redirect
    
    if [ $? -eq 0 ]; then
        print_success "SSL certificate obtained successfully"
        
        # Update Nginx config with real cert paths
        configure_nginx
        sudo systemctl reload nginx
    else
        print_error "Failed to obtain SSL certificate"
        print_warning "You can run 'sudo certbot --nginx' manually later"
    fi
}

setup_pm2() {
    print_header "Step 9: Setting Up PM2 Process Manager"
    
    print_info "Stopping any existing PM2 processes..."
    pm2 delete factory-shop-erp 2>/dev/null || true
    
    print_info "Starting application with PM2..."
    pm2 start ecosystem.config.js --env production
    
    print_info "Saving PM2 process list..."
    pm2 save
    
    print_info "Setting up PM2 startup script..."
    PM2_STARTUP_CMD=$(pm2 startup | tail -n 1)
    if [[ $PM2_STARTUP_CMD == sudo* ]]; then
        eval "$PM2_STARTUP_CMD"
    fi
    
    print_success "PM2 configured successfully"
}

setup_telegram_webhook() {
    if [[ "$TELEGRAM_ENABLED" != "true" ]] || [[ -z "$TELEGRAM_BOT_TOKEN" ]]; then
        print_warning "Skipping Telegram webhook setup (not enabled)"
        return
    fi
    
    print_header "Step 10: Configuring Telegram Webhook"
    
    WEBHOOK_URL="https://$DOMAIN_NAME/api/telegram/webhook"
    
    print_info "Setting webhook URL: $WEBHOOK_URL"
    
    RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"$WEBHOOK_URL\"}")
    
    if echo "$RESPONSE" | grep -q '"ok":true'; then
        print_success "Telegram webhook configured successfully"
        
        # Verify webhook
        print_info "Verifying webhook..."
        WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo")
        echo -e "${BLUE}$WEBHOOK_INFO${NC}"
    else
        print_error "Failed to set Telegram webhook"
        echo -e "${RED}Response: $RESPONSE${NC}"
        print_warning "You can configure it manually later"
    fi
}

setup_backup_cron() {
    print_header "Step 11: Setting Up Automated Backups"
    
    print_info "Creating backup script..."
    
    sudo tee /usr/local/bin/backup-erp-db.sh > /dev/null << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/factory-erp"
DB_PATH="$SCRIPT_DIR/db/carement.db"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR
cp \$DB_PATH "\$BACKUP_DIR/carement_\$DATE.db"

# Keep only last 30 days
find \$BACKUP_DIR -name "carement_*.db" -mtime +30 -delete

echo "[\$DATE] Database backup completed" >> \$BACKUP_DIR/backup.log
EOF
    
    sudo chmod +x /usr/local/bin/backup-erp-db.sh
    
    print_info "Setting up daily backup cron job (2 AM)..."
    
    # Add to crontab if not exists
    (crontab -l 2>/dev/null | grep -v "backup-erp-db.sh"; echo "0 2 * * * /usr/local/bin/backup-erp-db.sh") | crontab -
    
    print_success "Automated backups configured"
}

set_permissions() {
    print_header "Step 12: Setting File Permissions"
    
    print_info "Setting correct ownership and permissions..."
    
    # Set ownership (current user)
    sudo chown -R $USER:$USER "$SCRIPT_DIR"
    
    # Set directory permissions
    find "$SCRIPT_DIR" -type d -exec chmod 755 {} \;
    
    # Set file permissions
    find "$SCRIPT_DIR" -type f -exec chmod 644 {} \;
    
    # Make scripts executable
    chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null || true
    
    # Writable directories
    chmod -R 775 "$SCRIPT_DIR/public/uploads"
    chmod -R 775 "$SCRIPT_DIR/public/telegram-pdfs"
    chmod -R 775 "$SCRIPT_DIR/db"
    chmod -R 775 "$SCRIPT_DIR/logs"
    
    print_success "Permissions set correctly"
}

start_services() {
    print_header "Step 13: Starting Services"
    
    print_info "Reloading Nginx..."
    sudo systemctl reload nginx
    
    print_info "Checking PM2 status..."
    pm2 status
    
    print_success "All services started"
}

run_health_checks() {
    print_header "Step 14: Running Health Checks"
    
    sleep 3
    
    # Check if app is running
    print_info "Checking application status..."
    if pm2 list | grep -q "factory-shop-erp.*online"; then
        print_success "Application is running"
    else
        print_error "Application is not running!"
        pm2 logs factory-shop-erp --lines 20
        exit 1
    fi
    
    # Check Nginx
    print_info "Checking Nginx status..."
    if sudo systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_error "Nginx is not running!"
        exit 1
    fi
    
    # Check local endpoint
    print_info "Checking local endpoint..."
    if curl -s http://localhost:$APP_PORT > /dev/null; then
        print_success "Application responds on port $APP_PORT"
    else
        print_warning "Application not responding on port $APP_PORT"
    fi
    
    # Check database
    print_info "Checking database..."
    if [ -f "$SCRIPT_DIR/db/carement.db" ]; then
        DB_SIZE=$(du -h "$SCRIPT_DIR/db/carement.db" | cut -f1)
        print_success "Database exists (Size: $DB_SIZE)"
    else
        print_warning "Database file not found (will be created on first run)"
    fi
}

display_completion_info() {
    print_header "🎉 Deployment Complete!"
    
    echo -e "${GREEN}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              Deployment Completed Successfully!              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}\n"
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Application Information:${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "🌐 URL: ${GREEN}https://$DOMAIN_NAME${NC}"
    echo -e "📂 Path: ${BLUE}$SCRIPT_DIR${NC}"
    echo -e "🔌 Port: ${BLUE}$APP_PORT${NC}"
    echo -e "💾 Database: ${BLUE}$SCRIPT_DIR/db/carement.db${NC}"
    
    if [[ "$TELEGRAM_ENABLED" == "true" ]]; then
        echo -e "📱 Telegram: ${GREEN}Enabled${NC}"
        echo -e "   Webhook: ${BLUE}https://$DOMAIN_NAME/api/telegram/webhook${NC}"
    else
        echo -e "📱 Telegram: ${YELLOW}Disabled${NC}"
    fi
    
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Useful Commands:${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "View logs:        ${YELLOW}pm2 logs factory-shop-erp${NC}"
    echo -e "Restart app:      ${YELLOW}pm2 restart factory-shop-erp${NC}"
    echo -e "Stop app:         ${YELLOW}pm2 stop factory-shop-erp${NC}"
    echo -e "App status:       ${YELLOW}pm2 status${NC}"
    echo -e "Monitor app:      ${YELLOW}pm2 monit${NC}"
    echo -e "Nginx reload:     ${YELLOW}sudo systemctl reload nginx${NC}"
    echo -e "Nginx logs:       ${YELLOW}sudo tail -f /var/log/nginx/error.log${NC}"
    echo -e "Database backup:  ${YELLOW}/usr/local/bin/backup-erp-db.sh${NC}"
    
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Next Steps:${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "1. Visit ${GREEN}https://$DOMAIN_NAME${NC} to access your application"
    echo -e "2. Login with your credentials"
    
    if [[ "$TELEGRAM_ENABLED" == "true" ]]; then
        echo -e "3. Configure shop Telegram channels in Settings"
        echo -e "4. Test Telegram notifications"
    fi
    
    if [[ ! "$SETUP_SSL" =~ ^[Yy]$ ]]; then
        echo -e "\n${YELLOW}⚠ SSL Certificate:${NC}"
        echo -e "You chose to skip SSL setup. To configure it later, run:"
        echo -e "${BLUE}sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME${NC}"
    fi
    
    echo -e "\n${GREEN}✓ Your Factory-Shop-ERP is now live and ready to use!${NC}\n"
}

################################################################################
# Main Execution
################################################################################

main() {
    check_root
    welcome_banner
    collect_configuration
    install_system_dependencies
    install_nodejs
    install_pm2
    install_nginx
    setup_application
    configure_nginx
    setup_ssl
    setup_pm2
    setup_telegram_webhook
    setup_backup_cron
    set_permissions
    start_services
    run_health_checks
    display_completion_info
}

# Run main function
main "$@"
