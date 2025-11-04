# Factory-Shop-ERP Production Deployment Checklist

## Environment Configuration

### 1. Environment Variables
- [ ] Set `NODE_ENV=production`
- [ ] Configure `NEXT_PUBLIC_BASE_URL` to your production domain
- [ ] Set `PORT` if different from default (3000)
- [ ] Configure `GEMINI_API_KEY` for AI features
- [ ] Set database path if different from default

### 2. Security Configuration
- [ ] Update allowed origins in middleware for production domains
- [ ] Ensure HTTPS is configured
- [ ] Set up proper CORS headers
- [ ] Configure rate limiting for production traffic

## Build Process

### 3. Application Build
- [ ] Run `npm run build` to create optimized production build
- [ ] Verify build completes without errors
- [ ] Check that all static assets are properly bundled

### 4. Database Preparation
- [ ] Ensure production database is properly initialized
- [ ] Set up automated backup procedures
- [ ] Verify database permissions and security

## Deployment

### 5. Server Configuration
- [ ] Set up reverse proxy (Nginx/Apache) if needed
- [ ] Configure SSL certificates
- [ ] Set up process manager (PM2) for application monitoring
- [ ] Configure firewall rules

### 6. Performance Optimization
- [ ] Enable compression (gzip/brotli)
- [ ] Configure caching headers
- [ ] Set up CDN for static assets if needed
- [ ] Optimize database queries

### 7. Monitoring & Logging
- [ ] Set up application logging
- [ ] Configure error tracking
- [ ] Set up performance monitoring
- [ ] Configure health check endpoints

## Post-Deployment

### 8. Verification
- [ ] Test all critical user flows
- [ ] Verify authentication works correctly
- [ ] Test PDF generation functionality
- [ ] Check database operations
- [ ] Verify file upload functionality

### 9. Backup & Recovery
- [ ] Test backup procedures
- [ ] Verify restore procedures
- [ ] Set up automated backup schedule

## Maintenance

### 10. Ongoing Operations
- [ ] Monitor application performance
- [ ] Regular security updates
- [ ] Database maintenance
- [ ] Log rotation and cleanup