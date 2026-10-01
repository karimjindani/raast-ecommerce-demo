import { json } from '@/lib/security';
export async function POST(){return json({error:'Live callbacks are disabled in the simulation release.'},503);}
