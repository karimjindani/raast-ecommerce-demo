import { pool } from '@/lib/db';
import { json, mockOnly } from '@/lib/security';
export const dynamic='force-dynamic';
export async function GET(){try{mockOnly();await pool.query('SELECT 1 FROM payments LIMIT 1');return json({ok:true,mode:'mock',version:'0.1.2',commit:process.env.APP_COMMIT||'development'});}catch{return json({ok:false},503);}}
