import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export function mockOnly() {
  if (process.env.PAYMENT_MODE !== 'mock' || process.env.LIVE_PAYMENTS_ENABLED !== 'false') throw new ApiError(503, 'Live payments are disabled. This release supports simulation only.');
}
function secret() { const value = process.env.SESSION_SECRET; if (!value || value.length < 32) throw new ApiError(503, 'Session configuration unavailable.'); return value; }
export function hash(value: string) { return createHmac('sha256', secret()).update(value).digest('hex'); }
export function session(req: NextRequest): string | null {
  const value = req.cookies.get('raast_session')?.value;
  if (!value) return null;
  const [id, time, signature] = value.split('.');
  if (!id || !/^\d+$/.test(time || '') || !/^[a-f0-9]{64}$/.test(signature || '')) return null;
  const expected = hash(`${id}.${time}`);
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  if (Date.now() - Number(time) > 86400000 || Number(time) > Date.now()) return null;
  return hash(id);
}
export function setSession(response: NextResponse) {
  const payload = `${randomBytes(24).toString('hex')}.${Date.now()}`;
  response.cookies.set('raast_session', `${payload}.${hash(payload)}`, { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'lax', maxAge: 86400, path: '/' });
}
export function mutation(req: NextRequest) {
  mockOnly();
  const origin = req.headers.get('origin');
  const allowed = (process.env.APP_ORIGINS || process.env.APP_BASE_URL || '').split(',');
  if (!origin || !allowed.includes(origin)) throw new ApiError(403, 'This request must come from the demo page.');
  const owner = session(req); if (!owner) throw new ApiError(403, 'Session expired. Reload the checkout.');
  const key = req.headers.get('idempotency-key');
  if (!key || !/^[A-Za-z0-9-]{16,80}$/.test(key)) throw new ApiError(400, 'A valid request identifier is required.');
  return { owner, key };
}
export async function body(req: NextRequest) {
  if (!req.headers.get('content-type')?.startsWith('application/json')) throw new ApiError(400, 'JSON is required.');
  const text = await req.text(); if (Buffer.byteLength(text) > 16384) throw new ApiError(413, 'Request too large.');
  try { const data = JSON.parse(text); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); return data; }
  catch { throw new ApiError(400, 'Invalid JSON.'); }
}
export function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } }); }
export function failure(error: unknown) {
  return json({ error: error instanceof ApiError ? error.message : 'The demo is temporarily unavailable. Please retry.' }, error instanceof ApiError ? error.status : 503);
}
