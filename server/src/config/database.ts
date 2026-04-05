import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import * as dotenv from 'dotenv';

// Load environment variables before creating the pool
dotenv.config();

// If using server/docker-compose.yml, Postgres is published on host port 5433 → e.g.
// postgresql://pillsure:pillsure123@127.0.0.1:5433/pillsure
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });