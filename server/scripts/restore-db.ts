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
  options: { env?: Record<string, string>; stdin?: string; timeout?: number } = {}
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

    if (options.stdin) {
      proc.stdin.write(options.stdin);
      proc.stdin.end();
    }

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
    console.warn(`Warning: Could not determine PostgreSQL version: ${error.message}`);
    // Return a default version that should work
    return { major: 14, minor: 0, full: 'Unknown' };
  }
}

/**
 * Detect PostgreSQL version from backup file
 */
function detectBackupVersion(backupPath: string): { version?: string; isCustom?: boolean } {
  try {
    const content = fs.readFileSync(backupPath, 'utf-8');
    const firstLines = content.substring(0, 1000);

    // Check for version comments in backup file
    const versionMatch = firstLines.match(/-- Dumped from database version (\d+\.\d+)/i);
    if (versionMatch) {
      return { version: versionMatch[1] };
    }

    // Check for pg_dump version
    const pgDumpMatch = firstLines.match(/-- PostgreSQL database dump.*version (\d+\.\d+)/i);
    if (pgDumpMatch) {
      return { version: pgDumpMatch[1] };
    }

    // Check if it's a custom format dump
    if (content.includes('pg_dump: dumping contents') || content.includes('COPY ') || content.includes('INSERT INTO')) {
      return { isCustom: true };
    }

    return {};
  } catch (error) {
    console.warn('Warning: Could not read backup file to detect version');
    return {};
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
 * Escape database name for SQL (used in queries)
 */
function escapeSqlString(str: string): string {
  // Escape single quotes for SQL strings
  return `'${str.replace(/'/g, "''")}'`;
}

/**
 * Terminate all active connections to a database (PostgreSQL version agnostic)
 */
async function terminateConnections(
  containerName: string,
  dbName: string,
  dbUser: string,
  dbPassword: string
): Promise<void> {
  console.log('Terminating active connections...');

  // Try different methods based on PostgreSQL version
  const queries = [
    // PostgreSQL 9.2+ (pid)
    `SELECT pg_terminate_backend(pg_stat_activity.pid) 
     FROM pg_stat_activity 
     WHERE pg_stat_activity.datname = ${escapeSqlString(dbName)} 
     AND pid <> pg_backend_pid();`,
    
    // PostgreSQL 13+ (uses pid instead of procpid)
    `SELECT pg_terminate_backend(pid) 
     FROM pg_stat_activity 
     WHERE datname = ${escapeSqlString(dbName)} 
     AND pid <> pg_backend_pid();`,
  ];

  for (const query of queries) {
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
          '-c',
          query,
        ],
        { timeout: 10000 }
      );

      if (result.code === 0) {
        console.log('Active connections terminated');
        return;
      }
    } catch (error: any) {
      // Try next method
      continue;
    }
  }

  console.log('Warning: Could not terminate all connections (may already be terminated)');
}

/**
 * Drop database if exists (with error handling)
 */
async function dropDatabase(
  containerName: string,
  dbName: string,
  dbUser: string,
  dbPassword: string
): Promise<void> {
  console.log('Dropping existing database...');

  const sanitizedDbName = sanitizeIdentifier(dbName);

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
        '-c',
        `DROP DATABASE IF EXISTS ${sanitizedDbName};`,
      ],
      { timeout: 30000 }
    );

    if (result.code === 0) {
      console.log('Database dropped successfully');
    } else if (result.stderr.includes('does not exist')) {
      console.log('Database does not exist (nothing to drop)');
    } else {
      throw new Error(`Failed to drop database: ${result.stderr}`);
    }
  } catch (error: any) {
    if (error.message.includes('does not exist')) {
      console.log('Database does not exist (nothing to drop)');
    } else {
      throw error;
    }
  }
}

/**
 * Create database (with error handling)
 */
async function createDatabase(
  containerName: string,
  dbName: string,
  dbUser: string,
  dbPassword: string
): Promise<void> {
  console.log('Creating fresh database...');

  const sanitizedDbName = sanitizeIdentifier(dbName);

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
      '-c',
      `CREATE DATABASE ${sanitizedDbName};`,
    ],
    { timeout: 30000 }
  );

  if (result.code === 0) {
    console.log('Database created successfully');
  } else if (result.stderr.includes('already exists')) {
    console.log('Database already exists');
  } else {
    throw new Error(`Failed to create database: ${result.stderr}`);
  }
}

/**
 * Restore database from SQL file
 */
