################################################################################
# Factory-Shop-ERP - Windows Production Deployment Script
# Author: Enquzer Getachew
# Description: Automated deployment script for Windows Server
################################################################################

# Requires PowerShell 5.1 or higher
#Requires -Version 5.1

# Set error action preference
$ErrorActionPreference = "Stop"

# Script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

################################################################################
# Helper Functions
################################################################################

function Write-Header {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "========================================`n" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-CommandExists {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

################################################################################
# Main Deployment Functions
################################################################################

function Show-WelcomeBanner {
    Clear-Host
    Write-Host @"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        Factory-Shop-ERP Production Deployment Script         ║
║                                                               ║
║                    By Enquzer Getachew                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green

    Write-Host "`n"
    Write-Info "This script will set up your production environment automatically."
    Write-Warning "Make sure you have Administrator privileges before continuing.`n"
    
    if (-not (Test-Administrator)) {
        Write-Error "This script must be run as Administrator!"
        Write-Info "Right-click PowerShell and select 'Run as Administrator'"
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    Write-Success "Running with Administrator privileges"
    Read-Host "`nPress Enter to continue or Ctrl+C to cancel"
}

function Get-Configuration {
    Write-Header "Step 1: Configuration"
    
    # Domain configuration
    Write-Host "Enter your domain name (e.g., erp.yourdomain.com):" -ForegroundColor Yellow
    do {
        $script:DomainName = Read-Host ">"
        if ([string]::IsNullOrWhiteSpace($script:DomainName)) {
            Write-Error "Domain name cannot be empty!"
        }
    } while ([string]::IsNullOrWhiteSpace($script:DomainName))
    
    # Telegram configuration
    Write-Host "`nDo you want to enable Telegram notifications? (Y/N):" -ForegroundColor Yellow
    $enableTelegram = Read-Host ">"
    
    if ($enableTelegram -match '^[Yy]') {
        $script:TelegramEnabled = "true"
        Write-Host "`nEnter your Telegram Bot Token:" -ForegroundColor Yellow
        Write-Host "(Get it from @BotFather on Telegram)" -ForegroundColor Cyan
        do {
            $script:TelegramBotToken = Read-Host ">"
            if ([string]::IsNullOrWhiteSpace($script:TelegramBotToken)) {
                Write-Error "Bot token cannot be empty!"
            }
        } while ([string]::IsNullOrWhiteSpace($script:TelegramBotToken))
    } else {
        $script:TelegramEnabled = "false"
        $script:TelegramBotToken = ""
    }
    
    # Gemini API (optional)
    Write-Host "`nEnter your Gemini API Key (optional, press Enter to skip):" -ForegroundColor Yellow
    $script:GeminiApiKey = Read-Host ">"
    
    # Port configuration
    Write-Host "`nEnter application port (default: 3000):" -ForegroundColor Yellow
    $portInput = Read-Host ">"
    $script:AppPort = if ([string]::IsNullOrWhiteSpace($portInput)) { 3000 } else { [int]$portInput }
    
    # IIS configuration
    Write-Host "`nDo you want to configure IIS as reverse proxy? (Y/N):" -ForegroundColor Yellow
    Write-Host "(Recommended for production)" -ForegroundColor Cyan
    $script:SetupIIS = Read-Host ">"
    
    # Confirmation
    Write-Host "`nConfiguration Summary:" -ForegroundColor Green
    Write-Host "Domain: " -NoNewline; Write-Host $script:DomainName -ForegroundColor Blue
    Write-Host "Port: " -NoNewline; Write-Host $script:AppPort -ForegroundColor Blue
    Write-Host "Telegram: " -NoNewline; Write-Host $script:TelegramEnabled -ForegroundColor Blue
    Write-Host "IIS: " -NoNewline; Write-Host $(if ($script:SetupIIS -match '^[Yy]') { "Yes" } else { "No" }) -ForegroundColor Blue
    
    $confirm = Read-Host "`nContinue with this configuration? (Y/N)"
    if ($confirm -notmatch '^[Yy]') {
        Write-Error "Deployment cancelled."
        exit 0
    }
}

function Install-NodeJS {
    Write-Header "Step 2: Installing Node.js"
    
    if (Test-CommandExists "node") {
        $nodeVersion = node -v
        Write-Warning "Node.js $nodeVersion is already installed"
        $reinstall = Read-Host "Do you want to reinstall/update? (Y/N)"
        if ($reinstall -notmatch '^[Yy]') {
            Write-Info "Skipping Node.js installation"
            return
        }
    }
    
    Write-Info "Downloading Node.js 20.x LTS installer..."
    $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    $installerPath = "$env:TEMP\node-installer.msi"
    
    try {
        Invoke-WebRequest -Uri $nodeUrl -OutFile $installerPath -UseBasicParsing
        Write-Info "Installing Node.js..."
        Start-Process msiexec.exe -ArgumentList "/i `"$installerPath`" /quiet /norestart" -Wait
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        $nodeVersion = node -v
        $npmVersion = npm -v
        Write-Success "Node.js $nodeVersion and npm $npmVersion installed"
    } catch {
        Write-Error "Failed to install Node.js: $_"
        Write-Info "Please install Node.js manually from https://nodejs.org/"
        exit 1
    } finally {
        Remove-Item $installerPath -ErrorAction SilentlyContinue
    }
}

function Install-PM2 {
    Write-Header "Step 3: Installing PM2 Process Manager"
    
    if (Test-CommandExists "pm2") {
        Write-Warning "PM2 is already installed"
        $pm2Version = pm2 -v
        Write-Info "Current version: $pm2Version"
    } else {
        Write-Info "Installing PM2 globally..."
        npm install -g pm2
        npm install -g pm2-windows-startup
        Write-Success "PM2 installed successfully"
    }
    
    # Setup PM2 Windows service
    Write-Info "Configuring PM2 as Windows service..."
    try {
        pm2-startup install
        Write-Success "PM2 Windows service configured"
    } catch {
        Write-Warning "PM2 startup configuration failed (may already be configured)"
    }
}

function Install-IIS {
    if ($script:SetupIIS -notmatch '^[Yy]') {
        Write-Warning "Skipping IIS installation"
        return
    }
    
    Write-Header "Step 4: Installing IIS"
    
    Write-Info "Checking IIS installation..."
    $iisFeature = Get-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
    
    if ($iisFeature.State -eq "Enabled") {
        Write-Success "IIS is already installed"
    } else {
        Write-Info "Installing IIS..."
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -All -NoRestart
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer -All -NoRestart
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures -All -NoRestart
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpErrors -All -NoRestart
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-ApplicationDevelopment -All -NoRestart
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-HealthAndDiagnostics -All -NoRestart
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-Performance -All -NoRestart
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-Security -All -NoRestart
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-RequestFiltering -All -NoRestart
        Write-Success "IIS installed successfully"
    }
    
    # Install URL Rewrite module
    Write-Info "Installing IIS URL Rewrite module..."
    $urlRewriteUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
    $rewriteInstaller = "$env:TEMP\urlrewrite.msi"
    
    try {
        Invoke-WebRequest -Uri $urlRewriteUrl -OutFile $rewriteInstaller -UseBasicParsing
        Start-Process msiexec.exe -ArgumentList "/i `"$rewriteInstaller`" /quiet /norestart" -Wait
        Write-Success "URL Rewrite module installed"
    } catch {
        Write-Warning "Failed to install URL Rewrite module (may already be installed)"
    } finally {
        Remove-Item $rewriteInstaller -ErrorAction SilentlyContinue
    }
}

function Setup-Application {
    Write-Header "Step 5: Setting Up Application"
    
    Write-Info "Installing npm dependencies..."
    npm install
    
    Write-Info "Creating necessary directories..."
    @("public\uploads", "public\telegram-pdfs", "db", "logs") | ForEach-Object {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
    
    Write-Info "Setting up environment file..."
    $envContent = @"
# Production Environment Variables
NODE_ENV=production

# Server Configuration
NEXT_PUBLIC_BASE_URL=https://$($script:DomainName)
PORT=$($script:AppPort)

# Telegram Configuration
TELEGRAM_ENABLED=$($script:TelegramEnabled)
TELEGRAM_BOT_TOKEN=$($script:TelegramBotToken)

# Gemini AI (Optional)
GEMINI_API_KEY=$($script:GeminiApiKey)

# Database
DATABASE_PATH=$ScriptDir\db\carement.db
"@
    
    Set-Content -Path ".env.production" -Value $envContent
    
    Write-Info "Building production bundle..."
    npm run build
    
    Write-Success "Application setup complete"
}

function Configure-IIS {
    if ($script:SetupIIS -notmatch '^[Yy]') {
        Write-Warning "Skipping IIS configuration"
        return
    }
    
    Write-Header "Step 6: Configuring IIS"
    
    Import-Module WebAdministration
    
    $siteName = "Factory-Shop-ERP"
    $appPoolName = "Factory-Shop-ERP-Pool"
    
    # Create Application Pool
    Write-Info "Creating application pool..."
    if (Test-Path "IIS:\AppPools\$appPoolName") {
        Remove-WebAppPool -Name $appPoolName
    }
    New-WebAppPool -Name $appPoolName
    Set-ItemProperty "IIS:\AppPools\$appPoolName" -Name "managedRuntimeVersion" -Value ""
    
    # Create Website
    Write-Info "Creating IIS website..."
    if (Test-Path "IIS:\Sites\$siteName") {
        Remove-Website -Name $siteName
    }
    
    New-Website -Name $siteName -PhysicalPath $ScriptDir -ApplicationPool $appPoolName -Port 80 -HostHeader $script:DomainName
    
    # Configure URL Rewrite
    Write-Info "Configuring URL Rewrite rules..."
    $webConfigPath = Join-Path $ScriptDir "web.config"
    
    $webConfigContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="ReverseProxyInboundRule" stopProcessing="true">
                    <match url="(.*)" />
                    <action type="Rewrite" url="http://localhost:$($script:AppPort)/{R:1}" />
                    <serverVariables>
                        <set name="HTTP_X_ORIGINAL_HOST" value="{HTTP_HOST}" />
                    </serverVariables>
                </rule>
            </rules>
        </rewrite>
        <httpProtocol>
            <customHeaders>
                <add name="X-Frame-Options" value="SAMEORIGIN" />
                <add name="X-XSS-Protection" value="1; mode=block" />
                <add name="X-Content-Type-Options" value="nosniff" />
            </customHeaders>
        </httpProtocol>
        <security>
            <requestFiltering>
                <requestLimits maxAllowedContentLength="52428800" />
            </requestFiltering>
        </security>
    </system.webServer>
</configuration>
"@
    
    Set-Content -Path $webConfigPath -Value $webConfigContent
    
    Write-Success "IIS configured successfully"
    Write-Info "To enable HTTPS, install an SSL certificate in IIS Manager"
}

function Setup-PM2 {
    Write-Header "Step 7: Setting Up PM2 Process Manager"
    
    Write-Info "Stopping any existing PM2 processes..."
    pm2 delete factory-shop-erp 2>$null
    
    Write-Info "Starting application with PM2..."
    pm2 start ecosystem.config.js --env production
    
    Write-Info "Saving PM2 process list..."
    pm2 save
    
    Write-Success "PM2 configured successfully"
}

function Setup-TelegramWebhook {
    if ($script:TelegramEnabled -ne "true" -or [string]::IsNullOrWhiteSpace($script:TelegramBotToken)) {
        Write-Warning "Skipping Telegram webhook setup (not enabled)"
        return
    }
    
    Write-Header "Step 8: Configuring Telegram Webhook"
    
    $webhookUrl = "https://$($script:DomainName)/api/telegram/webhook"
    
    Write-Info "Setting webhook URL: $webhookUrl"
    
    try {
        $body = @{
            url = $webhookUrl
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$($script:TelegramBotToken)/setWebhook" `
            -Method Post -Body $body -ContentType "application/json"
        
        if ($response.ok) {
            Write-Success "Telegram webhook configured successfully"
            
            # Verify webhook
            Write-Info "Verifying webhook..."
            $webhookInfo = Invoke-RestMethod -Uri "https://api.telegram.org/bot$($script:TelegramBotToken)/getWebhookInfo"
            Write-Host ($webhookInfo | ConvertTo-Json -Depth 3) -ForegroundColor Cyan
        } else {
            Write-Error "Failed to set Telegram webhook"
            Write-Host ($response | ConvertTo-Json) -ForegroundColor Red
        }
    } catch {
        Write-Error "Failed to configure Telegram webhook: $_"
        Write-Warning "You can configure it manually later"
    }
}

function Setup-BackupTask {
    Write-Header "Step 9: Setting Up Automated Backups"
    
    Write-Info "Creating backup script..."
    
    $backupScript = @"
`$BackupDir = "C:\Backups\factory-erp"
`$DbPath = "$ScriptDir\db\carement.db"
`$Date = Get-Date -Format "yyyyMMdd_HHmmss"

New-Item -ItemType Directory -Path `$BackupDir -Force | Out-Null
Copy-Item `$DbPath -Destination "`$BackupDir\carement_`$Date.db"

# Keep only last 30 days
Get-ChildItem `$BackupDir -Filter "carement_*.db" | Where-Object { `$_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item

Add-Content -Path "`$BackupDir\backup.log" -Value "[`$Date] Database backup completed"
"@
    
    $backupScriptPath = "$ScriptDir\backup-database.ps1"
    Set-Content -Path $backupScriptPath -Value $backupScript
    
    Write-Info "Setting up daily backup scheduled task (2 AM)..."
    
    $taskName = "Factory-ERP-Backup"
    $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$backupScriptPath`""
    $trigger = New-ScheduledTaskTrigger -Daily -At 2am
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    
    # Remove existing task if exists
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null
    
    Write-Success "Automated backups configured"
}

function Setup-Firewall {
    Write-Header "Step 10: Configuring Windows Firewall"
    
    Write-Info "Adding firewall rules..."
    
    # Allow HTTP
    New-NetFirewallRule -DisplayName "Factory-ERP HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -ErrorAction SilentlyContinue
    
    # Allow HTTPS
    New-NetFirewallRule -DisplayName "Factory-ERP HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow -ErrorAction SilentlyContinue
    
    # Allow application port
    New-NetFirewallRule -DisplayName "Factory-ERP App" -Direction Inbound -Protocol TCP -LocalPort $script:AppPort -Action Allow -ErrorAction SilentlyContinue
    
    Write-Success "Firewall rules configured"
}

function Test-Deployment {
    Write-Header "Step 11: Running Health Checks"
    
    Start-Sleep -Seconds 3
    
    # Check if app is running
    Write-Info "Checking application status..."
    $pm2List = pm2 list | Out-String
    if ($pm2List -match "factory-shop-erp.*online") {
        Write-Success "Application is running"
    } else {
        Write-Error "Application is not running!"
        pm2 logs factory-shop-erp --lines 20
        exit 1
    }
    
    # Check local endpoint
    Write-Info "Checking local endpoint..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$($script:AppPort)" -TimeoutSec 5 -UseBasicParsing
        Write-Success "Application responds on port $($script:AppPort)"
    } catch {
        Write-Warning "Application not responding on port $($script:AppPort)"
    }
    
    # Check database
    Write-Info "Checking database..."
    $dbPath = "$ScriptDir\db\carement.db"
    if (Test-Path $dbPath) {
        $dbSize = (Get-Item $dbPath).Length / 1KB
        Write-Success "Database exists (Size: $([math]::Round($dbSize, 2)) KB)"
    } else {
        Write-Warning "Database file not found (will be created on first run)"
    }
    
    # Check IIS
    if ($script:SetupIIS -match '^[Yy]') {
        Write-Info "Checking IIS..."
        $iisService = Get-Service W3SVC
        if ($iisService.Status -eq "Running") {
            Write-Success "IIS is running"
        } else {
            Write-Warning "IIS is not running"
        }
    }
}

function Show-CompletionInfo {
    Write-Header "🎉 Deployment Complete!"
    
    Write-Host @"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              Deployment Completed Successfully!              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green

    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "Application Information:" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "🌐 URL: " -NoNewline; Write-Host "https://$($script:DomainName)" -ForegroundColor Green
    Write-Host "📂 Path: " -NoNewline; Write-Host $ScriptDir -ForegroundColor Cyan
    Write-Host "🔌 Port: " -NoNewline; Write-Host $script:AppPort -ForegroundColor Cyan
    Write-Host "💾 Database: " -NoNewline; Write-Host "$ScriptDir\db\carement.db" -ForegroundColor Cyan
    
    if ($script:TelegramEnabled -eq "true") {
        Write-Host "📱 Telegram: " -NoNewline; Write-Host "Enabled" -ForegroundColor Green
        Write-Host "   Webhook: " -NoNewline; Write-Host "https://$($script:DomainName)/api/telegram/webhook" -ForegroundColor Cyan
    } else {
        Write-Host "📱 Telegram: " -NoNewline; Write-Host "Disabled" -ForegroundColor Yellow
    }
    
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "Useful Commands:" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "View logs:        " -NoNewline; Write-Host "pm2 logs factory-shop-erp" -ForegroundColor Yellow
    Write-Host "Restart app:      " -NoNewline; Write-Host "pm2 restart factory-shop-erp" -ForegroundColor Yellow
    Write-Host "Stop app:         " -NoNewline; Write-Host "pm2 stop factory-shop-erp" -ForegroundColor Yellow
    Write-Host "App status:       " -NoNewline; Write-Host "pm2 status" -ForegroundColor Yellow
    Write-Host "Monitor app:      " -NoNewline; Write-Host "pm2 monit" -ForegroundColor Yellow
    Write-Host "Database backup:  " -NoNewline; Write-Host ".\backup-database.ps1" -ForegroundColor Yellow
    
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "Next Steps:" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "1. Visit " -NoNewline; Write-Host "https://$($script:DomainName)" -ForegroundColor Green -NoNewline; Write-Host " to access your application"
    Write-Host "2. Login with your credentials"
    
    if ($script:TelegramEnabled -eq "true") {
        Write-Host "3. Configure shop Telegram channels in Settings"
        Write-Host "4. Test Telegram notifications"
    }
    
    if ($script:SetupIIS -match '^[Yy]') {
        Write-Host "`n" -NoNewline
        Write-Warning "SSL Certificate:"
        Write-Host "To enable HTTPS, install an SSL certificate in IIS Manager" -ForegroundColor Yellow
        Write-Host "You can use Let's Encrypt with win-acme: https://www.win-acme.com/" -ForegroundColor Cyan
    }
    
    Write-Host "`n✓ Your Factory-Shop-ERP is now live and ready to use!`n" -ForegroundColor Green
}

################################################################################
# Main Execution
################################################################################

function Main {
    try {
        Show-WelcomeBanner
        Get-Configuration
        Install-NodeJS
        Install-PM2
        Install-IIS
        Setup-Application
        Configure-IIS
        Setup-PM2
        Setup-TelegramWebhook
        Setup-BackupTask
        Setup-Firewall
        Test-Deployment
        Show-CompletionInfo
    } catch {
        Write-Error "Deployment failed: $_"
        Write-Host $_.ScriptStackTrace -ForegroundColor Red
        Read-Host "`nPress Enter to exit"
        exit 1
    }
}

# Run main function
Main
