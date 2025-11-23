import * as dotenv from 'dotenv';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

interface DatabaseConfig {
  dbName: string;
  dbUser: string;
  dbPassword: string;
  containerName: string;
  backupDir: string;
  host?: string;
  port?: number;
}

/**
 * Parse DATABASE_URL if available
 * Format: postgresql://user:password@host:port/database
 */
function parseDatabaseUrl(url?: string): Partial<DatabaseConfig> {
  if (!url) return {};

  try {
    const parsed = new URL(url);
    return {
      dbUser: parsed.username,
      dbPassword: parsed.password,
      dbName: parsed.pathname.replace('/', ''),
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : undefined,
    };
  } catch (error) {
    console.warn('Warning: Could not parse DATABASE_URL, using defaults');
    return {};
  }
}

/**
 * Get database configuration from environment variables or use defaults
 */
export function getDatabaseConfig(): DatabaseConfig {
  // Parse DATABASE_URL if available
  const urlConfig = parseDatabaseUrl(process.env.DATABASE_URL);

  // Get configuration from environment variables with fallbacks
  const config: DatabaseConfig = {
    dbName: process.env.DB_NAME || process.env.POSTGRES_DB || urlConfig.dbName || 'pillsure',
    dbUser: process.env.DB_USER || process.env.POSTGRES_USER || urlConfig.dbUser || 'pillsure',
    dbPassword: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || urlConfig.dbPassword || 'pillsure123',
    containerName: process.env.DB_CONTAINER_NAME || process.env.CONTAINER_NAME || 'postgres_db_pillsure',
    backupDir: process.env.BACKUP_DIR || path.join(__dirname, '../backups'),
    host: urlConfig.host,
    port: urlConfig.port,
  };

  // Normalize backup directory path for cross-platform compatibility
  config.backupDir = path.normalize(config.backupDir);

  return config;
}

/**
 * Check if Docker is available
 */
export async function checkDockerAvailable(): Promise<boolean> {
  try {
    await execAsync('docker --version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the appropriate docker-compose command based on OS
 */
export function getDockerComposeCommand(): string {
  // Check if docker compose (v2) is available, otherwise use docker-compose (v1)
  // Both work cross-platform
  return 'docker compose';
}

