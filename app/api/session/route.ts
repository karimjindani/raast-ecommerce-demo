import { NextRequest } from 'next/server';
import { failure, json, mockOnly, session, setSession } from '@/lib/security';
export async function GET(req: NextRequest) { try { mockOnly(); const response=json({mode:'mock'}); if(!session(req))setSession(response); return response; } catch(e){return failure(e);} }