async function restoreFromSQL(
  containerName: string,
  backupPath: string,
  dbName: string,
  dbUser: string,
  dbPassword: string
): Promise<void> {
  console.log('Restoring data from backup...');

  return new Promise((resolve, reject) => {
    const restoreProcess = spawn(
      'docker',
      [
        'exec',
        '-i',
        '-e',
        `PGPASSWORD=${dbPassword}`,
        containerName,
        'psql',
        '-U',
        dbUser,
        '-d',
        sanitizeIdentifier(dbName),
        '-v',
        'ON_ERROR_STOP=0', // Continue on errors (handles version differences)
        '-f',
        '-',
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
      }
    );

    const backupFileStream = fs.createReadStream(backupPath, { encoding: 'utf-8' });
    let errorOutput = '';
    let warningCount = 0;
    let errorCount = 0;

    // Process stderr for warnings and errors
    restoreProcess.stderr.on('data', (data) => {
      const output = data.toString();
      errorOutput += output;

      // Count warnings and errors
      if (output.match(/WARNING/i)) {
        warningCount++;
      }
      if (output.match(/ERROR/i) && !output.match(/already exists/i)) {
        errorCount++;
      }

          // Show warnings in real-time (but don't fail)
      if (output.match(/WARNING|NOTICE/i)) {
        const lines = output.split('\n').filter((l: string) => l.trim());
        lines.forEach((line: string) => {
          if (line.match(/WARNING|NOTICE/i) && !line.match(/already exists|does not exist/i)) {
            console.log(`  [WARNING] ${line.trim()}`);
          }
        });
      }
    });

    // Process stdout for progress
    restoreProcess.stdout.on('data', (data) => {
      const output = data.toString();
      // Show COPY and INSERT progress
      if (output.match(/COPY \d+|INSERT \d+/)) {
        process.stdout.write(`\r  ${output.trim()}`);
      }
    });

    backupFileStream.on('error', (error) => {
      restoreProcess.stdin.end();
      reject(new Error(`Failed to read backup file: ${error.message}`));
    });

    backupFileStream.pipe(restoreProcess.stdin);

    restoreProcess.on('close', (code) => {
      // PostgreSQL restore can exit with code 0 even if there are warnings
      // Only fail on critical errors
      const criticalErrors = errorOutput.match(/FATAL|connection/i);
      
      if (code === 0 && !criticalErrors) {
        console.log('\n');
        if (warningCount > 0) {
          console.log(`  [WARNING] Restore completed with ${warningCount} warning(s)`);
        }
        if (errorCount > 0) {
          console.log(`  [WARNING] Restore completed with ${errorCount} non-critical error(s)`);
          console.log('  (These are usually due to version differences and can be ignored)');
        }
        resolve();
      } else if (criticalErrors) {
        reject(new Error(`Critical error during restore: ${criticalErrors[0]}`));
      } else {
        // Non-zero exit code but might still be recoverable
        const nonCriticalPattern = /already exists|does not exist|duplicate key/i;
        if (errorOutput.match(nonCriticalPattern)) {
          console.log('\n');
          console.log('  [WARNING] Restore completed with some warnings (usually safe to ignore)');
          resolve();
        } else {
          reject(
            new Error(`Restore process exited with code ${code}. Last errors: ${errorOutput.slice(-500)}`)
          );
        }
      }
    });

    restoreProcess.on('error', (error) => {
      reject(new Error(`Failed to start restore process: ${error.message}`));
    });
  });
}

/**
 * Pre-process backup file to handle version differences
 */
function preprocessBackup(backupPath: string, targetVersion: PostgreSQLVersion): string {
  const tempPath = backupPath + '.processed';
  
  try {
    const content = fs.readFileSync(backupPath, 'utf-8');

    // Remove version-specific commands that might fail
    let processed = content;

    // Remove SET commands that might not be compatible
    processed = processed.replace(/^SET [a-zA-Z_]+ = .+;$/gm, '-- Removed SET command for compatibility');

    // Remove owner and ACL commands if restoring to different version
    processed = processed.replace(/^ALTER .+ OWNER TO .+;$/gm, '-- Removed OWNER TO for compatibility');
    processed = processed.replace(/^GRANT .+ ON .+ TO .+;$/gm, '-- Removed GRANT for compatibility');
    processed = processed.replace(/^REVOKE .+ ON .+ FROM .+;$/gm, '-- Removed REVOKE for compatibility');

    // Comment out extensions that might not exist
    if (targetVersion.major < 12) {
      processed = processed.replace(/^CREATE EXTENSION IF NOT EXISTS ([^;]+);$/gm, '-- CREATE EXTENSION IF NOT EXISTS $1; -- Commented for compatibility');
    }

    // Handle different sequence syntax
    processed = processed.replace(/^CREATE SEQUENCE IF NOT EXISTS /gm, 'CREATE SEQUENCE ');

    fs.writeFileSync(tempPath, processed, 'utf-8');
    return tempPath;
  } catch (error) {
    console.warn('Warning: Could not preprocess backup file, using original');
    return backupPath;
  }
}

