import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables before creating the pool
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const db = drizzle(pool);

const MIGRATIONS_DIR = path.join(__dirname, '../../drizzle');

/**
 * Migration Runner - Alembic-like migration system
 */
export class MigrationRunner {
  /**
   * Get current migration version from database
   */
  static async current(): Promise<string | null> {
    try {
      const result = await pool.query(`
        SELECT hash FROM drizzle.__drizzle_migrations 
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      return result.rows[0]?.hash || null;
    } catch (error: any) {
      if (error.code === '42P01') {
        // Table doesn't exist - no migrations run yet
        return null;
      }
      throw error;
    }
  }

  /**
   * Get migration history
   */
  static async history(): Promise<Array<{ hash: string; created_at: Date }>> {
    try {
      const result = await pool.query(`
        SELECT hash, created_at 
        FROM drizzle.__drizzle_migrations 
        ORDER BY created_at DESC
      `);
      return result.rows.map(row => ({
        hash: row.hash,
        created_at: new Date(Number(row.created_at))
      }));
    } catch (error: any) {
      if (error.code === '42P01') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Run all pending migrations (upgrade)
   */
  static async upgrade(): Promise<void> {
    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    console.log('All migrations applied successfully');
  }

  /**
   * Check if migrations directory exists and has migrations
   */
  static async checkMigrationsExist(): Promise<boolean> {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      return false;
    }
    const files = fs.readdirSync(MIGRATIONS_DIR);
    return files.some(file => file.endsWith('.sql'));
  }

  /**
   * Get pending migrations
   */
  static async pending(): Promise<string[]> {
    try {
      const history = await this.history();
      const appliedHashes = new Set(history.map(h => h.hash));
      
      if (!fs.existsSync(MIGRATIONS_DIR)) {
        return [];
      }

      // Get migration files and calculate their hashes
      const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(file => file.endsWith('.sql'))
        .map(file => {
          const filePath = path.join(MIGRATIONS_DIR, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          // Drizzle uses hash of migration content to track migrations
          const crypto = require('crypto');
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          return { file, hash };
        });

      return files
        .filter(({ hash }) => !appliedHashes.has(hash))
        .map(({ file }) => file);
    } catch (error) {
      console.error('Error checking pending migrations:', error);
      return [];
    }
  }

  /**
   * Close database connection
   */
  static async close(): Promise<void> {
    await pool.end();
  }
}

