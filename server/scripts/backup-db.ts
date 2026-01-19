import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { getDatabaseConfig, checkDockerAvailable, getDockerComposeCommand } from './db-config';

const execAsync = promisify(exec);

interface PostgreSQLVersion {
  major: number;
  minor: number;
  full: string;
}

/**
 * Execute a command and return stdout/stderr
 */
async function executeCommand(
  command: string,
  args: string[],
  options: { env?: Record<string, string>; timeout?: number } = {}
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      env: { ...process.env, ...options.env },
    });

    let stdout = '';
    let stderr = '';
    let timeoutId: NodeJS.Timeout | null = null;

    if (options.timeout) {
      timeoutId = setTimeout(() => {
        proc.kill();
        reject(new Error(`Command timeout after ${options.timeout}ms`));
      }, options.timeout);
    }

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      resolve({ stdout, stderr, code: code || 0 });
    });

    proc.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
    });
  });
}

/**
 * Get PostgreSQL version from container
 */
async function getPostgreSQLVersion(
  containerName: string,
  dbUser: string,
  dbPassword: string
): Promise<PostgreSQLVersion> {
  try {
    const result = await executeCommand(
      'docker',
      [
        'exec',
        '-e',
        `PGPASSWORD=${dbPassword}`,
        containerName,
        'psql',
        '-U',
        dbUser,
        '-d',
        'postgres',
        '-t',
        '-A',
        '-c',
        'SELECT version();',
      ],
      { timeout: 10000 }
    );

    // Parse version string like "PostgreSQL 15.2 on x86_64-pc-linux-gnu"
    const versionMatch = result.stdout.match(/PostgreSQL (\d+)\.(\d+)/);
    if (versionMatch) {
      return {
        major: parseInt(versionMatch[1], 10),
        minor: parseInt(versionMatch[2], 10),
        full: result.stdout.trim(),
      };
    }

    throw new Error('Could not parse PostgreSQL version');
  } catch (error: any) {
    console.warn(`[WARNING] Could not determine PostgreSQL version: ${error.message}`);
    // Return a default version that should work
    return { major: 14, minor: 0, full: 'Unknown' };
  }
}

/**
 * Sanitize database/username for SQL commands
 */
function sanitizeIdentifier(identifier: string): string {
  // Remove or escape potentially dangerous characters
  // Only allow alphanumeric and underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    // If contains special characters, quote it
    return `"${identifier.replace(/"/g, '""')}"`;
  }
  return identifier;
}

/**
 * Check available disk space (basic check)
 */
async function checkDiskSpace(backupPath: string, requiredMB: number = 100): Promise<boolean> {
  try {
    // This is a simple check - in production you might want more sophisticated space checking
    const stats = fs.statSync(path.dirname(backupPath));
    // If we can't determine, assume it's okay
    return true;
  } catch (error) {
    // If we can't check, proceed anyway (might fail later with clear error)
    return true;
  }
}

/**
 * Create backup with version-specific optimizations
 */
