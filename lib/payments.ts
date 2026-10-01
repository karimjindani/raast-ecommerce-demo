import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { NextRequest } from 'next/server';
import { transaction } from './db';
import { amountPaisa, applyEvent, scenarios, schedule, type Scenario } from './domain';
import { ApiError, hash } from './security';
import { normalizePayer, type Payer } from './payer';
import { lookupPayer, initiateRtp } from './mock-provider';

async function limit(db: PoolClient, owner: string, req: NextRequest, category: string) {
  // This header is overwritten by the host reverse proxy; never trust X-Forwarded-For.
  const ip = req.headers.get('x-raast-client-ip') || 'local';
  for (const subject of [`session:${owner}`, `ip:${hash(ip)}`]) {
    const r = await db.query(`INSERT INTO rate_limits VALUES($1,$2,$3,1) ON CONFLICT(subject,category,bucket) DO UPDATE SET count=rate_limits.count+1 RETURNING count`, [subject, category, Math.floor(Date.now()/60000)]);
    if (r.rows[0].count > 5) throw new ApiError(429, 'Demo limit reached. Try again in the next minute.');
  }
}
function inputs(input: Record<string, unknown>) {
  let amount: number;
  try { amount = amountPaisa(input.amountPkr); } catch(error) { throw new ApiError(400, (error as Error).message); }
  if (!scenarios.includes(input.scenario as Scenario)) throw new ApiError(400, 'Choose a valid simulation scenario.');
  return { amount, scenario: input.scenario as Scenario };
}
export async function operate(operation: 'qr'|'title-fetch'|'rtp', input: Record<string, unknown>, owner: string, key: string, req: NextRequest) {
  let payerInput: Payer | undefined;
  if (operation === 'title-fetch') {
    try { payerInput = normalizePayer(input.payerType, input.payerValue); }
    catch (error) { throw new ApiError(400, (error as Error).message); }
  }
  const normalized = operation === 'rtp' ? {contextId: input.contextId} : {...inputs(input), ...(operation === 'title-fetch' ? payerInput : {})};
  const fingerprint = hash(JSON.stringify(normalized));
  return transaction(async db => {
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [owner+operation+key]);
    const old = await db.query('SELECT * FROM idempotency WHERE owner=$1 AND operation=$2 AND key=$3', [owner,operation,key]);
    if (old.rowCount) {
      if (old.rows[0].fingerprint !== fingerprint) throw new ApiError(409, 'This request identifier was already used with different details.');
      return old.rows[0].result;
    }
    await limit(db,owner,req,operation === 'title-fetch' ? 'title-fetch' : 'initiation');
    const now = Date.now(); let result: Record<string, unknown>;
    if (operation === 'rtp') {
      if (typeof input.contextId !== 'string' || !/^[a-f0-9-]{36}$/.test(input.contextId)) throw new ApiError(400,'Invalid confirmation context.');
      const r = await db.query('SELECT * FROM payments WHERE context_id=$1 AND owner=$2 FOR UPDATE',[input.contextId,owner]);
      const p=r.rows[0]; if (!p) throw new ApiError(404,'Confirmation not found.');
      if (p.status !== 'AWAITING_CONFIRMATION' || p.context_expires_at.getTime() <= now) throw new ApiError(409,'Confirmation expired or already used. Start a new request.');
      await initiateRtp(p.simulated_rtp_id || '');
      const timing=schedule(p.scenario, now);
      await db.query(`UPDATE payments SET status='PENDING',started_at=$2,due_at=$3,outcome=$4,updated_at=$2 WHERE id=$1`,[p.id,new Date(now),timing.dueAt ? new Date(timing.dueAt):null,timing.outcome]);
      result={paymentId:p.id,status:'PENDING'};
    } else {
      const {amount,scenario}=inputs(input); const id=randomUUID();
      const payer=payerInput ? await lookupPayer(payerInput) : null;
      const context=operation==='title-fetch' ? randomUUID():null;
      const timing=schedule(scenario,now);
      await db.query(`INSERT INTO payments(id,owner,flow,amount,scenario,status,started_at,expires_at,due_at,outcome,context_id,context_expires_at,payer_id,simulated_rtp_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,[
        id,owner,operation==='qr'?'qr':'rtp',amount,scenario,context?'AWAITING_CONFIRMATION':'PENDING',context?null:new Date(now),context?null:new Date(now+120000),context||!timing.dueAt?null:new Date(timing.dueAt),timing.outcome,context,context?new Date(now+300000):null,null,payer?.rtpId||null]);
      if (payer) await db.query('UPDATE payments SET payer_type=$2,payer_reference=$3,account_title=$4 WHERE id=$1', [id,payerInput!.payerType,payer.payerReference,payer.accountTitle]);
      result=context?{paymentId:id,contextId:context,accountTitle:payer!.accountTitle,payerReference:payer!.payerReference,amountPaisa:amount,contextExpiresAt:new Date(now+300000).toISOString()}:{paymentId:id,status:'PENDING'};
    }
    await db.query('INSERT INTO idempotency(owner,operation,key,fingerprint,result) VALUES($1,$2,$3,$4,$5)',[owner,operation,key,fingerprint,JSON.stringify(result)]);
    return result;
  });
}
export async function readPayment(id: string, owner: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new ApiError(404,'Payment not found.');
  return transaction(async db=> {
    const row=await db.query('SELECT * FROM payments WHERE id=$1 AND owner=$2 FOR UPDATE',[id,owner]);
    const p=row.rows[0]; if(!p) throw new ApiError(404,'Payment not found in this browser session.');
    const now=Date.now();
    if(p.status==='PENDING' && p.due_at && p.due_at.getTime()<=now) {
      const event=await db.query(`INSERT INTO payment_events(payment_id,source,outcome) VALUES($1,'simulation',$2) ON CONFLICT DO NOTHING RETURNING payment_id`,[id,p.outcome]);
      if(event.rowCount) { p.status=applyEvent(p.status,p.outcome); await db.query('UPDATE payments SET status=$2,updated_at=now() WHERE id=$1',[id,p.status]); }
    }
    const expired=p.expires_at && p.expires_at.getTime()<=now;
    return {paymentId:p.id,flow:p.flow,amountPaisa:p.amount,currency:'PKR',status:p.status,scenario:p.scenario,mode:'mock',serverTime:new Date(now).toISOString(),startedAt:p.started_at,expiresAt:p.expires_at,windowExpired:!!expired,
      qrPayload:p.flow==='qr'&&!expired&&p.status==='PENDING'?`RAAST-DEMO-NOT-A-PAYMENT:${p.id}`:null};
  });
}
