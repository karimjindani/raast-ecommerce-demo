import pg from 'pg';
import { readFile } from 'node:fs/promises';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
 const db = await pool.connect();
 try {
  await db.query('BEGIN');
  await db.query('SELECT pg_advisory_xact_lock(510001)');
  await db.query(await readFile(new URL('../migrations/001_initial.sql', import.meta.url), 'utf8'));
  await db.query('COMMIT');
 } finally { db.release(); }
 console.log('Database schema ready.');
} finally { await pool.end(); }
