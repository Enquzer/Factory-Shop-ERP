@echo off
REM Production deployment script for Factory-Shop-ERP

echo Starting Factory-Shop-ERP production deployment...

REM Check if we're in the correct directory
if not exist "package.json" (
  echo Error: package.json not found. Please run this script from the project root directory.
  pause
  exit /b 1
)

REM Create backups directory if it doesn't exist
if not exist "backups" (
  mkdir backups
)

REM Backup current database
echo Backing up current database...
node src/scripts/backup-database.js

REM Install/Update dependencies
echo Installing dependencies...
npm ci

REM Build the application
echo Building the application...
npm run build

REM Check if build was successful
if not exist ".next" (
  echo Error: Build failed. .next directory not found.
  pause
  exit /b 1
)

echo Build completed successfully.

REM Create production start script
(
  echo @echo off
  echo REM Production start script for Factory-Shop-ERP
  echo.
  echo REM Set environment variables
  echo set NODE_ENV=production
  echo.
  echo REM Start the application
  echo npx next start
) > start-production.bat

echo Deployment completed successfully!
echo.
echo To start the application, run:
echo   start-production.bat
echo.
echo Press any key to continue...
pause >nul