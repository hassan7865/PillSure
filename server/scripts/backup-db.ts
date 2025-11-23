import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getDatabaseConfig, checkDockerAvailable } from './db-config';

async function backupDatabase() {
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

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, 'latest_backup.sql');

    console.log('Creating database backup...');
    console.log(`Container: ${containerName}`);
    console.log(`Database: ${dbName}`);
    console.log(`Backup location: ${backupPath}`);

    // Create backup using pg_dump inside the container
    // Use spawn with stdout piping for cross-platform compatibility
    const backupProcess = spawn('docker', [
      'exec',
      '-e',
      `PGPASSWORD=${dbPassword}`,
      containerName,
      'pg_dump',
      '-U',
      dbUser,
      '-d',
      dbName,
      '--no-owner',
      '--no-acl'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    });

    // Write backup output to file
    const backupFileStream = fs.createWriteStream(backupPath);
    backupProcess.stdout.pipe(backupFileStream);

    // Wait for process to complete
    await new Promise<void>((resolve, reject) => {
      let errorOutput = '';
      
      backupProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      backupProcess.on('close', (code) => {
        if (code === 0) {
          backupFileStream.end();
          resolve();
        } else {
          reject(new Error(`Backup process exited with code ${code}. ${errorOutput}`));
        }
      });

      backupProcess.on('error', (error) => {
        reject(error);
      });
    });

    console.log(`Backup created successfully!`);
    console.log(`Location: ${backupPath}`);
    console.log(`\nTo restore, run: npm run db:restore`);
  } catch (error: any) {
    console.error('Error creating backup:', error.message);
    process.exit(1);
  }
}

backupDatabase();

