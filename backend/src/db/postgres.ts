import { Pool, QueryResult, QueryResultRow } from 'pg';
import { env } from '../config/env';

export const pgPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20, // Tuned for 24GB ARM64 OCI Free Instance
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pgPool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pgPool.query<T>(text, params);
  const duration = Date.now() - start;
  if (duration > 100) {
    console.warn(`[SLOW QUERY] ${duration}ms: ${text}`);
  }
  return res;
}
