import type { Config } from 'drizzle-kit';

export default {
  schema: './apps/backend/src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://localhost:5432/accounting_platform',
  },
} satisfies Config;