/**
 * Clean up temporary files
 */
function cleanupTempFile(filePath: string): void {
  if (fs.existsSync(filePath) && filePath.endsWith('.processed')) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.warn(`Warning: Could not delete temporary file: ${filePath}`);
    }
  }
}

/**
 * Main restore function
 */
async function restoreDatabase(backupFile?: string) {
  let processedBackupPath: string | null = null;
  let backupPath: string = '';

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

    if (backupFile) {
      // Use specified backup file
      backupPath = path.isAbsolute(backupFile) ? backupFile : path.join(backupDir, backupFile);
    } else {
      // Use latest backup
      backupPath = path.join(backupDir, 'latest_backup.sql');
    }

    // Normalize path for cross-platform compatibility
    backupPath = path.normalize(backupPath);

    // Check if backup file exists
    if (!fs.existsSync(backupPath)) {
      console.error(`[ERROR] Backup file not found: ${backupPath}`);
      console.log(`\nCreate a backup first with: npm run db:backup`);
      process.exit(1);
    }

    console.log('[INFO] Starting database restore...');
    console.log(`   Container: ${containerName}`);
    console.log(`   Database: ${dbName}`);
    console.log(`   Backup file: ${path.basename(backupPath)}`);

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

    // Get PostgreSQL version from container
    console.log('\n[INFO] Detecting PostgreSQL version...');
    const targetVersion = await getPostgreSQLVersion(containerName, dbUser, dbPassword);
    console.log(`   Container version: PostgreSQL ${targetVersion.major}.${targetVersion.minor}`);

    // Detect backup version
    const backupInfo = detectBackupVersion(backupPath);
    if (backupInfo.version) {
      console.log(`   Backup created from: PostgreSQL ${backupInfo.version}`);
      
      const [backupMajor, backupMinor] = backupInfo.version.split('.').map(Number);
      if (Math.abs(backupMajor - targetVersion.major) > 1) {
        console.warn(
          `   [WARNING] Version mismatch detected (backup: ${backupInfo.version}, target: ${targetVersion.major}.${targetVersion.minor})`
        );
        console.warn('   Some features may not be compatible, but restore will attempt to continue...');
      }
    }

    // Terminate connections
    await terminateConnections(containerName, dbName, dbUser, dbPassword);

    // Drop and recreate database
    await dropDatabase(containerName, dbName, dbUser, dbPassword);
    await createDatabase(containerName, dbName, dbUser, dbPassword);

    // Pre-process backup for version compatibility
    console.log('\n[INFO] Preprocessing backup for compatibility...');
    processedBackupPath = preprocessBackup(backupPath, targetVersion);
    const finalBackupPath = processedBackupPath !== backupPath ? processedBackupPath : backupPath;

    // Restore from backup
    await restoreFromSQL(containerName, finalBackupPath, dbName, dbUser, dbPassword);

    console.log(`\n[SUCCESS] Database restored successfully from ${path.basename(backupPath)}!`);
    console.log(`\n[INFO] Next steps:`);
    console.log(`   • Run migrations if needed: npm run db:upgrade`);
    console.log(`   • Verify the database: npm run db:verify`);

  } catch (error: any) {
    console.error('\n[ERROR] Error restoring database:', error.message);
    
    if (error.message.includes('timeout')) {
      console.error('\n[TIP] The restore process timed out. Try:');
      console.error('   - Check if the backup file is too large');
      console.error('   - Verify Docker container has enough resources');
      console.error('   - Try restoring with a smaller backup file');
    } else if (error.message.includes('connection')) {
      console.error('\n[TIP] Connection error. Try:');
      console.error('   - Verify Docker container is running');
      console.error('   - Check database credentials');
      console.error('   - Ensure container is accessible');
    } else if (error.message.includes('version')) {
      console.error('\n[TIP] Version compatibility issue. Try:');
      console.error('   - Use a backup from a similar PostgreSQL version');
      console.error('   - Manually review and fix SQL statements in the backup');
    }
    
    process.exit(1);
  } finally {
    // Clean up temporary processed file
    if (processedBackupPath && processedBackupPath !== backupPath) {
      cleanupTempFile(processedBackupPath);
    }
  }
}

// Get backup file from command line argument
const backupFile = process.argv[2];
restoreDatabase(backupFile);
