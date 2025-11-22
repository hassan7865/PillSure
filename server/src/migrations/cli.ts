#!/usr/bin/env ts-node
import * as dotenv from 'dotenv';
import { MigrationRunner } from './migration-runner';

dotenv.config();

const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  try {
    switch (command) {
      case 'current':
        console.log('Current migration version:');
        const current = await MigrationRunner.current();
        if (current) {
          console.log(`   ${current}`);
        } else {
          console.log('   No migrations applied yet');
        }
        break;

      case 'history':
        console.log('Migration history:');
        const history = await MigrationRunner.history();
        if (history.length === 0) {
          console.log('   No migrations found');
        } else {
          history.forEach((migration, index) => {
            console.log(`   ${index + 1}. ${migration.hash.substring(0, 8)}... - ${migration.created_at.toLocaleString()}`);
          });
        }
        break;

      case 'upgrade':
      case 'up':
        await MigrationRunner.upgrade();
        break;

      case 'pending':
        console.log('Pending migrations:');
        const pending = await MigrationRunner.pending();
        if (pending.length === 0) {
          console.log('   No pending migrations');
        } else {
          pending.forEach((version, index) => {
            console.log(`   ${index + 1}. ${version}`);
          });
        }
        break;

      case 'generate':
        console.log('Generating migration...');
        // This will be handled by drizzle-kit
        console.log('   Run: npm run db:generate');
        break;

      case 'downgrade':
      case 'down':
        console.log('Drizzle does not support downgrade by default.');
        console.log('   You can manually revert migrations by dropping tables.');
        break;

      case 'help':
      case '--help':
      case '-h':
        console.log(`
Migration CLI - Alembic-like interface

Usage: ts-node src/migrations/cli.ts <command> [options]

Commands:
  current         Show current migration version
  history         Show all applied migrations
  upgrade, up     Apply all pending migrations
  pending         Show pending migrations
  generate        Generate new migration (use: npm run db:generate)
  downgrade, down Show downgrade info (not supported)
  help            Show this help message

Examples:
  ts-node src/migrations/cli.ts current
  ts-node src/migrations/cli.ts history
  ts-node src/migrations/cli.ts upgrade
  ts-node src/migrations/cli.ts pending
        `);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('   Run "help" for usage information');
        process.exit(1);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await MigrationRunner.close();
  }
}

main();

