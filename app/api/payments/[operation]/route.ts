import { NextRequest } from 'next/server';
import { operate, readPayment } from '@/lib/payments';
import { ApiError, body, failure, json, mockOnly, mutation, session } from '@/lib/security';
export const runtime='nodejs';
export async function POST(req:NextRequest,context:{params:Promise<{operation:string}>}) {
 try { const {operation}=await context.params; if(!['qr','title-fetch','rtp'].includes(operation))throw new ApiError(404,'Route not found.');
 const {owner,key}=mutation(req);return json(await operate(operation as 'qr'|'title-fetch'|'rtp',await body(req),owner,key,req),201);
 }catch(e){return failure(e);}
}
export async function GET(req:NextRequest,context:{params:Promise<{operation:string}>}) {
 try {mockOnly();const owner=session(req);if(!owner)throw new ApiError(404,'Payment not found in this browser session.');return json(await readPayment((await context.params).operation,owner));}catch(e){return failure(e);}
}
