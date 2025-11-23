import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

const DB_NAME = 'pillsure';
const DB_USER = 'pillsure';
const DB_PASSWORD = 'pillsure123';
const CONTAINER_NAME = 'postgres_db_pillsure';
const BACKUP_DIR = path.join(__dirname, '../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function backupDatabase() {
  try {
    // Generate timestamp for backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const backupFileName = `pillsure_backup_${timestamp}.sql`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    console.log('Creating database backup...');
    console.log(`Container: ${CONTAINER_NAME}`);
    console.log(`Database: ${DB_NAME}`);

    // Create backup using pg_dump inside the container
    // Use docker exec with PGPASSWORD to avoid password prompt
    const backupCommand = `docker exec -e PGPASSWORD=${DB_PASSWORD} ${CONTAINER_NAME} pg_dump -U ${DB_USER} -d ${DB_NAME} > "${backupPath}"`;
    
    await execAsync(backupCommand, { 
      shell: '/bin/bash'
    });

    // Also create a latest backup symlink/copy for easy restore
    const latestBackupPath = path.join(BACKUP_DIR, 'latest_backup.sql');
    fs.copyFileSync(backupPath, latestBackupPath);

    console.log(`Backup created successfully!`);
    console.log(`Location: ${backupPath}`);
    console.log(`Latest backup: ${latestBackupPath}`);
    console.log(`\nTo restore, run: npm run db:restore`);
  } catch (error: any) {
    console.error('Error creating backup:', error.message);
    process.exit(1);
  }
}

backupDatabase();

