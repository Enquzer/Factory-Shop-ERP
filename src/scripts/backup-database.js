const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Database backup script
async function backupDatabase() {
  try {
    console.log('Starting database backup...');
    
    // Define paths
    const projectRoot = path.join(__dirname, '..', '..');
    const dbPath = path.join(projectRoot, 'db', 'carement.db');
    const backupDir = path.join(projectRoot, 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `carement-backup-${timestamp}.db`);
    
    // Check if database file exists
    if (!fs.existsSync(dbPath)) {
      console.error('Database file not found:', dbPath);
      process.exit(1);
    }
    
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('Created backups directory:', backupDir);
    }
    
    // Copy the database file
    fs.copyFileSync(dbPath, backupPath);
    console.log('Database backed up successfully to:', backupPath);
    
    // Also create a SQL dump backup (if sqlite3 is available)
    try {
      const dumpPath = path.join(backupDir, `carement-dump-${timestamp}.sql`);
      execSync(`sqlite3 "${dbPath}" .dump > "${dumpPath}"`, { stdio: 'inherit' });
      console.log('SQL dump created successfully to:', dumpPath);
    } catch (dumpError) {
      console.warn('Could not create SQL dump (sqlite3 command not found or failed):', dumpError.message);
      console.log('Continuing with file copy backup only...');
    }
    
    // Clean up old backups (keep only the last 10 backups)
    try {
      const backups = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('carement-backup-') && file.endsWith('.db'))
        .sort()
        .reverse();
      
      if (backups.length > 10) {
        for (let i = 10; i < backups.length; i++) {
          const oldBackup = path.join(backupDir, backups[i]);
          fs.unlinkSync(oldBackup);
          console.log('Removed old backup:', oldBackup);
        }
      }
    } catch (cleanupError) {
      console.warn('Could not clean up old backups:', cleanupError.message);
    }
    
    console.log('Database backup completed successfully!');
    console.log('Backup location:', backupPath);
    
  } catch (error) {
    console.error('Database backup failed:', error.message);
    process.exit(1);
  }
}

// Run the backup if this script is executed directly
if (require.main === module) {
  backupDatabase();
}

module.exports = { backupDatabase };