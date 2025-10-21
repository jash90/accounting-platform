import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema-enhanced';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://localhost:5432/accounting_platform';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// Export all tables and types from enhanced schema
export * from './schema-enhanced';
