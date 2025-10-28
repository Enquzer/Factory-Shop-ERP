const { backupDatabase } = require('./backup-database');

// Scheduled backup function
async function scheduledBackup() {
  console.log('Scheduled backup started at:', new Date().toISOString());
  
  try {
    await backupDatabase();
    console.log('Scheduled backup completed successfully at:', new Date().toISOString());
  } catch (error) {
    console.error('Scheduled backup failed:', error.message);
    process.exit(1);
  }
}

// Run backup immediately
scheduledBackup();

// Schedule daily backups (optional - uncomment to enable)
// setInterval(scheduledBackup, 24 * 60 * 60 * 1000); // Every 24 hours