#!/bin/bash

# Production deployment script for Factory-Shop-ERP

# Exit on any error
set -e

echo "Starting Factory-Shop-ERP production deployment..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
  echo "Error: package.json not found. Please run this script from the project root directory."
  exit 1
fi

# Create backups directory if it doesn't exist
mkdir -p backups

# Backup current database
echo "Backing up current database..."
node src/scripts/backup-database.js

# Install/Update dependencies
echo "Installing dependencies..."
npm ci

# Build the application
echo "Building the application..."
npm run build

# Check if build was successful
if [ ! -d ".next" ]; then
  echo "Error: Build failed. .next directory not found."
  exit 1
fi

echo "Build completed successfully."

# Create production start script
cat > start-production.sh << 'EOF'
#!/bin/bash
# Production start script for Factory-Shop-ERP

# Set environment variables
export NODE_ENV=production

# Start the application
npx next start
EOF

chmod +x start-production.sh

echo "Deployment completed successfully!"
echo ""
echo "To start the application, run:"
echo "  ./start-production.sh"
echo ""
echo "To start the application in the background:"
echo "  nohup ./start-production.sh > app.log 2>&1 &"