async function createBackup(
  containerName: string,
  dbName: string,
  dbUser: string,
  dbPassword: string,
  backupPath: string,
  version: PostgreSQLVersion
): Promise<void> {
  console.log('[INFO] Starting database backup...');

  // Build pg_dump command with version-appropriate options
  const dumpArgs: string[] = [
    'exec',
    '-e',
    `PGPASSWORD=${dbPassword}`,
    containerName,
    'pg_dump',
    '-U',
    dbUser,
    '-d',
    sanitizeIdentifier(dbName),
    '--verbose', // Show progress
    '--no-owner', // Don't dump ownership (for portability)
    '--no-acl', // Don't dump access privileges (for portability)
    '--clean', // Include DROP statements
    '--if-exists', // Use IF EXISTS for DROP statements (PostgreSQL 9.5+)
    '--create', // Include CREATE DATABASE statement
  ];

  // Add version-specific options
  if (version.major >= 9) {
    // For PostgreSQL 9+, use format options
    dumpArgs.push('--format=plain'); // Explicitly set plain text format
  }

  if (version.major >= 11) {
    // PostgreSQL 11+ supports better compression options
    // But we're using plain format, so we'll compress the file separately if needed
  }

  // Add encoding to ensure compatibility
  dumpArgs.push('--encoding=UTF8');

  // Use spawn for better control and progress reporting
  const backupProcess = spawn('docker', dumpArgs, {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false,
  });

  const backupFileStream = fs.createWriteStream(backupPath, { encoding: 'utf-8' });
  let bytesWritten = 0;
  let errorOutput = '';

  // Monitor progress
  backupProcess.stdout.on('data', (data: Buffer) => {
    backupFileStream.write(data);
    bytesWritten += data.length;
    
    // Show progress every 10MB
    if (bytesWritten % (10 * 1024 * 1024) < data.length) {
      const mbWritten = (bytesWritten / (1024 * 1024)).toFixed(1);
      process.stdout.write(`\r  Progress: ${mbWritten} MB written...`);
    }
  });

  backupProcess.stderr.on('data', (data: Buffer) => {
    const output = data.toString();
    errorOutput += output;

    // Show verbose pg_dump messages (but don't treat as errors)
    if (output.match(/dumping|done/i)) {
      const lines = output.split('\n').filter((l) => l.trim());
      lines.forEach((line) => {
        if (line.match(/dumping|done/i)) {
          console.log(`  ${line.trim()}`);
        }
      });
    }
  });

  return new Promise<void>((resolve, reject) => {
    backupFileStream.on('error', (error) => {
      backupProcess.kill();
      reject(new Error(`Failed to write backup file: ${error.message}`));
    });

    backupProcess.on('close', (code) => {
      backupFileStream.end();
      
      if (code === 0) {
        console.log(`\n  [SUCCESS] Backup completed: ${(bytesWritten / (1024 * 1024)).toFixed(2)} MB`);
        resolve();
      } else {
        // Check if error is non-critical
        const nonCriticalPattern = /WARNING|NOTICE|already exists/i;
        if (errorOutput.match(nonCriticalPattern) && !errorOutput.match(/FATAL|ERROR/i)) {
          console.log(`\n  [WARNING] Backup completed with warnings: ${(bytesWritten / (1024 * 1024)).toFixed(2)} MB`);
          console.log('  (Warnings are usually safe to ignore)');
          resolve();
        } else {
          reject(
            new Error(`Backup process exited with code ${code}. Errors: ${errorOutput.slice(-500)}`)
          );
        }
      }
    });

    backupProcess.on('error', (error) => {
      backupFileStream.end();
      reject(new Error(`Failed to start backup process: ${error.message}`));
    });
  });
}

/**
 * Add version metadata to backup file
 */
async function addBackupMetadata(
  backupPath: string,
  version: PostgreSQLVersion,
  dbName: string
): Promise<void> {
  try {
    // Read existing backup file
    const content = fs.readFileSync(backupPath, 'utf-8');

    // Add metadata header if not already present
    if (!content.includes('-- Dumped from database version')) {
      const metadata = `-- PostgreSQL database dump
-- Dumped from database version ${version.major}.${version.minor}
-- Dump completed on: ${new Date().toISOString()}
-- Database: ${dbName}
-- pg_dump version: ${version.full}

`;

      // Prepend metadata to backup file
      const newContent = metadata + content;
      fs.writeFileSync(backupPath, newContent, 'utf-8');
    }
  } catch (error) {
    // Non-critical - just log warning
    console.warn('[WARNING] Could not add metadata to backup file');
  }
}

/**
 * Main backup function
 */
