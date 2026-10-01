import { Pool, PoolClient } from 'pg';
const globalDb = globalThis as unknown as { pool?: Pool };
export const pool = globalDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
globalDb.pool = pool;
export async function transaction<T>(work: (db: PoolClient) => Promise<T>): Promise<T> {
  const db = await pool.connect();
  try { await db.query('BEGIN'); const result = await work(db); await db.query('COMMIT'); return result; }
  catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
