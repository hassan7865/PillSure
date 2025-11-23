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

async function restoreDatabase(backupFile?: string) {
  try {
    let backupPath: string;

    if (backupFile) {
      // Use specified backup file
      backupPath = path.isAbsolute(backupFile) 
        ? backupFile 
        : path.join(BACKUP_DIR, backupFile);
    } else {
      // Use latest backup
      backupPath = path.join(BACKUP_DIR, 'latest_backup.sql');
    }

    // Check if backup file exists
    if (!fs.existsSync(backupPath)) {
      console.error(`Backup file not found: ${backupPath}`);
      console.log(`\nCreate a backup first with: npm run db:backup`);
      process.exit(1);
    }

    console.log('Restoring database from backup...');
    console.log(`Container: ${CONTAINER_NAME}`);
    console.log(`Database: ${DB_NAME}`);
    console.log(`Backup file: ${backupPath}`);

    // Check if container is running
    try {
      await execAsync(`docker ps --filter name=${CONTAINER_NAME} --format "{{.Names}}"`);
    } catch (error) {
      console.error(`Container ${CONTAINER_NAME} is not running.`);
      console.log(`Start it with: docker-compose up -d`);
      process.exit(1);
    }

    // Terminate all active connections to the database
    console.log('\nTerminating active connections...');
    const terminateConnectionsCommand = `docker exec -e PGPASSWORD=${DB_PASSWORD} ${CONTAINER_NAME} psql -U ${DB_USER} -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${DB_NAME}' AND pid <> pg_backend_pid();"`;
    try {
      await execAsync(terminateConnectionsCommand);
    } catch (error) {
      // Ignore errors if there are no connections to terminate
      console.log('No active connections to terminate (or already terminated)');
    }

    // Drop and recreate database to ensure clean restore
    console.log('Dropping existing database...');
    const dropDbCommand = `docker exec -e PGPASSWORD=${DB_PASSWORD} ${CONTAINER_NAME} psql -U ${DB_USER} -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"`;
    await execAsync(dropDbCommand);

    console.log('Creating fresh database...');
    const createDbCommand = `docker exec -e PGPASSWORD=${DB_PASSWORD} ${CONTAINER_NAME} psql -U ${DB_USER} -d postgres -c "CREATE DATABASE ${DB_NAME};"`;
    await execAsync(createDbCommand);

    // Restore from backup
    console.log('Restoring data from backup...');
    const restoreCommand = `docker exec -i -e PGPASSWORD=${DB_PASSWORD} ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} < "${backupPath}"`;
    
    await execAsync(restoreCommand, {
      shell: '/bin/bash'
    });

    console.log(`Database restored successfully from ${path.basename(backupPath)}!`);
    console.log(`\nRun migrations if needed: npm run db:upgrade`);
  } catch (error: any) {
    console.error('Error restoring database:', error.message);
    process.exit(1);
  }
}

// Get backup file from command line argument
const backupFile = process.argv[2];
restoreDatabase(backupFile);

