import 'server-only';

import postgres, { type Sql } from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Supabase Transaction Pooler uses PgBouncer (often port 6543 / host contains "pooler").
// PgBouncer in transaction mode doesn't support prepared statements, so we must disable them.
const isSupabasePooler =
  /pooler\.supabase\.com/i.test(connectionString) || /:6543\b/.test(connectionString);

// Reuse the connection in dev to avoid exhausting database connections with Next.js HMR.
const globalForDb = globalThis as unknown as { __dbSql?: Sql };

export const sql =
  globalForDb.__dbSql ?? postgres(connectionString, isSupabasePooler ? { prepare: false } : {});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__dbSql = sql;
}

export const db = drizzle(sql, { schema });


