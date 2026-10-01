import pg from 'pg';
import { readFile } from 'node:fs/promises';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 2000 });
try {
 let db;
 for (let attempt=0; attempt<30; attempt++) {
  try { db=await pool.connect(); break; }
  catch { if(attempt===29) throw new Error('Database readiness timed out'); await new Promise(resolve=>setTimeout(resolve,2000)); }
 }
 try {
  await db.query('BEGIN');
  await db.query('SELECT pg_advisory_xact_lock(510001)');
  await db.query(await readFile(new URL('../migrations/001_initial.sql', import.meta.url), 'utf8'));
  await db.query(await readFile(new URL('../migrations/002_payer_reference.sql', import.meta.url), 'utf8'));
  await db.query('COMMIT');
 } finally { db.release(); }
 console.log('Database schema ready.');
} finally { await pool.end(); }
