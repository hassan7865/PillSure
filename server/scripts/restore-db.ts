import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { getDatabaseConfig, checkDockerAvailable, getDockerComposeCommand } from './db-config';

const execAsync = promisify(exec);

async function restoreDatabase(backupFile?: string) {
  try {
    // Check if Docker is available
    const dockerAvailable = await checkDockerAvailable();
    if (!dockerAvailable) {
      console.error('Error: Docker is not installed or not available in PATH');
      console.log('Please install Docker and ensure it is running');
      process.exit(1);
    }

    // Get configuration
    const config = getDatabaseConfig();
    const { dbName, dbUser, dbPassword, containerName, backupDir } = config;

    let backupPath: string;

    if (backupFile) {
      // Use specified backup file
      backupPath = path.isAbsolute(backupFile) 
        ? backupFile 
        : path.join(backupDir, backupFile);
    } else {
      // Use latest backup
      backupPath = path.join(backupDir, 'latest_backup.sql');
    }

    // Normalize path for cross-platform compatibility
    backupPath = path.normalize(backupPath);

    // Check if backup file exists
    if (!fs.existsSync(backupPath)) {
      console.error(`Backup file not found: ${backupPath}`);
      console.log(`\nCreate a backup first with: npm run db:backup`);
      process.exit(1);
    }

    console.log('Restoring database from backup...');
    console.log(`Container: ${containerName}`);
    console.log(`Database: ${dbName}`);
    console.log(`Backup file: ${backupPath}`);

    // Check if container is running (cross-platform compatible)
    try {
      const { stdout } = await execAsync(`docker ps --filter name=${containerName} --format "{{.Names}}"`);
      if (!stdout.trim()) {
        throw new Error('Container not found');
      }
    } catch (error) {
      console.error(`Container ${containerName} is not running.`);
      const composeCmd = getDockerComposeCommand();
      console.log(`Start it with: ${composeCmd} up -d`);
      process.exit(1);
    }

    // Terminate all active connections to the database
    console.log('\nTerminating active connections...');
    const terminateProcess = spawn('docker', [
      'exec',
      '-e',
      `PGPASSWORD=${dbPassword}`,
      containerName,
      'psql',
      '-U',
      dbUser,
      '-d',
      'postgres',
      '-c',
      `SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${dbName}' AND pid <> pg_backend_pid();`
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    });

    try {
      await new Promise<void>((resolve, reject) => {
        terminateProcess.on('close', (code) => {
          if (code === 0 || code === null) {
            resolve();
          } else {
            reject(new Error(`Terminate connections exited with code ${code}`));
          }
        });
        terminateProcess.on('error', reject);
      });
    } catch (error) {
      // Ignore errors if there are no connections to terminate
      console.log('No active connections to terminate (or already terminated)');
    }

    // Drop and recreate database to ensure clean restore
    console.log('Dropping existing database...');
    const dropProcess = spawn('docker', [
      'exec',
      '-e',
      `PGPASSWORD=${dbPassword}`,
      containerName,
      'psql',
      '-U',
      dbUser,
      '-d',
      'postgres',
      '-c',
      `DROP DATABASE IF EXISTS ${dbName};`
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    });

    await new Promise<void>((resolve, reject) => {
      dropProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Drop database exited with code ${code}`));
        }
      });
      dropProcess.on('error', reject);
    });

    console.log('Creating fresh database...');
    const createProcess = spawn('docker', [
      'exec',
      '-e',
      `PGPASSWORD=${dbPassword}`,
      containerName,
      'psql',
      '-U',
      dbUser,
      '-d',
      'postgres',
      '-c',
      `CREATE DATABASE ${dbName};`
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    });

    await new Promise<void>((resolve, reject) => {
      createProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Create database exited with code ${code}`));
        }
      });
      createProcess.on('error', reject);
    });

    // Restore from backup
    console.log('Restoring data from backup...');
    
    // Use spawn with stdin piping for cross-platform compatibility
    const restoreProcess = spawn('docker', [
      'exec',
      '-i',
      '-e',
      `PGPASSWORD=${dbPassword}`,
      containerName,
      'psql',
      '-U',
      dbUser,
      '-d',
      dbName
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    });

    // Read backup file and pipe to docker exec
    const backupFileStream = fs.createReadStream(backupPath);
    backupFileStream.pipe(restoreProcess.stdin);

    // Wait for process to complete
    await new Promise<void>((resolve, reject) => {
      let errorOutput = '';
      
      restoreProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      backupFileStream.on('end', () => {
        // Close stdin after file is fully read
        restoreProcess.stdin.end();
      });

      backupFileStream.on('error', (error) => {
        restoreProcess.stdin.end();
        reject(error);
      });

      restoreProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Restore process exited with code ${code}. ${errorOutput}`));
        }
      });

      restoreProcess.on('error', (error) => {
        reject(error);
      });
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