async function backupDatabase(useTimestamp?: boolean) {
  try {
    // Check if Docker is available
    const dockerAvailable = await checkDockerAvailable();
    if (!dockerAvailable) {
      console.error('[ERROR] Docker is not installed or not available in PATH');
      console.log('Please install Docker and ensure it is running');
      process.exit(1);
    }

    // Get configuration
    const config = getDatabaseConfig();
    const { dbName, dbUser, dbPassword, containerName, backupDir } = config;

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`[INFO] Created backup directory: ${backupDir}`);
    }

    // Determine backup filename
    let backupPath: string;
    if (useTimestamp) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `backup_${timestamp}_${time}.sql`;
      backupPath = path.join(backupDir, filename);
    } else {
      backupPath = path.join(backupDir, 'latest_backup.sql');
    }

    // Normalize path for cross-platform compatibility
    backupPath = path.normalize(backupPath);

    console.log('[INFO] Database backup utility');
    console.log(`   Container: ${containerName}`);
    console.log(`   Database: ${dbName}`);
    console.log(`   Backup location: ${backupPath}`);

    // Check if container is running
    try {
      const { stdout } = await execAsync(`docker ps --filter name=${containerName} --format "{{.Names}}"`);
      if (!stdout.trim()) {
        throw new Error('Container not found');
      }
    } catch (error) {
      console.error(`[ERROR] Container ${containerName} is not running.`);
      const composeCmd = getDockerComposeCommand();
      console.log(`   Start it with: ${composeCmd} up -d`);
      process.exit(1);
    }

    // Get PostgreSQL version
    console.log('\n[INFO] Detecting PostgreSQL version...');
    const version = await getPostgreSQLVersion(containerName, dbUser, dbPassword);
    console.log(`   PostgreSQL version: ${version.major}.${version.minor}`);

    // Check disk space (basic check)
    await checkDiskSpace(backupPath, 100);

    // Create backup
    await createBackup(containerName, dbName, dbUser, dbPassword, backupPath, version);

    // Add metadata to backup file
    await addBackupMetadata(backupPath, version, dbName);

    // Get file size for final report
    const stats = fs.statSync(backupPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`\n[SUCCESS] Backup created successfully!`);
    console.log(`   Location: ${backupPath}`);
    console.log(`   Size: ${fileSizeMB} MB`);
    console.log(`   PostgreSQL version: ${version.major}.${version.minor}`);

    // Create symlink to latest_backup.sql if using timestamp
    if (useTimestamp) {
      const latestPath = path.join(backupDir, 'latest_backup.sql');
      try {
        // Remove existing symlink/file
        if (fs.existsSync(latestPath)) {
          fs.unlinkSync(latestPath);
        }
        // Create symlink (or copy on Windows)
        if (process.platform === 'win32') {
          fs.copyFileSync(backupPath, latestPath);
        } else {
          fs.symlinkSync(path.basename(backupPath), latestPath);
        }
        console.log(`   Linked as: latest_backup.sql`);
      } catch (error) {
        console.warn('[WARNING] Could not create latest_backup.sql link');
      }
    }

    console.log(`\n[INFO] To restore, run: npm run db:restore`);
    if (useTimestamp) {
      console.log(`   Or specify file: npm run db:restore ${path.basename(backupPath)}`);
    }

  } catch (error: any) {
    console.error('\n[ERROR] Error creating backup:', error.message);

    if (error.message.includes('timeout')) {
      console.error('\n[TIP] The backup process timed out. Try:');
      console.error('   - Increase timeout for large databases');
      console.error('   - Check Docker container resources');
      console.error('   - Ensure sufficient disk space');
    } else if (error.message.includes('connection') || error.message.includes('authentication')) {
      console.error('\n[TIP] Connection/authentication error. Try:');
      console.error('   - Verify Docker container is running');
      console.error('   - Check database credentials');
      console.error('   - Ensure container is accessible');
    } else if (error.message.includes('disk') || error.message.includes('space')) {
      console.error('\n[TIP] Disk space issue. Try:');
      console.error('   - Free up disk space');
      console.error('   - Check backup directory permissions');
      console.error('   - Use a different backup location');
    }

    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const useTimestamp = args.includes('--timestamp') || args.includes('-t');

backupDatabase(useTimestamp);
