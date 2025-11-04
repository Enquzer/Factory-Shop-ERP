# Factory-Shop-ERP Production Readiness Guide

## Overview
This document outlines the steps and considerations for deploying the Factory-Shop-ERP application to a production environment. The application is built with Next.js and uses SQLite for data storage.

## Prerequisites
- Node.js 18.x or higher
- npm 8.x or higher
- Access to production server with SSH/SFTP
- Domain name and SSL certificate
- Firewall access rules configuration

## Environment Setup

### 1. Server Requirements
- Minimum 2GB RAM
- Minimum 20GB disk space
- Ubuntu 20.04 LTS or equivalent
- Non-root user with sudo privileges

### 2. Software Installation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 process manager
sudo npm install -g pm2

# Install SQLite (if not already installed)
sudo apt install sqlite3 -y
```

## Deployment Process

### 1. Code Deployment
1. Clone or transfer the application code to the production server
2. Install dependencies:
   ```bash
   npm ci
   ```
3. Build the application:
   ```bash
   npm run build
   ```

### 2. Environment Configuration
1. Create a `.env.production` file with appropriate values:
   ```env
   NODE_ENV=production
   NEXT_PUBLIC_BASE_URL=https://yourdomain.com
   PORT=3000
   GEMINI_API_KEY=your_production_api_key
   ```
2. Ensure the database file is in the correct location (`db/carement.db`)

### 3. Process Management
Use PM2 to manage the application process:
```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set PM2 to start on system boot
pm2 startup
```

## Security Considerations

### 1. HTTPS/SSL
- Obtain SSL certificate through Let's Encrypt or purchase commercial certificate
- Configure reverse proxy (Nginx) to terminate SSL

### 2. Firewall Configuration
- Allow only necessary ports (80, 443, 22)
- Restrict database access to localhost only

### 3. Application Security
- Ensure all environment variables are properly secured
- Regularly update dependencies
- Implement proper authentication and authorization
- Use rate limiting to prevent abuse

## Performance Optimization

### 1. Next.js Optimization
- Enable compression in reverse proxy
- Configure proper caching headers
- Use image optimization features

### 2. Database Optimization
- Regular database maintenance
- Index optimization for frequently queried fields
- Monitor query performance

### 3. Static Assets
- Serve static assets through CDN if possible
- Enable browser caching for static files

## Monitoring and Logging

### 1. Application Monitoring
- Set up PM2 monitoring
- Configure error tracking
- Implement health check endpoints

### 2. Log Management
- Centralize application logs
- Set up log rotation
- Monitor for errors and anomalies

## Backup and Recovery

### 1. Database Backup
- Automated daily backups using the provided script
- Store backups in secure, offsite location
- Regularly test restore procedures

### 2. Code Backup
- Use version control (Git) for code management
- Regular backups of the entire application directory

## Maintenance Procedures

### 1. Regular Updates
- Update Node.js and npm regularly
- Update application dependencies
- Apply security patches

### 2. Database Maintenance
- Regular database integrity checks
- Optimize database performance
- Monitor database size and growth

### 3. Performance Monitoring
- Monitor application response times
- Track resource utilization
- Identify and resolve bottlenecks

## Troubleshooting

### Common Issues
1. **Application fails to start**: Check PM2 logs for error details
2. **Database connection issues**: Verify database file permissions and path
3. **Slow performance**: Check server resources and database query performance

### Support
For issues not covered in this document, contact the development team or refer to the Next.js documentation.